using SubnetCalc.Pages;
using System.Net;

public static class SupernetCalculator
{
    /// Calculates the smallest supernet that encompasses all provided CIDR blocks.
    public static SupernetResult Calculate(List<string> cidrs)
    {
        // Require at least two subnets to aggregate
        if (cidrs == null || cidrs.Count < 2)
            throw new ArgumentException("Enter at least two subnets to calculate a supernet.");

        // Parse each CIDR into a 32-bit integer address and prefix length
        var networks = new List<(uint Address, int Cidr)>();
        foreach (var cidr in cidrs)
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2
                || !IPAddress.TryParse(parts[0], out var ip)
                || !int.TryParse(parts[1], out var prefix))
            {
                throw new ArgumentException($"Invalid CIDR: {cidr}");
            }

            uint address = IpToUint(ip);   // Convert IP to uint
            networks.Add((address, prefix));
        }

        // Find the lowest and highest addresses to determine common prefix
        uint first = networks.Min(n => n.Address);
        uint last = networks.Max(n => n.Address);
        uint xor = first ^ last;        // XOR highlights differing bits

        // Count leading zeros in the XOR result to get common prefix length
        int commonPrefix = 0;
        for (int i = 31; i >= 0; i--)
        {
            if ((xor & (1u << i)) == 0)
                commonPrefix++;
            else
                break;
        }

        // Mask out host bits to get the supernet network address
        uint supernetAddress = first & (0xFFFFFFFF << (32 - commonPrefix));
        IPAddress netIP = UintToIp(supernetAddress);
        IPAddress subnetMask = UintToIp(0xFFFFFFFF << (32 - commonPrefix));

        // Calculate first and last usable host addresses in the supernet
        uint firstHost = commonPrefix >= 31
            ? supernetAddress
            : supernetAddress + 1;
        uint lastHost = commonPrefix >= 31
            ? supernetAddress
            : (supernetAddress | ~(0xFFFFFFFF << (32 - commonPrefix))) - 1;

        // Return the assembled result
        return new SupernetResult
        {
            Cidr = $"{netIP}/{commonPrefix}",
            Network = netIP.ToString(),
            Mask = subnetMask.ToString(),
            FirstHost = UintToIp(firstHost).ToString(),
            LastHost = UintToIp(lastHost).ToString()
        };
    }

    /// Converts an IPAddress to its 32-bit unsigned integer representation.
    private static uint IpToUint(IPAddress ip)
    {
        var bytes = ip.GetAddressBytes();
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);    // Ensure big-endian ordering
        return BitConverter.ToUInt32(bytes, 0);
    }

    /// Converts a 32-bit unsigned integer back to an IPAddress.
    private static IPAddress UintToIp(uint ip)
    {
        var bytes = BitConverter.GetBytes(ip);
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);    // Back to network byte order
        return new IPAddress(bytes);
    }
}
