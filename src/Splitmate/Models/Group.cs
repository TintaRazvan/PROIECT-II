namespace SplitmateAPI.Models
{
    public class Group
    {
        public int Id { get; set; }
        public string GroupName { get; set; } = string.Empty;

        public List<User> Members { get; set; } = new List<User>();
        public List<Expense> Expenses { get; set; } = new List<Expense>();
    }
}