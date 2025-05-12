using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;

namespace SubnetCalc.Pages
{

    /// PageModel for the Supernetting Calculator page.
    /// Handles user input for both single supernet calculation and CIDR aggregation.

    public class SupernettingModel : PageModel
    {

        /// The list of subnet CIDR strings entered by the user.
        /// Initialized with one empty entry to render the first input box.

        [BindProperty]
        public List<string> Subnets { get; set; } = new() { "" };

        /// Determines which calculation mode is active: "supernet" or "aggregate".
        [BindProperty]
        public string Mode { get; set; } = "supernet";

        /// Holds the result of a single supernet calculation.
        /// Populated when Mode == "supernet".
        public SupernetResult Result { get; set; }

        /// Holds the list of aggregated CIDR blocks.
        /// Populated when Mode == "aggregate".
        public List<string> AggregatedResults { get; set; } = new();

        /// Handles POST requests from the form.
        /// Adds new subnet input fields, or performs the selected calculation.
        public IActionResult OnPost()
        {
            // If the user clicked "+ Add Subnet", add another empty input and redisplay
            if (Request.Form.ContainsKey("AddSubnet"))
            {
                Subnets.Add("");
                return Page();
            }

            try
            {
                if (Mode == "supernet")
                {
                    // Compute the encompassing supernet for all provided CIDRs
                    Result = SupernetCalculator.Calculate(Subnets);
                }
                else if (Mode == "aggregate")
                {
                    // Merge and minimize the list of CIDR blocks
                    AggregatedResults = CidrAggregator.Aggregate(Subnets);
                }
            }
            catch (Exception ex)
            {
                // Capture any errors (invalid input, etc.) and display to the user
                ModelState.AddModelError(string.Empty, $"Error: {ex.Message}");
            }

            return Page();
        }
    }

    /// Represents the output of a supernet calculation.
    public class SupernetResult
    {
        /// The combined CIDR notation (e.g. "192.168.0.0/22").
        public string Cidr { get; set; }

        /// The network address portion of the supernet.
        public string Network { get; set; }

        /// The subnet mask corresponding to the supernet prefix.
        public string Mask { get; set; }

        /// The first usable IP address in the supernet.
        public string FirstHost { get; set; }

        /// The last usable IP address in the supernet.
        public string LastHost { get; set; }
    }
}
