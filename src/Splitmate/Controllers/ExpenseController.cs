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

            if (string.IsNullOrWhiteSpace(newExpense.Description))
            {
                return BadRequest("Descrierea cheltuielii este obligatorie.");
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

            newExpense.Date = newExpense.Date == default ? DateTime.UtcNow : newExpense.Date;

            var strategy = _context.Database.CreateExecutionStrategy();
            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    _context.Expenses.Add(newExpense);
                    await _context.SaveChangesAsync();
                    await RebuildExpenseDebts(newExpense);
                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }

            return Ok(newExpense);
        }

        [HttpPost("itemized-receipt")]
        public async Task<ActionResult> AddItemizedReceipt([FromBody] ItemizedReceiptRequest request)
        {
            if (request.PayerId <= 0)
            {
                return BadRequest("PayerId este obligatoriu.");
            }

            if (request.GroupId <= 0)
            {
                return BadRequest("Alege un grup pentru bonul itemizat.");
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest("Adauga cel putin un produs din bon.");
            }

            var payerExists = await _context.Users.AnyAsync(u => u.Id == request.PayerId);
            if (!payerExists)
            {
                return BadRequest("Platitorul nu exista.");
            }

            var groupExists = await _context.Groups.AnyAsync(g => g.Id == request.GroupId);
            if (!groupExists)
            {
                return BadRequest("Grupul nu exista.");
            }

            var groupMemberIds = await _context.GroupMembers
                .Where(gm => gm.GroupId == request.GroupId)
                .Select(gm => gm.UserId)
                .Distinct()
                .ToListAsync();

            if (!groupMemberIds.Contains(request.PayerId))
            {
                return BadRequest("Platitorul trebuie sa fie membru in grup.");
            }

            var normalizedItems = new List<ItemizedReceiptItemRequest>();
            foreach (var item in request.Items)
            {
                var description = item.Description.Trim();
                var consumers = (item.ConsumerUserIds ?? new List<int>()).Distinct().OrderBy(id => id).ToList();

                if (string.IsNullOrWhiteSpace(description))
                {
                    return BadRequest("Fiecare produs trebuie sa aiba o descriere.");
                }

                if (item.Amount <= 0)
                {
                    return BadRequest($"Produsul '{description}' trebuie sa aiba suma pozitiva.");
                }

                if (consumers.Count == 0)
                {
                    return BadRequest($"Selecteaza cel putin un consumator pentru '{description}'.");
                }

                if (consumers.Any(userId => !groupMemberIds.Contains(userId)))
                {
                    return BadRequest($"Toti consumatorii pentru '{description}' trebuie sa fie membri in grup.");
                }

                normalizedItems.Add(new ItemizedReceiptItemRequest
                {
                    Description = description,
                    Amount = Math.Round(item.Amount, 2, MidpointRounding.AwayFromZero),
                    ConsumerUserIds = consumers
                });
            }

            var createdExpenses = new List<Expense>();
            var createdDebts = new List<Debt>();
            var expenseDate = request.Date == default ? DateTime.UtcNow : request.Date;
            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                createdExpenses.Clear();
                createdDebts.Clear();
                await using var tx = await _context.Database.BeginTransactionAsync();

                foreach (var item in normalizedItems)
                {
                    var expense = new Expense
                    {
                        Amount = item.Amount,
                        Date = expenseDate,
                        Description = item.Description,
                        PayerId = request.PayerId,
                        GroupId = request.GroupId
                    };

                    _context.Expenses.Add(expense);
                    await _context.SaveChangesAsync();
                    createdExpenses.Add(expense);

                    var itemDebts = BuildDebtsForItem(expense.Id, request.PayerId, item.Amount, item.ConsumerUserIds);
                    _context.Debts.AddRange(itemDebts);
                    createdDebts.AddRange(itemDebts);
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
            });

            return Ok(new
            {
                message = "Bonul itemizat a fost salvat.",
                expenses = createdExpenses,
                debts = createdDebts,
                totalAmount = normalizedItems.Sum(item => item.Amount)
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Expense>> UpdateExpense(int id, [FromBody] UpdateExpenseRequest request)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense == null)
            {
                return NotFound(new { message = $"Cheltuiala cu ID-ul {id} nu a fost găsită." });
            }

            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                expense.Description = request.Description.Trim();
            }

            if (request.Amount.HasValue)
            {
                if (request.Amount.Value <= 0)
                {
                    return BadRequest("Suma cheltuielii trebuie să fie pozitivă.");
                }
                expense.Amount = request.Amount.Value;
            }

            try
            {
                await RebuildExpenseDebts(expense);
                await _context.SaveChangesAsync();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            return Ok(expense);
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

        public class UpdateExpenseRequest
        {
            public string? Description { get; set; }
            public decimal? Amount { get; set; }
        }

        public class ItemizedReceiptRequest
        {
            public int PayerId { get; set; }
            public int GroupId { get; set; }
            public DateTime Date { get; set; }
            public List<ItemizedReceiptItemRequest> Items { get; set; } = new();
        }

        public class ItemizedReceiptItemRequest
        {
            public string Description { get; set; } = string.Empty;
            public decimal Amount { get; set; }
            public List<int> ConsumerUserIds { get; set; } = new();
        }

        private async Task RebuildExpenseDebts(Expense expense)
        {
            var currentDebts = await _context.Debts
                .Where(d => d.ExpenseId == expense.Id)
                .ToListAsync();
            if (currentDebts.Count > 0)
            {
                _context.Debts.RemoveRange(currentDebts);
            }

            if (expense.GroupId <= 0 || expense.PayerId <= 0)
            {
                return;
            }

            var members = await _context.GroupMembers
                .Where(gm => gm.GroupId == expense.GroupId)
                .Select(gm => gm.UserId)
                .Distinct()
                .ToListAsync();

            if (!members.Contains(expense.PayerId))
            {
                throw new InvalidOperationException("Plătitorul trebuie să fie membru în grup.");
            }

            var otherMembers = members.Where(id => id != expense.PayerId).ToList();
            if (otherMembers.Count == 0)
            {
                return;
            }

            var totalPeople = members.Count;
            var totalCents = (int)Math.Round(expense.Amount * 100m, MidpointRounding.AwayFromZero);
            var baseShareCents = totalCents / totalPeople;
            var remainder = totalCents % totalPeople;

            var sharesByMember = members
                .OrderBy(id => id)
                .Select((memberId, index) => new
                {
                    MemberId = memberId,
                    ShareCents = baseShareCents + (index < remainder ? 1 : 0)
                })
                .ToDictionary(x => x.MemberId, x => x.ShareCents);

            foreach (var memberId in otherMembers)
            {
                _context.Debts.Add(new Debt
                {
                    Amount = sharesByMember[memberId] / 100m,
                    FromUserId = memberId,
                    ToUserId = expense.PayerId,
                    ExpenseId = expense.Id
                });
            }
        }

        private static List<Debt> BuildDebtsForItem(int expenseId, int payerId, decimal amount, List<int> consumerUserIds)
        {
            var consumers = consumerUserIds.Distinct().OrderBy(id => id).ToList();
            var totalCents = (int)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
            var baseShareCents = totalCents / consumers.Count;
            var remainder = totalCents % consumers.Count;

            return consumers
                .Select((userId, index) => new
                {
                    UserId = userId,
                    ShareCents = baseShareCents + (index < remainder ? 1 : 0)
                })
                .Where(share => share.UserId != payerId && share.ShareCents > 0)
                .Select(share => new Debt
                {
                    Amount = share.ShareCents / 100m,
                    FromUserId = share.UserId,
                    ToUserId = payerId,
                    ExpenseId = expenseId
                })
                .ToList();
        }
    }
}
