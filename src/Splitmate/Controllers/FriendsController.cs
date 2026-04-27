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
        public async Task<ActionResult<IEnumerable<Friends>>> GetFriends()
        {
            return Ok(await _context.Friends.ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<Friends>> AddFriend(Friends newFriend)
        {
            _context.Friends.Add(newFriend);
            await _context.SaveChangesAsync();
            return Ok(newFriend);
        }
    }
}
