using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net;
using System.Net.NetworkInformation;
using System.Text;

namespace SubnetCalc.Pages
{
    public class PingTracerouteModel : PageModel
    {
        [BindProperty]
        public string HostnameOrIp { get; set; }

        [BindProperty]
        public string ToolType { get; set; } = "Ping"; // "Ping" or "Traceroute"

        public List<string> OutputLog { get; set; } = new List<string>();
        public bool IsRunning { get; set; }

        public void OnGet()
        {
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrWhiteSpace(HostnameOrIp))
            {
                OutputLog.Add("Error: Please enter a valid Hostname or IP address.");
                return Page();
            }

            // Basic input sanitization to prevent command injection if we were using shell (we aren't, but good practice)
            // and to ensure it looks like a valid host/IP.
            if (HostnameOrIp.Contains(" ") || HostnameOrIp.Any(c => !char.IsLetterOrDigit(c) && c != '.' && c != '-' && c != ':'))
            {
                 OutputLog.Add("Error: Invalid characters in Hostname/IP.");
                 return Page();
            }

            IsRunning = true;
            OutputLog.Add($"Starting {ToolType} for {HostnameOrIp}...");

            try
            {
                if (ToolType == "Ping")
                {
                    await RunPing();
                }
                else if (ToolType == "Traceroute")
                {
                    await RunTraceroute();
                }
            }
            catch (Exception ex)
            {
                OutputLog.Add($"Error: {ex.Message}");
            }

            IsRunning = false;
            return Page();
        }

        private async Task RunPing()
        {
            using (var ping = new Ping())
            {
                var buffer = Encoding.ASCII.GetBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
                var options = new PingOptions(64, true);

                for (int i = 0; i < 4; i++)
                {
                    try
                    {
                        var reply = await ping.SendPingAsync(HostnameOrIp, 2000, buffer, options);
                        if (reply.Status == IPStatus.Success)
                        {
                            OutputLog.Add($"Reply from {reply.Address}: bytes={reply.Buffer.Length} time={reply.RoundtripTime}ms TTL={reply.Options?.Ttl}");
                        }
                        else
                        {
                            OutputLog.Add($"Ping failed: {reply.Status}");
                        }
                    }
                    catch (PingException ex)
                    {
                         OutputLog.Add($"Ping error: {ex.InnerException?.Message ?? ex.Message}");
                    }
                    
                    await Task.Delay(1000); // Wait 1s between pings
                }
            }
            OutputLog.Add("Ping complete.");
        }

        private async Task RunTraceroute()
        {
            // Simple traceroute implementation using Ping with increasing TTL
            using (var ping = new Ping())
            {
                var buffer = Encoding.ASCII.GetBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
                int maxHops = 30;
                int timeout = 2000;

                for (int ttl = 1; ttl <= maxHops; ttl++)
                {
                    // Mask the first 2 hops for privacy (Home Server protection)
                    if (ttl <= 2)
                    {
                        OutputLog.Add($"{ttl}\t*\t\t(Hidden for Privacy)");
                        continue;
                    }

                    var options = new PingOptions(ttl, true);
                    try
                    {
                        // SendPingAsync doesn't support Hostname resolution well with TTL expiration on some platforms/versions
                        // But usually works. Note: SendPingAsync might throw if TTL expired in transit depending on implementation,
                        // but usually returns IPStatus.TtlExpired.
                        
                        var reply = await ping.SendPingAsync(HostnameOrIp, timeout, buffer, options);

                        if (reply.Status == IPStatus.Success)
                        {
                            OutputLog.Add($"{ttl}\t{reply.RoundtripTime}ms\t{reply.Address}\t(Reached Destination)");
                            break;
                        }
                        else if (reply.Status == IPStatus.TtlExpired)
                        {
                            OutputLog.Add($"{ttl}\t{reply.RoundtripTime}ms\t{reply.Address}");
                        }
                        else if (reply.Status == IPStatus.TimedOut)
                        {
                            OutputLog.Add($"{ttl}\t*\t\tRequest timed out.");
                        }
                        else
                        {
                            OutputLog.Add($"{ttl}\t*\t\t{reply.Status}");
                        }
                    }
                    catch (Exception)
                    {
                        OutputLog.Add($"{ttl}\t*\t\tError/Timeout");
                    }
                }
            }
            OutputLog.Add("Traceroute complete.");
        }
    }
}
