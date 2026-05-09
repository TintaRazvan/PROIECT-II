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
        public DbSet<GroupMember> GroupMembers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Friends are composite key (userId, friendId)
            modelBuilder.Entity<Friends>()
                .HasKey(f => new { f.UserId, f.FriendId });

            // Fix cascade delete cycle: both FKs point to Users
            modelBuilder.Entity<Friends>()
                .HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Friends>()
                .HasOne(f => f.Friend)
                .WithMany()
                .HasForeignKey(f => f.FriendId)
                .OnDelete(DeleteBehavior.Restrict);

            // GroupMembers composite key
            modelBuilder.Entity<GroupMember>()
                .HasKey(gm => new { gm.GroupId, gm.UserId });

            modelBuilder.Entity<GroupMember>()
                .HasOne(gm => gm.Group)
                .WithMany()
                .HasForeignKey(gm => gm.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GroupMember>()
                .HasOne(gm => gm.User)
                .WithMany()
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ignore navigation properties that don't exist in DB
            modelBuilder.Entity<User>()
                .Ignore(u => u.Groups);

            modelBuilder.Entity<Group>()
                .Ignore(g => g.Members)
                .Ignore(g => g.Expenses);

            modelBuilder.Entity<Group>()
                .Property(g => g.GroupName)
                .HasColumnName("groupName");

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<Debt>()
                .Ignore(d => d.FromUser)
                .Ignore(d => d.ToUser);

            // Keep navigation properties ignored (no FK relationships configured),
            // but PayerId and GroupId are scalar columns that MUST be persisted.
            modelBuilder.Entity<Expense>()
                .Ignore(e => e.Payer)
                .Ignore(e => e.Group);

            // Decimal precision for Amount columns
            modelBuilder.Entity<Debt>()
                .Property(d => d.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Expense>()
                .Property(e => e.Amount)
                .HasPrecision(18, 2);
        }
    }
}
