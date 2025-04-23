using System.Net;
using System.Net.Sockets;

public static class CidrAggregator
{
    public static List<string> Aggregate(List<string> cidrs)
    {
        var blocks = new List<(uint Network, int Prefix)>();

        foreach (var cidr in cidrs)
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var ip) || !int.TryParse(parts[1], out var prefix))
                throw new ArgumentException($"Invalid CIDR format: {cidr}");

            if (prefix < 0 || prefix > 32)
                throw new ArgumentException($"Invalid prefix length in {cidr}");

            uint ipUint = IpToUint(ip);
            uint mask = prefix == 0 ? 0 : 0xFFFFFFFF << (32 - prefix);
            ipUint &= mask; // normalize

            blocks.Add((ipUint, prefix));
        }

        // Sort by network and then by prefix length (ascending)
        blocks = blocks.OrderBy(b => b.Network).ThenBy(b => b.Prefix).ToList();

        var merged = new Stack<(uint Network, int Prefix)>();
        foreach (var block in blocks)
        {
            merged.Push(block);
            while (merged.Count >= 2)
            {
                var b1 = merged.Pop();
                var b2 = merged.Pop();

                if (CanMerge(b2, b1, out var mergedBlock))
                    merged.Push(mergedBlock);
                else
                {
                    merged.Push(b2);
                    merged.Push(b1);
                    break;
                }
            }
        }

        return merged
            .Select(b => $"{UintToIp(b.Network)}/{b.Prefix}")
            .OrderBy(c => c)
            .ToList();
    }

    private static bool CanMerge((uint Net, int Pre) a, (uint Net, int Pre) b, out (uint Net, int Pre) merged)
    {
        merged = default;

        if (a.Pre != b.Pre) return false;

        uint mask = (uint)(0xFFFFFFFF << (33 - a.Pre));
        if ((a.Net & mask) == (b.Net & mask))
        {
            uint min = Math.Min(a.Net, b.Net);
            merged = (min, a.Pre - 1);
            return true;
        }

        return false;
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
