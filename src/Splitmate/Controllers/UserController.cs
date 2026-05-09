using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
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
        private readonly PasswordHasher<User> _passwordHasher = new();

        public UserController(SplitmateDbContext context)
        {
            _context = context;
        }

        // DTO to avoid exposing passwords in API responses
        private object SafeUser(User u) => new { u.Id, u.Username, u.Email };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Username, u.Email })
                .ToListAsync();
            return Ok(users);
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateUser(User newUser)
        {
            if (string.IsNullOrWhiteSpace(newUser.Username) ||
                string.IsNullOrWhiteSpace(newUser.Email) ||
                string.IsNullOrWhiteSpace(newUser.Password))
            {
                return BadRequest("Username, email și parola sunt obligatorii.");
            }

            if (newUser.Password.Length < 6)
            {
                return BadRequest("Parola trebuie să aibă minim 6 caractere.");
            }

            newUser.Username = newUser.Username.Trim();
            newUser.Email = newUser.Email.Trim();

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == newUser.Email.ToLower()))
            {
                return BadRequest("Există deja un cont cu acest email.");
            }

            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == newUser.Username.ToLower()))
            {
                return BadRequest("Există deja un cont cu acest username.");
            }

            newUser.Password = _passwordHasher.HashPassword(newUser, newUser.Password);
            _context.Users.Add(newUser);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest("Email-ul sau username-ul este deja folosit.");
            }
            return Ok(SafeUser(newUser));
        }

        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email-ul și parola sunt obligatorii.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                return BadRequest("Nu există niciun cont cu acest email.");
            }

            var passwordVerification = _passwordHasher.VerifyHashedPassword(user, user.Password, request.Password);
            if (passwordVerification == PasswordVerificationResult.Failed)
            {
                // Backward compatibility for users created before password hashing.
                if (user.Password != request.Password)
                {
                    return BadRequest("Parola este incorectă.");
                }

                user.Password = _passwordHasher.HashPassword(user, request.Password);
                await _context.SaveChangesAsync();
            }
            else if (passwordVerification == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.Password = _passwordHasher.HashPassword(user, request.Password);
                await _context.SaveChangesAsync();
            }

            return Ok(SafeUser(user));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUserById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Utilizatorul cu ID-ul {id} nu a fost găsit." });
            }

            return Ok(SafeUser(user));
        }

        [HttpPut("{id}/profile")]
        public async Task<ActionResult<object>> UpdateProfile(int id, UpdateUserProfileRequest request)
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

            if (await _context.Users.AnyAsync(u =>
                u.Id != id &&
                u.Username.ToLower() == request.Username.Trim().ToLower()))
            {
                return BadRequest("Username-ul este deja folosit de alt utilizator.");
            }

            user.Username = request.Username.Trim();
            user.Email = request.Email.Trim();

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest("Email-ul sau username-ul este deja folosit.");
            }
            return Ok(SafeUser(user));
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

            var currentPasswordCheck = _passwordHasher.VerifyHashedPassword(user, user.Password, request.CurrentPassword);
            if (currentPasswordCheck == PasswordVerificationResult.Failed && user.Password != request.CurrentPassword)
            {
                return BadRequest("Parola curentă este incorectă.");
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest("Parola nouă trebuie să aibă minim 6 caractere.");
            }

            user.Password = _passwordHasher.HashPassword(user, request.NewPassword);
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

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }
    }
}
