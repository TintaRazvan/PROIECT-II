using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Data;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DebtController : ControllerBase
    {
        private readonly SplitmateDbContext _context;

        public DebtController(SplitmateDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Debt>>> GetDebts()
        {
            return Ok(await _context.Debts.ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<Debt>> CreateDebt(Debt newDebt)
        {
            if (newDebt.Amount <= 0)
            {
                return BadRequest("Datoria trebuie să fie mai mare de 0.");
            }

            if (newDebt.FromUserId == newDebt.ToUserId)
            {
                return BadRequest("Un utilizator nu poate avea o datorie către el însuși.");
            }

            var fromUserExists = await _context.Users.AnyAsync(u => u.Id == newDebt.FromUserId);
            var toUserExists = await _context.Users.AnyAsync(u => u.Id == newDebt.ToUserId);
            if (!fromUserExists || !toUserExists)
            {
                return BadRequest("Unul dintre utilizatori nu există.");
            }

            if (newDebt.ExpenseId > 0)
            {
                var expenseExists = await _context.Expenses.AnyAsync(e => e.Id == newDebt.ExpenseId);
                if (!expenseExists)
                {
                    return BadRequest("Cheltuiala asociată datoriei nu există.");
                }
            }

            _context.Debts.Add(newDebt);
            await _context.SaveChangesAsync();
            return Ok(newDebt);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDebt(int id)
        {
            var debt = await _context.Debts.FindAsync(id);
            if (debt == null)
            {
                return NotFound(new { message = $"Datoria cu ID-ul {id} nu a fost gasita." });
            }

            _context.Debts.Remove(debt);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Datoria a fost stearsa cu succes." });
        }

        [HttpGet("summary/{userId}")]
        public async Task<ActionResult> GetUserSummary(int userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return NotFound("Utilizatorul nu există.");
            }

            // Calculam cat are de primit 
            var toReceive = await _context.Debts.Where(d => d.ToUserId == userId).SumAsync(d => d.Amount);

            // Calculam cat are de dat
            var toPay = await _context.Debts.Where(d => d.FromUserId == userId).SumAsync(d => d.Amount);

            // Calculam Balanta Totala
            decimal balance = toReceive - toPay;

            decimal total = toReceive + toPay;

            // Calculam procentul pentru Pie Chart
            decimal receivePercentage = total > 0 ? (toReceive / total) * 100 : 0;
            decimal payPercentage = total > 0 ? (toPay / total) * 100 : 0;

            return Ok(new
            {
                UserId = userId,
                TotalToReceive = toReceive,
                TotalToPay = toPay,
                Balance = balance,
                ReceivePercentage = receivePercentage,
                PayPercentage = payPercentage
            });
        }

        [HttpGet("history/{userId}")]
        public async Task<ActionResult> GetUserTransactionHistory(int userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return NotFound("Utilizatorul nu există.");
            }

            var history = await (
                from debt in _context.Debts
                join fromUser in _context.Users on debt.FromUserId equals fromUser.Id
                join toUser in _context.Users on debt.ToUserId equals toUser.Id
                join expense in _context.Expenses on debt.ExpenseId equals expense.Id into expenseJoin
                from expense in expenseJoin.DefaultIfEmpty()
                where debt.FromUserId == userId || debt.ToUserId == userId
                orderby expense != null ? expense.Date : DateTime.MinValue descending, debt.Id descending
                select new
                {
                    debt.Id,
                    debt.Amount,
                    debt.FromUserId,
                    FromUsername = fromUser.Username,
                    debt.ToUserId,
                    ToUsername = toUser.Username,
                    debt.ExpenseId,
                    ExpenseDescription = expense != null ? expense.Description : "Datorie manuală",
                    TransactionDate = expense != null ? expense.Date : (DateTime?)null,
                    Direction = debt.FromUserId == userId ? "outgoing" : "incoming"
                })
                .ToListAsync();

            return Ok(history);
        }
    }
}
