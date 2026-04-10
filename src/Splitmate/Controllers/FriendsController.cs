using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FriendsController : ControllerBase
    {
        private static List<Friends> friendsList = new List<Friends>();

        [HttpGet]
        public ActionResult<IEnumerable<Friends>> GetFriends()
        {
            return Ok(friendsList);
        }

        [HttpPost]
        public ActionResult<Friends> AddFriend(Friends newFriend)
        {
            friendsList.Add(newFriend);
            return Ok(newFriend);
        }
    }
}
