using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text;


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

        public IActionResult OnPost()
        {
            if (Request.Form.ContainsKey("ExportCsv"))
            {
                var calculated = VlsmCalculator.Calculate(BaseNetwork, HostsPerSubnet, SubnetLabels);

                var csv = new StringBuilder();
                csv.AppendLine("Label,Network Address,CIDR,Subnet Mask,First Host,Last Host,Broadcast,Usable Hosts");

                foreach (var subnet in calculated)
                {
                    csv.AppendLine($"{subnet.Label},{subnet.NetworkAddress},{subnet.CidrNotation},{subnet.SubnetMask},{subnet.FirstHost},{subnet.LastHost},{subnet.BroadcastAddress},{subnet.HostCount}");
                }

                var bytes = Encoding.UTF8.GetBytes(csv.ToString());
                return File(bytes, "text/csv", "subnet-results.csv");
            }

            if (Request.Form.ContainsKey("AddSubnet"))
            {
                HostsPerSubnet.Add(0);
                SubnetLabels.Add("");
                return Page();
            }

            if (string.IsNullOrWhiteSpace(BaseNetwork))
            {
                ModelState.AddModelError("", "Base network is required.");
                return Page();
            }

            if (HostsPerSubnet.Count == 0 || HostsPerSubnet.Any(h => h < 1))
            {
                ModelState.AddModelError("", "Each subnet must have a valid host count.");
                return Page();
            }

            try
            {
                Results = VlsmCalculator.Calculate(BaseNetwork, HostsPerSubnet, SubnetLabels);
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error: {ex.Message}");
            }

            return Page();
        }

    }
}
