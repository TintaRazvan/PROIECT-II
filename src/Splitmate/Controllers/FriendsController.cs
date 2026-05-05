using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Data;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FriendsController : ControllerBase
    {
        private readonly SplitmateDbContext _context;

        public FriendsController(SplitmateDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetFriends([FromQuery] int? userId)
        {
            var query = _context.Friends.AsQueryable();
            if (userId.HasValue)
            {
                query = query.Where(f => f.UserId == userId.Value);
            }

            var friends = await query
                .Select(f => new
                {
                    f.UserId,
                    f.FriendId
                })
                .ToListAsync();

            return Ok(friends);
        }

        [HttpPost]
        public async Task<ActionResult> AddFriend(Friends newFriend)
        {
            if (newFriend.UserId <= 0 || newFriend.FriendId <= 0)
            {
                return BadRequest("UserId și FriendId sunt obligatorii.");
            }

            if (newFriend.UserId == newFriend.FriendId)
            {
                return BadRequest("Nu te poți adăuga pe tine ca prieten.");
            }

            var userExists = await _context.Users.AnyAsync(u => u.Id == newFriend.UserId);
            var friendExists = await _context.Users.AnyAsync(u => u.Id == newFriend.FriendId);
            if (!userExists || !friendExists)
            {
                return BadRequest("Unul dintre utilizatori nu există.");
            }

            var alreadyFriends = await _context.Friends.AnyAsync(f =>
                (f.UserId == newFriend.UserId && f.FriendId == newFriend.FriendId) ||
                (f.UserId == newFriend.FriendId && f.FriendId == newFriend.UserId));

            if (alreadyFriends)
            {
                return BadRequest("Acești utilizatori sunt deja prieteni.");
            }

            _context.Friends.Add(new Friends { UserId = newFriend.UserId, FriendId = newFriend.FriendId });
            _context.Friends.Add(new Friends { UserId = newFriend.FriendId, FriendId = newFriend.UserId });
            await _context.SaveChangesAsync();

            return Ok(new { message = "Prieten adăugat cu succes." });
        }

        [HttpDelete]
        public async Task<ActionResult> RemoveFriend([FromQuery] int userId, [FromQuery] int friendId)
        {
            if (userId <= 0 || friendId <= 0)
            {
                return BadRequest("UserId și FriendId sunt obligatorii.");
            }

            var links = await _context.Friends
                .Where(f =>
                    (f.UserId == userId && f.FriendId == friendId) ||
                    (f.UserId == friendId && f.FriendId == userId))
                .ToListAsync();

            if (links.Count == 0)
            {
                return NotFound("Prietenia nu a fost găsită.");
            }

            _context.Friends.RemoveRange(links);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Prieten eliminat cu succes." });
        }
    }
}
