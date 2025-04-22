using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SubnetCalc.Pages
{
    public class VLSMModel : PageModel
    {
        [BindProperty]
        public string BaseNetwork { get; set; }

        [BindProperty]
        public string InputMode { get; set; } = "hosts"; // "hosts" or "count"

        [BindProperty]
        public int SubnetCount { get; set; }

        [BindProperty]
        public List<int> HostsPerSubnet { get; set; } = new();

        [BindProperty]
        public List<string> SubnetLabels { get; set; } = new();

        public List<SubnetResult> Results { get; set; }

        public void OnPost()
        {
            if (Request.Form.ContainsKey("AddSubnet"))
            {
                HostsPerSubnet.Add(0);
                SubnetLabels.Add("");
                return;
            }

            if (string.IsNullOrWhiteSpace(BaseNetwork))
            {
                ModelState.AddModelError("", "Base network is required.");
                return;
            }

            if (HostsPerSubnet.Count == 0 || HostsPerSubnet.Any(h => h < 1))
            {
                ModelState.AddModelError("", "Each subnet must have a valid host count.");
                return;
            }

            try
            {
                Results = VlsmCalculator.Calculate(BaseNetwork, HostsPerSubnet, SubnetLabels);
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error: {ex.Message}");
            }
        }

    }
}
