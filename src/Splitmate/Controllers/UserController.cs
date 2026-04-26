using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private static List<User> users = new List<User>();
        private static int nextId = 1;

        [HttpGet]
        public ActionResult<IEnumerable<User>> GetUsers()
        {
            return Ok(users);
        }

        [HttpPost]
        public ActionResult<User> CreateUser(User newUser)
        {
            if (string.IsNullOrWhiteSpace(newUser.Username) ||
                string.IsNullOrWhiteSpace(newUser.Email) ||
                string.IsNullOrWhiteSpace(newUser.Password))
            {
                return BadRequest("Username, email și parola sunt obligatorii.");
            }

            if (users.Any(u => u.Email.Equals(newUser.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest("Există deja un cont cu acest email.");
            }

            newUser.Id = nextId++;
            users.Add(newUser);
            return Ok(newUser);
        }

        [HttpGet("{id}")]
        public ActionResult<User> GetUserById(int id)
        {
            var user = users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            return Ok(user);
        }

        [HttpPut("{id}/profile")]
        public ActionResult<User> UpdateProfile(int id, UpdateUserProfileRequest request)
        {
            var user = users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Username și email sunt obligatorii.");
            }

            if (users.Any(u =>
                u.Id != id &&
                u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest("Email-ul este deja folosit de alt utilizator.");
            }

            user.Username = request.Username.Trim();
            user.Email = request.Email.Trim();

            return Ok(user);
        }

        [HttpPut("{id}/password")]
        public IActionResult ChangePassword(int id, ChangePasswordRequest request)
        {
            var user = users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Parola curentă și parola nouă sunt obligatorii.");
            }

            if (user.Password != request.CurrentPassword)
            {
                return BadRequest("Parola curentă este incorectă.");
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest("Parola nouă trebuie să aibă minim 6 caractere.");
            }

            user.Password = request.NewPassword;
            return Ok(new { message = "Parola a fost actualizată cu succes." });
        }

        public class UpdateUserProfileRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }
    }
}
