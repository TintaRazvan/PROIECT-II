using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Models;

namespace SplitmateAPI.Data
{
    public class SplitmateDbContext : DbContext
    {
        public SplitmateDbContext(DbContextOptions<SplitmateDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<Debt> Debts { get; set; }
        public DbSet<Friends> Friends { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Friends are composite key (userId, friendId)
            modelBuilder.Entity<Friends>()
                .HasKey(f => new { f.UserId, f.FriendId });

            // Ignore navigation properties that don't exist in DB
            modelBuilder.Entity<User>()
                .Ignore(u => u.Groups);

            modelBuilder.Entity<Group>()
                .Ignore(g => g.Members)
                .Ignore(g => g.Expenses);

            modelBuilder.Entity<Group>()
                .Property(g => g.GroupName)
                .HasColumnName("groupName");

            modelBuilder.Entity<Debt>()
                .Ignore(d => d.FromUser)
                .Ignore(d => d.ToUser);

            modelBuilder.Entity<Expense>()
                .Ignore(e => e.PayerId)
                .Ignore(e => e.Payer)
                .Ignore(e => e.Group);
        }
    }
}
