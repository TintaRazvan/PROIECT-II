using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitmateAPI.Models;

namespace SplitmateAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DebtController : ControllerBase
    {
        private static List<Debt> debts = new List<Debt>();

        [HttpGet]
        public ActionResult<IEnumerable<Debt>> GetDebts()
        {
            return Ok(debts);
        }

        [HttpPost]
        public ActionResult<Debt> CreateDebt(Debt newDebt)
        {
            if (newDebt.Amount <= 0)
            {
                return BadRequest("Datoria trebuie să fie mai mare de 0.");
            }

            if (newDebt.FromUserId == newDebt.ToUserId)
            {
                return BadRequest("Un utilizator nu poate avea o datorie către el însuși.");
            }

            debts.Add(newDebt);
            return Ok(newDebt);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteDebt(int id)
        {
            var debt = debts.FirstOrDefault(d => d.Id == id);
            if (debt == null)
            {
                return NotFound(new { message = $"Datoria cu ID-ul {id} nu a fost gasita." });
            }

            debts.Remove(debt);
            return Ok(new { message = "Datoria a fost stearsa cu succes." }); // Am schimbat NoContent() cu Ok()
        }

        [HttpGet("summary/{userId}")]
        public ActionResult GetUserSummary(int userId)
        {
            // Calculam czt are de primit 
            float toReceive = debts.Where(d => d.ToUserId == userId).Sum(d => d.Amount);

            // Calculam cat are de dat
            float toPay = debts.Where(d => d.FromUserId == userId).Sum(d => d.Amount);

            // Calculam Balanta Totala
            float balance = toReceive - toPay;

            float total = toReceive + toPay;

            // Calculam procentul pentru Pie Chart
            float receivePercentage = total > 0 ? (toReceive / total) * 100 : 0;
            float payPercentage = total > 0 ? (toPay / total) * 100 : 0;

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
    }
}
