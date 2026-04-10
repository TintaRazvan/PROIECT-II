using System.Text.RegularExpressions;
namespace SplitmateAPI.Models
{

    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        public List<Group> Groups { get; set; } = new List<Group>();
    }
}