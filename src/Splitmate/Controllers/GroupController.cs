using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Data;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GroupController : ControllerBase
    {
        private readonly SplitmateDbContext _context;

        public GroupController(SplitmateDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Group>>> GetGroups()
        {
            return Ok(await _context.Groups.ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<Group>> CreateGroup([FromBody] CreateGroupRequest request)
        {
            var groupName = (request.GroupName ?? request.Username ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(groupName))
            {
                return BadRequest("Numele grupului este obligatoriu.");
            }

            var newGroup = new Group
            {
                GroupName = groupName
            };

            _context.Groups.Add(newGroup);
            await _context.SaveChangesAsync();

            if (request.OwnerUserId.HasValue && request.OwnerUserId.Value > 0)
            {
                var ownerExists = await _context.Users.AnyAsync(u => u.Id == request.OwnerUserId.Value);
                if (!ownerExists)
                {
                    return BadRequest("Utilizatorul owner nu există.");
                }

                var ownerAlreadyInGroup = await _context.GroupMembers.AnyAsync(gm =>
                    gm.GroupId == newGroup.Id && gm.UserId == request.OwnerUserId.Value);

                if (!ownerAlreadyInGroup)
                {
                    _context.GroupMembers.Add(new GroupMember
                    {
                        GroupId = newGroup.Id,
                        UserId = request.OwnerUserId.Value
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(newGroup);
        }

        // GET api/Group/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<IEnumerable<object>>> GetGroupMembers(int id)
        {
            var group = await _context.Groups.FindAsync(id);
            if (group == null) return NotFound("Grupul nu există.");

            var memberLinks = await _context.GroupMembers
                .Where(gm => gm.GroupId == id)
                .ToListAsync();

            var userIds = memberLinks.Select(gm => gm.UserId).ToList();
            var users = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Username, u.Email })
                .ToListAsync();

            return Ok(users);
        }

        // POST api/Group/{id}/members
        [HttpPost("{id}/members")]
        public async Task<ActionResult> AddGroupMember(int id, [FromBody] AddMemberRequest request)
        {
            var group = await _context.Groups.FindAsync(id);
            if (group == null) return NotFound("Grupul nu există.");

            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null) return BadRequest("Utilizatorul nu există.");

            var exists = await _context.GroupMembers
                .AnyAsync(gm => gm.GroupId == id && gm.UserId == request.UserId);
            if (exists) return BadRequest("Utilizatorul este deja în grup.");

            _context.GroupMembers.Add(new GroupMember { GroupId = id, UserId = request.UserId });
            await _context.SaveChangesAsync();
            return Ok(new { message = "Membru adăugat cu succes." });
        }

        // DELETE api/Group/{id}/members/{userId}
        [HttpDelete("{id}/members/{userId}")]
        public async Task<ActionResult> RemoveGroupMember(int id, int userId)
        {
            var link = await _context.GroupMembers
                .FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == userId);
            if (link == null) return NotFound("Membrul nu a fost găsit în grup.");

            _context.GroupMembers.Remove(link);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Membru eliminat." });
        }

        public class AddMemberRequest
        {
            public int UserId { get; set; }
        }

        public class CreateGroupRequest
        {
            public string? GroupName { get; set; }
            public string? Username { get; set; }
            public int? OwnerUserId { get; set; }
        }
    }
}
