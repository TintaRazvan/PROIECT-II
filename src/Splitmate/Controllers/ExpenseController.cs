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
            expenses.Add(newExpense);
            return Ok(newExpense);
        }
    }
}
