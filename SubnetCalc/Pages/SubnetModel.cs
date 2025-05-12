using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace SubnetCalc.Pages
{
    // PageModel for the Subnet Calculator page
    public class SubnetModel : PageModel
    {
        // The IP address input by the user (e.g. "192.168.1.0")
        [BindProperty]
        public string IpAddress { get; set; }

        // The CIDR or subnet mask input by the user (e.g. "/24" or "255.255.255.0")
        [BindProperty]
        public string Cidr { get; set; }

        // Holds the results of the subnet calculation
        public SubnetResult Results { get; set; }

        // Called when the form is submitted via POST
        public void OnPost()
        {
            try
            {
                // Only calculate if both fields have been filled out
                if (!string.IsNullOrEmpty(IpAddress) && !string.IsNullOrEmpty(Cidr))
                {
                    // Perform the core subnet calculation
                    Results = SubnetCalculator.Calculate(IpAddress, Cidr);

                    // Convert the resulting dotted-decimal mask into a binary string
                    var maskBytes = IPAddress.Parse(Results.SubnetMask).GetAddressBytes();
                    var binaryMask = string.Join("",
                        maskBytes.Select(b => Convert.ToString(b, 2).PadLeft(8, '0')));

                    // The bits that represent the network portion (same as the mask bits)
                    var networkBits = binaryMask;

                    // The bits that represent the host portion (invert the mask bits)
                    var hostBits = new string(binaryMask
                        .Select(c => c == '1' ? '0' : '1')
                        .ToArray());

                    // Helper to split a 32-bit string into four 8-bit groups with dots
                    string ToDotted(string bits) =>
                        string.Join(".", Enumerable.Range(0, 4)
                            .Select(i => bits.Substring(i * 8, 8)));

                    // Store the binary mask and the network/host portions in the result
                    Results.BinaryMask = ToDotted(binaryMask);
                    Results.NetworkPortion = ToDotted(networkBits);
                    Results.HostPortion = ToDotted(hostBits);
                }
            }
            catch (Exception ex)
            {
                // If anything goes wrong, add a model error so the UI can display it
                ModelState.AddModelError(string.Empty, $"Error: {ex.Message}");
            }
        }
    }
}
