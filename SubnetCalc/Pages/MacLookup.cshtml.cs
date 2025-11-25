using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SubnetCalc.Pages
{
    public class MacLookupModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public MacLookupModel(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty]
        public string MacAddress { get; set; }

        public string ErrorMessage { get; set; }
        public bool SearchPerformed { get; set; }
        
        public MacLookupResponse LookupResult { get; set; }

        public void OnGet()
        {
        }

        public async Task<IActionResult> OnPostAsync()
        {
            SearchPerformed = true;
            ErrorMessage = string.Empty;
            LookupResult = null;

            if (string.IsNullOrWhiteSpace(MacAddress))
            {
                ErrorMessage = "Please enter a MAC address.";
                return Page();
            }

            // Basic cleanup: remove delimiters to check length/validity if needed, 
            // but the API handles most formats. Let's just pass it through or do minimal validation.
            // A simple regex check for common formats might be good UX.
            // Common formats: 00:00:00:00:00:00, 00-00-00-00-00-00, 0000.0000.0000
            
            // Let's strip non-hex characters to check length.
            var cleanMac = Regex.Replace(MacAddress, "[^0-9a-fA-F]", "");
            if (cleanMac.Length < 6) // OUI is 6 chars, full MAC is 12. API might take partials? API docs say "MAC address string".
            {
                 ErrorMessage = "Invalid MAC address format.";
                 return Page();
            }

            var client = _httpClientFactory.CreateClient();
            try
            {
                // api.maclookup.app/v2 expects the MAC in the URL
                var response = await client.GetAsync($"https://api.maclookup.app/v2/macs/{MacAddress}");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<MacLookupResponse>(json);

                    if (result != null && result.Found)
                    {
                        LookupResult = result;
                    }
                    else
                    {
                        ErrorMessage = "Vendor not found.";
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    ErrorMessage = "Vendor not found.";
                }
                else
                {
                    ErrorMessage = $"Error retrieving vendor. Status: {response.StatusCode}";
                }
            }
            catch (System.Exception ex)
            {
                ErrorMessage = $"An error occurred: {ex.Message}";
            }

            return Page();
        }

        public class MacLookupResponse
        {
            [JsonPropertyName("success")]
            public bool Success { get; set; }

            [JsonPropertyName("found")]
            public bool Found { get; set; }

            [JsonPropertyName("macPrefix")]
            public string MacPrefix { get; set; }

            [JsonPropertyName("company")]
            public string Company { get; set; }

            [JsonPropertyName("address")]
            public string Address { get; set; }

            [JsonPropertyName("updated")]
            public string Updated { get; set; }
        }
    }
}
