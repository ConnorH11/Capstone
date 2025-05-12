using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;

public static class CidrAggregator
{
    /// Aggregates a list of CIDR blocks into the minimal number of covering blocks.
    /// <param name="cidrs">List of input CIDR strings, e.g. "192.168.0.0/24".</param>
    /// <returns>List of aggregated CIDR strings.</returns>
    public static List<string> Aggregate(List<string> cidrs)
    {
        // Step 1: Parse and normalize each CIDR into a tuple (networkAddress, prefixLength)
        var blocks = new List<(uint Network, int Prefix)>();
        foreach (var cidr in cidrs)
        {
            // Split into address and prefix parts
            var parts = cidr.Split('/');
            if (parts.Length != 2
                || !IPAddress.TryParse(parts[0], out var ip)
                || !int.TryParse(parts[1], out var prefix))
            {
                throw new ArgumentException($"Invalid CIDR format: {cidr}");
            }

            if (prefix < 0 || prefix > 32)
                throw new ArgumentException($"Invalid prefix length in {cidr}");

            // Convert IP to uint and apply mask to normalize network address
            uint ipUint = IpToUint(ip);
            uint mask = prefix == 0 ? 0 : 0xFFFFFFFF << (32 - prefix);
            ipUint &= mask;

            blocks.Add((ipUint, prefix));
        }

        // Step 2: Sort by network address ascending, then by prefix length ascending
        blocks = blocks
            .OrderBy(b => b.Network)
            .ThenBy(b => b.Prefix)
            .ToList();

        // Step 3: Merge adjacent blocks when possible
        var merged = new Stack<(uint Network, int Prefix)>();
        foreach (var block in blocks)
        {
            merged.Push(block);

            // While the top two blocks on the stack can be merged, do so
            while (merged.Count >= 2)
            {
                var b1 = merged.Pop();
                var b2 = merged.Pop();

                if (CanMerge(b2, b1, out var combined))
                {
                    // If mergeable, push the larger combined block
                    merged.Push(combined);
                }
                else
                {
                    // Otherwise, put them back and stop merging
                    merged.Push(b2);
                    merged.Push(b1);
                    break;
                }
            }
        }

        // Step 4: Convert back to CIDR string format and return sorted list
        return merged
            .Select(b => $"{UintToIp(b.Network)}/{b.Prefix}")
            .OrderBy(c => c)
            .ToList();
    }

    /// Determines whether two blocks of equal prefix length can be merged into
    /// a single block with a shorter prefix (doubling the size).
    private static bool CanMerge((uint Network, int Prefix) a,
                                 (uint Network, int Prefix) b,
                                 out (uint Network, int Prefix) merged)
    {
        merged = default;

        // Only blocks with identical prefix lengths can merge
        if (a.Prefix != b.Prefix)
            return false;

        // Compute the mask for one bit shorter prefix
        uint mask = (uint)(0xFFFFFFFF << (33 - a.Prefix));

        // If the two networks share the same higher‐order bits, merge them
        if ((a.Network & mask) == (b.Network & mask))
        {
            uint combinedNetwork = Math.Min(a.Network, b.Network);
            merged = (combinedNetwork, a.Prefix - 1);
            return true;
        }

        return false;
    }

    /// Converts an <see cref="IPAddress"/> (IPv4) to its 32‐bit unsigned integer representation.
    private static uint IpToUint(IPAddress ip)
    {
        var bytes = ip.GetAddressBytes();
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
        return BitConverter.ToUInt32(bytes, 0);
    }

    /// Converts a 32‐bit unsigned integer back into an <see cref="IPAddress"/>.
    private static IPAddress UintToIp(uint ip)
    {
        var bytes = BitConverter.GetBytes(ip);
        if (BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
        return new IPAddress(bytes);
    }
}
