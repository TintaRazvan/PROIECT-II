namespace SplitmateAPI.Models
{ 

    public class Debt
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }

        public int FromUserId { get; set; }
        public User? FromUser { get; set; }

        public int ToUserId { get; set; }
        public User? ToUser { get; set; }

        public int ExpenseId { get; set; }
    }
}