using SubnetCalc.Pages;
using System.Net;

public static class VlsmCalculator
{
    public static List<SubnetResult> Calculate(string baseIpStr, List<int> hostRequirements, List<string> labels)
    {
        if (!IPAddress.TryParse(baseIpStr, out var baseIp))
            throw new ArgumentException("Invalid base IP address.");

        uint baseIpUint = IpToUint(baseIp);
        var results = new List<SubnetResult>();

        // Pair labels with host requirements and sort by descending host size
        var combined = hostRequirements
            .Select((hosts, index) => new
            {
                OriginalIndex = index,
                Hosts = hosts,
                Label = labels[index]
            })
            .ToList();

        var sorted = combined
            .OrderByDescending(x => x.Hosts)
            .ToList();


        foreach (var entry in sorted)
        {
            int neededHosts = entry.Hosts;
            int bits = 0;
            while ((Math.Pow(2, bits) - 2) < neededHosts) bits++;
            int cidr = 32 - bits;
            uint blockSize = (uint)Math.Pow(2, bits);

            uint netUint = baseIpUint;
            uint broadcastUint = baseIpUint + blockSize - 1;

            results.Add(new SubnetResult
            {
                Label = entry.Label,
                NetworkAddress = UintToIp(netUint).ToString(),
                BroadcastAddress = UintToIp(broadcastUint).ToString(),
                FirstHost = bits >= 31 ? UintToIp(netUint).ToString() : UintToIp(netUint + 1).ToString(),
                LastHost = bits >= 31 ? UintToIp(broadcastUint).ToString() : UintToIp(broadcastUint - 1).ToString(),
                HostCount = bits >= 31 ? 0 : (int)(blockSize - 2),
                CidrNotation = $"/{cidr}",
                SubnetMask = UintToIp(cidr == 0 ? 0 : 0xffffffff << (32 - cidr)).ToString()
            });

            baseIpUint += blockSize;
        }

        return results;
    }

    private static uint IpToUint(IPAddress ip)
    {
        byte[] bytes = ip.GetAddressBytes();
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
        return BitConverter.ToUInt32(bytes, 0);
    }

    private static IPAddress UintToIp(uint ip)
    {
        byte[] bytes = BitConverter.GetBytes(ip);
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
        return new IPAddress(bytes);
    }
}
