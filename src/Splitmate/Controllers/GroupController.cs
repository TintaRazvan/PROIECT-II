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
        public async Task<ActionResult<Group>> CreateGroup(Group newGroup)
        {
            _context.Groups.Add(newGroup);
            await _context.SaveChangesAsync();
            return Ok(newGroup);
        }
    }
}
