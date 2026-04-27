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
            return Ok(await _context.Expenses.ToListAsync());
        }

        [HttpPost]
        public async Task<ActionResult<Expense>> AddExpense(Expense newExpense)
        {
            if (newExpense.Amount <= 0)
            {
                return BadRequest("Suma cheltuielii trebuie să fie pozitivă.");
            }

            _context.Expenses.Add(newExpense);
            await _context.SaveChangesAsync();
            return Ok(newExpense);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense == null) {
                return NotFound(new { message = $"Datoria cu ID-ul {id} nu a fost gasita." });
            }

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Datoria a fost stearsa cu succes." });
        }
    }
}
