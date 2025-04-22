using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;

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
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Error: {ex.Message}");
            }
        }
    }

}
