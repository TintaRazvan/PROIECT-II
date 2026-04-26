using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GroupController : ControllerBase
    {
        private static List<Group> groups = new List<Group>();

        [HttpGet]
        public ActionResult<IEnumerable<Group>> GetGroups()
        {
            return Ok(groups);
        }

        [HttpPost]
        public ActionResult<Group> CreateGroup(Group newGroup)
        {
            groups.Add(newGroup);
            return Ok(newGroup);
        }
    }
}
