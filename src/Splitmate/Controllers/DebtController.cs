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
            debts.Add(newDebt);
            return Ok(newDebt);
        }
    }
}
