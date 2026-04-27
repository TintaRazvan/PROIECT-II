using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Data;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly SplitmateDbContext _context;

        public UserController(SplitmateDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return Ok(await _context.Users.ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User newUser)
        {
            if (string.IsNullOrWhiteSpace(newUser.Username) ||
                string.IsNullOrWhiteSpace(newUser.Email) ||
                string.IsNullOrWhiteSpace(newUser.Password))
            {
                return BadRequest("Username, email și parola sunt obligatorii.");
            }

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == newUser.Email.ToLower()))
            {
                return BadRequest("Există deja un cont cu acest email.");
            }

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return Ok(newUser);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUserById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            return Ok(user);
        }

        [HttpPut("{id}/profile")]
        public async Task<ActionResult<User>> UpdateProfile(int id, UpdateUserProfileRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Username și email sunt obligatorii.");
            }

            if (await _context.Users.AnyAsync(u =>
                u.Id != id &&
                u.Email.ToLower() == request.Email.ToLower()))
            {
                return BadRequest("Email-ul este deja folosit de alt utilizator.");
            }

            user.Username = request.Username.Trim();
            user.Email = request.Email.Trim();

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(int id, ChangePasswordRequest request)
        {
            var user = await _context.Users.FindAsync(id);
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
            await _context.SaveChangesAsync();
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
