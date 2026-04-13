namespace SplitmateAPI.Models
{
    public class Expense
    {
        public int Id { get; set; }
        public float Amount { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;

        public int PayerId { get; set; }
        public User? Payer { get; set; }

        public int GroupId { get; set; }
        public Group? Group { get; set; }
    }
}