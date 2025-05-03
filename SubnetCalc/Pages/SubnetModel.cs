using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace SubnetCalc.Pages
{
    public class SubnetModel : PageModel
    {
        [BindProperty]
        public string IpAddress { get; set; }

        [BindProperty]
        public string Cidr { get; set; }

        public SubnetResult Results { get; set; }

        public void OnPost()
        {
            try
            {
                if (!string.IsNullOrEmpty(IpAddress) && !string.IsNullOrEmpty(Cidr))
                {
                    Results = SubnetCalculator.Calculate(IpAddress, Cidr);

                    var maskBytes = IPAddress.Parse(Results.SubnetMask).GetAddressBytes();
                    var binaryMask = string.Join("", maskBytes.Select(b => Convert.ToString(b, 2).PadLeft(8, '0')));

                    // Network portion = all 1s from mask
                    var networkBits = binaryMask;

                    // Host portion = inverse (0s where mask is 1, 1s where mask is 0)
                    var hostBits = new string(binaryMask.Select(c => c == '1' ? '0' : '1').ToArray());

                    // Format into dotted binary
                    string ToDotted(string bits) =>
                        string.Join(".", Enumerable.Range(0, 4).Select(i => bits.Substring(i * 8, 8)));

                    Results.BinaryMask = ToDotted(binaryMask);
                    Results.NetworkPortion = ToDotted(networkBits);
                    Results.HostPortion = ToDotted(hostBits);
                }


            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Error: {ex.Message}");
            }
        }
    }
}
