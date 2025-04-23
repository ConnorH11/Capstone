using SubnetCalc.Pages;
using System.Net;

public static class SupernetCalculator
{
    public static SupernetResult Calculate(List<string> cidrs)
    {
        if (cidrs == null || cidrs.Count < 2)
            throw new ArgumentException("Enter at least two subnets to calculate a supernet.");

        // Parse and convert CIDRs to uint
        var networks = new List<(uint Address, int Cidr)>();
        foreach (var cidr in cidrs)
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var ip) || !int.TryParse(parts[1], out var prefix))
                throw new ArgumentException($"Invalid CIDR: {cidr}");

            uint address = IpToUint(ip);
            networks.Add((address, prefix));
        }

        // Get common bits
        uint first = networks.Min(n => n.Address);
        uint last = networks.Max(n => n.Address);
        uint xor = first ^ last;

        int commonPrefix = 0;
        for (int i = 31; i >= 0; i--)
        {
            if ((xor & (1u << i)) == 0)
                commonPrefix++;
            else
                break;
        }

        // Create supernet
        uint supernetAddress = first & (0xFFFFFFFF << (32 - commonPrefix));
        IPAddress netIP = UintToIp(supernetAddress);
        IPAddress subnetMask = UintToIp(0xFFFFFFFF << (32 - commonPrefix));

        uint firstHost = commonPrefix >= 31 ? supernetAddress : supernetAddress + 1;
        uint lastHost = commonPrefix >= 31 ? supernetAddress : (supernetAddress | ~(0xFFFFFFFF << (32 - commonPrefix))) - 1;

        return new SupernetResult
        {
            Cidr = $"{netIP}/{commonPrefix}",
            Network = netIP.ToString(),
            Mask = subnetMask.ToString(),
            FirstHost = UintToIp(firstHost).ToString(),
            LastHost = UintToIp(lastHost).ToString()
        };
    }

    private static uint IpToUint(IPAddress ip)
    {
        var bytes = ip.GetAddressBytes();
        if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
        return BitConverter.ToUInt32(bytes, 0);
    }

    private static IPAddress UintToIp(uint ip)
    {
        var bytes = BitConverter.GetBytes(ip);
        if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
        return new IPAddress(bytes);
    }
}
