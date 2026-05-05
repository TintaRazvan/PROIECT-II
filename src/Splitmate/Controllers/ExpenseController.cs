using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitmateAPI.Data;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpenseController : ControllerBase
    {
        private readonly SplitmateDbContext _context;

        public ExpenseController(SplitmateDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
        {
            return Ok(await _context.Expenses.OrderByDescending(e => e.Date).ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<Expense>> AddExpense(Expense newExpense)
        {
            if (newExpense.Amount <= 0)
            {
                return BadRequest("Suma cheltuielii trebuie să fie pozitivă.");
            }

            if (newExpense.PayerId <= 0)
            {
                return BadRequest("PayerId este obligatoriu.");
            }

            var payerExists = await _context.Users.AnyAsync(u => u.Id == newExpense.PayerId);
            if (!payerExists)
            {
                return BadRequest("Plătitorul nu există.");
            }

            if (newExpense.GroupId > 0)
            {
                var groupExists = await _context.Groups.AnyAsync(g => g.Id == newExpense.GroupId);
                if (!groupExists)
                {
                    return BadRequest("Grupul nu există.");
                }

                var payerIsMember = await _context.GroupMembers.AnyAsync(gm =>
                    gm.GroupId == newExpense.GroupId && gm.UserId == newExpense.PayerId);
                if (!payerIsMember)
                {
                    return BadRequest("Plătitorul trebuie să fie membru în grup.");
                }
            }

            _context.Expenses.Add(newExpense);
            await _context.SaveChangesAsync();

            // Auto-split: if expense belongs to a group, create debts for each member
            if (newExpense.GroupId > 0 && newExpense.PayerId > 0)
            {
                var members = await _context.GroupMembers
                    .Where(gm => gm.GroupId == newExpense.GroupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                if (!members.Contains(newExpense.PayerId))
                {
                    return BadRequest("Plătitorul trebuie să fie membru în grup.");
                }

                var allMembers = members.Distinct().ToList();
                var otherMembers = allMembers.Where(id => id != newExpense.PayerId).ToList();

                if (otherMembers.Count > 0)
                {
                    // Split equally and preserve exact total by distributing remainder in cents.
                    int totalPeople = allMembers.Count;
                    var totalCents = (int)Math.Round(newExpense.Amount * 100m, MidpointRounding.AwayFromZero);
                    var baseShareCents = totalCents / totalPeople;
                    var remainder = totalCents % totalPeople;

                    var sharesByMember = allMembers
                        .OrderBy(id => id)
                        .Select((memberId, index) => new
                        {
                            MemberId = memberId,
                            ShareCents = baseShareCents + (index < remainder ? 1 : 0)
                        })
                        .ToDictionary(x => x.MemberId, x => x.ShareCents);

                    foreach (var memberId in otherMembers)
                    {
                        var memberShareCents = sharesByMember[memberId];
                        var memberShare = memberShareCents / 100m;

                        var debt = new Debt
                        {
                            Amount = memberShare,
                            FromUserId = memberId,    // membrul datorează
                            ToUserId = newExpense.PayerId,  // celui care a plătit
                            ExpenseId = newExpense.Id
                        };
                        _context.Debts.Add(debt);
                    }
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(newExpense);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense == null) {
                return NotFound(new { message = $"Cheltuiala cu ID-ul {id} nu a fost găsită." });
            }

            // Also delete related debts
            var relatedDebts = await _context.Debts
                .Where(d => d.ExpenseId == id)
                .ToListAsync();
            _context.Debts.RemoveRange(relatedDebts);

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cheltuiala a fost ștearsă cu succes.", deletedDebts = relatedDebts.Count });
        }
    }
}
