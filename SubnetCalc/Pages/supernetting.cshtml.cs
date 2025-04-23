using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;

namespace SubnetCalc.Pages
{
    public class SupernettingModel : PageModel
    {
        [BindProperty]
        public List<string> Subnets { get; set; } = new() { "" };

        [BindProperty]
        public string Mode { get; set; } = "supernet"; // "supernet" or "aggregate"

        public SupernetResult Result { get; set; } // For single supernet CIDR

        public List<string> AggregatedResults { get; set; } = new(); // For CIDR aggregation

        public IActionResult OnPost()
        {
            if (Request.Form.ContainsKey("AddSubnet"))
            {
                Subnets.Add("");
                return Page();
            }

            try
            {
                if (Mode == "supernet")
                {
                    Result = SupernetCalculator.Calculate(Subnets);
                }
                else if (Mode == "aggregate")
                {
                    AggregatedResults = CidrAggregator.Aggregate(Subnets);
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error: {ex.Message}");
            }

            return Page();
        }
    }

    public class SupernetResult
    {
        public string Cidr { get; set; }
        public string Network { get; set; }
        public string Mask { get; set; }
        public string FirstHost { get; set; }
        public string LastHost { get; set; }
    }
}
