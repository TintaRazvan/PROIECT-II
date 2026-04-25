using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpenseController : ControllerBase
    {
        private static List<Expense> expenses = new List<Expense>();

        [HttpGet]
        public ActionResult<IEnumerable<Expense>> GetExpenses()
        {
            return Ok(expenses);
        }

        [HttpPost]
        public ActionResult<Expense> AddExpense(Expense newExpense)
        {
            if (newExpense.Amount <= 0)
            {
                return BadRequest("Suma cheltuielii trebuie să fie pozitivă.");
            }

            expenses.Add(newExpense);
            return Ok(newExpense);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteExpense(int id)
        {
            var expense = expenses.FirstOrDefault(e => e.Id == id);
            if (expense == null) {
                return NotFound(new { message = $"Datoria cu ID-ul {id} nu a fost gasita." });
            }

            expenses.Remove(expense);
            return Ok(new { message = "Datoria a fost stearsa cu succes." });
        }
    }
}
