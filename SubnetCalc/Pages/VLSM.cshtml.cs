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
        public string BaseCidr { get; set; }

        [BindProperty]
        public string InputMode { get; set; } = "hosts";

        [BindProperty]
        public int SubnetCount { get; set; }

        [BindProperty]
        public List<int?> HostsPerSubnet { get; set; } = new();

        [BindProperty]
        public List<string> SubnetLabels { get; set; } = new();

        public List<SubnetResult> Results { get; set; }

        public IActionResult OnPost()
        {
            if (Request.Form.ContainsKey("RemoveSubnet"))
            {
                int indexToRemove = int.Parse(Request.Form["RemoveSubnet"]);
                if (indexToRemove >= 0 && indexToRemove < HostsPerSubnet.Count)
                {
                    HostsPerSubnet.RemoveAt(indexToRemove);
                    SubnetLabels.RemoveAt(indexToRemove);
                }
                return Page();
            }


            if (Request.Form.ContainsKey("ExportCsv"))
            {
                if (string.IsNullOrWhiteSpace(BaseNetwork) || string.IsNullOrWhiteSpace(BaseCidr))
                {
                    ModelState.AddModelError("", "Base network and CIDR/subnet mask must be specified before exporting.");
                    return Page();
                }

                var calculated = VlsmCalculator.Calculate(BaseNetwork, BaseCidr, HostsPerSubnet.Select(h => h ?? 0).ToList(), SubnetLabels);

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
                Results = VlsmCalculator.Calculate(BaseNetwork, BaseCidr, HostsPerSubnet.Select(h => h ?? 0).ToList(), SubnetLabels);
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error: {ex.Message}");
            }

            return Page();
        }

    }
}
