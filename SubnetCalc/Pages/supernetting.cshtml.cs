using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;

namespace SubnetCalc.Pages
{
    /// <summary>
    /// PageModel for the Supernetting Calculator page.
    /// Handles add/remove of input rows plus the two calculation modes.
    /// </summary>
    public class SupernettingModel : PageModel
    {
        /// <summary>
        /// The list of subnet CIDR strings entered by the user.
        /// </summary>
        [BindProperty]
        public List<string> Subnets { get; set; } = new() { "" };

        /// <summary>
        /// Which calculation mode is active: "supernet" or "aggregate".
        /// </summary>
        [BindProperty]
        public string Mode { get; set; } = "supernet";

        /// <summary>
        /// Result of the single-supernet calculation.
        /// </summary>
        public SupernetResult Result { get; set; }

        /// <summary>
        /// Resulting list of aggregated CIDR blocks.
        /// </summary>
        public List<string> AggregatedResults { get; set; } = new();

        /// <summary>
        /// Handles POST from the form: adding, removing rows, or performing the calculation.
        /// </summary>
        public IActionResult OnPost()
        {
            // 1) Add a new empty input row
            if (Request.Form.ContainsKey("AddSubnet"))
            {
                Subnets.Add("");
                return Page();
            }

            // 2) Remove the specific row
            if (Request.Form.ContainsKey("RemoveSubnet"))
            {
                // the value is the index of the row to remove
                if (int.TryParse(Request.Form["RemoveSubnet"], out var idx)
                    && idx >= 0
                    && idx < Subnets.Count)
                {
                    Subnets.RemoveAt(idx);
                }
                return Page();
            }

            // 3) Otherwise perform the selected calculation
            try
            {
                if (Mode == "supernet")
                {
                    Result = SupernetCalculator.Calculate(Subnets);
                }
                else // "aggregate"
                {
                    AggregatedResults = CidrAggregator.Aggregate(Subnets);
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Error: {ex.Message}");
            }

            return Page();
        }
    }

    /// <summary>
    /// Represents the output of a single supernet calculation.
    /// </summary>
    public class SupernetResult
    {
        public string Cidr { get; set; }
        public string Network { get; set; }
        public string Mask { get; set; }
        public string FirstHost { get; set; }
        public string LastHost { get; set; }
    }
}
