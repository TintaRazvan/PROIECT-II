using Microsoft.AspNetCore.Mvc;
using Tesseract;
using System.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace SplitmateAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OcrController : ControllerBase
    {
        private const long MaxReceiptBytes = 10 * 1024 * 1024;
        private static readonly string[] SupportedExtensions = { ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff" };

        private readonly string _tessdataPath;

        public OcrController(IWebHostEnvironment env)
        {
            _tessdataPath = Path.Combine(env.ContentRootPath, "tessdata");
        }

        // Această linie rezolvă eroarea de pornire a Swagger-ului
        [ApiExplorerSettings(IgnoreApi = true)]
        [HttpPost("scan")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(MaxReceiptBytes)]
        public async Task<IActionResult> ScanReceipt([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Nu a fost selectata nicio imagine." });

            if (file.Length > MaxReceiptBytes)
                return BadRequest(new { message = "Imaginea este prea mare. Limita este 10 MB." });

            if (!IsSupportedImage(file))
                return BadRequest(new { message = "Format neacceptat. Incarca o imagine JPG, PNG, BMP sau TIFF." });

            if (!Directory.Exists(_tessdataPath))
            {
                return StatusCode(500, new { message = $"Folderul tessdata nu a fost gasit la: {_tessdataPath}" });
            }

            var tempFileName = $"{Guid.NewGuid():N}{GetSafeExtension(file)}";
            var tempFilePath = Path.Combine(Path.GetTempPath(), tempFileName);

            try
            {
                await using (var stream = new FileStream(tempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    await file.CopyToAsync(stream);
                }

                using (var engine = new TesseractEngine(_tessdataPath, "eng", EngineMode.LstmOnly))
                {
                    using (var img = Pix.LoadFromFile(tempFilePath))
                    {
                        using (var page = engine.Process(img))
                        {
                            string extractedText = page.GetText();

                            var amount = ExtractReceiptAmountValue(extractedText);
                            var items = ExtractReceiptItems(extractedText);

                            return Ok(new
                            {
                                success = true,
                                amount = FormatMoney(amount),
                                totalAmount = FormatMoney(amount),
                                items,
                                rawText = extractedText
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Eroare Tesseract: {ex.Message}" });
            }
            finally
            {
                if (System.IO.File.Exists(tempFilePath))
                {
                    try { System.IO.File.Delete(tempFilePath); } catch { }
                }
            }
        }

        [HttpGet("check-status")]
        public IActionResult CheckStatus()
        {
            try
            {
                if (!Directory.Exists(_tessdataPath))
                {
                    return StatusCode(500, new { message = $"Folderul tessdata nu a fost gasit la: {_tessdataPath}" });
                }

                using (var engine = new TesseractEngine(_tessdataPath, "eng", EngineMode.LstmOnly))
                {
                    return Ok(new { success = true, message = "Backend-ul poate initializa Tesseract corect." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Tesseract nu poate porni deloc: {ex.Message}" });
            }
        }

        private static decimal ExtractReceiptAmountValue(string extractedText)
        {
            var lines = GetReceiptLines(extractedText);
            var preferredLabels = new[] { "TOTAL DE PLATA", "TOTAL PLATA", "TOTAL LEI", "TOTAL GENERAL", "TOTAL" };

            foreach (var label in preferredLabels)
            {
                var totalLine = lines.FirstOrDefault(line =>
                {
                    var upper = line.ToUpperInvariant();
                    return upper.Contains(label) && !upper.Contains("REDUCERE") && !upper.Contains("TVA");
                });

                if (totalLine != null && TryGetLastPositiveAmount(totalLine, out var amount)) return amount;
            }

            return lines
                .Where(line => !line.ToUpperInvariant().Contains("REDUCERE"))
                .SelectMany(line => Regex.Matches(line, @"-?\d+(?:[\.,]\d{2})").Cast<Match>())
                .Select(match => ParseMoney(match.Value))
                .Where(a => a > 0)
                .LastOrDefault();
        }

        private static List<ReceiptItemDto> ExtractReceiptItems(string extractedText)
        {
            var items = new List<ReceiptItemDto>();
            var descriptionBuffer = new List<string>();
            var lines = GetReceiptLines(extractedText);

            for (var index = 0; index < lines.Count; index++)
            {
                var line = lines[index];
                var upper = line.ToUpperInvariant();
                if (IsReceiptTotalsLine(upper)) break;
                if (IsItemNoiseLine(upper)) { descriptionBuffer.Clear(); continue; }

                if (TryParseItemLine(line, out var itemLine))
                {
                    if (HasImmediateFullDiscount(lines, index, itemLine.Amount)) { descriptionBuffer.Clear(); continue; }

                    var descriptionParts = descriptionBuffer.Concat(string.IsNullOrWhiteSpace(itemLine.DescriptionPrefix) ? Array.Empty<string>() : new[] { itemLine.DescriptionPrefix }).ToList();
                    var description = CleanItemDescription(string.Join(" ", descriptionParts));

                    if (IsValidItemDescription(description) && itemLine.Amount > 0)
                    {
                        items.Add(new ReceiptItemDto { Description = description, Amount = FormatMoney(itemLine.Amount) });
                    }
                    descriptionBuffer.Clear();
                }
                else if (IsLikelyItemDescription(line))
                {
                    descriptionBuffer.Add(line);
                    if (descriptionBuffer.Count > 2) descriptionBuffer.RemoveAt(0);
                }
            }
            return MergeDuplicateItems(items);
        }

        private static List<string> GetReceiptLines(string text)
        {
            return text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                       .Select(line => Regex.Replace(line, @"\s+", " ").Trim())
                       .Where(line => line.Length > 0).ToList();
        }

        private static bool TryParseItemLine(string line, out ParsedItemLine item)
        {
            var equalsMatch = Regex.Match(line, @"^(?<prefix>.*?)(?:\d+(?:[\.,]\d+)?\s*)?(?:BUC|BC|PCS|KG|G|L|ML)\s*X\s*\d+(?:[\.,]\d{2})\s*=\s*(?<amount>\d+(?:[\.,]\d{2}))", RegexOptions.IgnoreCase);
            if (equalsMatch.Success)
            {
                item = new ParsedItemLine(CleanItemDescription(equalsMatch.Groups["prefix"].Value), ParseMoney(equalsMatch.Groups["amount"].Value));
                return true;
            }
            item = new ParsedItemLine(string.Empty, 0);
            return false;
        }

        private static bool TryGetLastPositiveAmount(string line, out decimal amount)
        {
            var values = Regex.Matches(line, @"-?\d+(?:[\.,]\d{2})").Cast<Match>().Select(m => ParseMoney(m.Value)).Where(v => v > 0).ToList();
            amount = values.LastOrDefault();
            return amount > 0;
        }

        private static decimal ParseMoney(string value)
        {
            return decimal.TryParse(value.Replace(',', '.'), NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var result) ? Math.Round(result, 2) : 0;
        }

        private static string FormatMoney(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

        private static bool IsReceiptTotalsLine(string upperLine) => upperLine.Contains("TOTAL PRET") || upperLine.Contains("TOTAL PLATA");

        private static bool IsItemNoiseLine(string upperLine) => upperLine.Contains("REDUCERE") || upperLine.Contains("TVA") || upperLine.Contains("CARD") || upperLine.Contains("CIF");

        private static bool HasImmediateFullDiscount(List<string> lines, int itemLineIndex, decimal amount)
        {
            var maxIndex = Math.Min(lines.Count - 1, itemLineIndex + 3);
            for (var i = itemLineIndex + 1; i <= maxIndex; i++)
            {
                if (lines[i].ToUpperInvariant().Contains("REDUCERE") && ParseMoney(Regex.Match(lines[i], @"-\d+(?:[\.,]\d{2})").Value) == -amount) return true;
            }
            return false;
        }

        private static bool IsLikelyItemDescription(string line) => Regex.Matches(line, @"\p{L}").Count >= 3;

        private static string CleanItemDescription(string description) => Regex.Replace(description, @"^\s*[\d\s/.,:-]+", "").Trim();

        private static bool IsValidItemDescription(string description) => description.Length >= 3;

        private static List<ReceiptItemDto> MergeDuplicateItems(List<ReceiptItemDto> items) => items.GroupBy(i => new { K = i.Description.ToUpperInvariant(), i.Amount }).Select(g => g.First()).ToList();

        private static bool IsSupportedImage(IFormFile file) => SupportedExtensions.Contains(Path.GetExtension(file.FileName).ToLowerInvariant());

        private static string GetSafeExtension(IFormFile file) => Path.GetExtension(file.FileName).ToLowerInvariant();

        private sealed class ReceiptItemDto { public string Description { get; set; } = string.Empty; public string Amount { get; set; } = "0.00"; }
        private sealed record ParsedItemLine(string DescriptionPrefix, decimal Amount);
    }
}