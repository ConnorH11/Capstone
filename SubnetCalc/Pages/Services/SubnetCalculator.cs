using SubnetCalc.Pages;
using System;
using System.Net;

public static class SubnetCalculator
{
    public static SubnetResult Calculate(string ipAddressStr, string cidrStr)
    {
        var result = new SubnetResult();

        if (!IPAddress.TryParse(ipAddressStr, out IPAddress ipAddress))
            throw new ArgumentException("Invalid IP address.");

        int cidr;

        if (cidrStr.StartsWith("/"))
        {
            // CIDR format
            cidr = int.Parse(cidrStr.TrimStart('/'));
        }
        else
        {
            // Subnet mask format
            if (!IPAddress.TryParse(cidrStr, out IPAddress parsedMask))
                throw new ArgumentException("Invalid subnet mask.");

            byte[] bytes = parsedMask.GetAddressBytes();
            cidr = bytes.Sum(b => Convert.ToString(b, 2).Count(c => c == '1'));

            // Check for non-contiguous subnet mask (invalid)
            string binary = string.Join("", bytes.Select(b => Convert.ToString(b, 2).PadLeft(8, '0')));
            if (binary.Contains("01"))
                throw new ArgumentException("Subnet mask is not contiguous.");
        }



        // Convert CIDR to subnet mask
        uint mask = cidr == 0 ? 0 : 0xffffffff << (32 - cidr);
        IPAddress subnetMask = new IPAddress(BitConverter.GetBytes(mask).Reverse().ToArray());

        // Convert IP to uint
        uint ipUint = IpToUint(ipAddress);
        uint netUint = ipUint & mask;
        uint broadcastUint = netUint | ~mask;

        result.NetworkAddress = UintToIp(netUint).ToString();
        result.SubnetMask = subnetMask.ToString();
        result.CidrNotation = $"/{cidr}";
        result.BroadcastAddress = UintToIp(broadcastUint).ToString();
        result.FirstHost = cidr == 32 ? result.NetworkAddress : UintToIp(netUint + 1).ToString();
        result.LastHost = cidr >= 31 ? result.BroadcastAddress : UintToIp(broadcastUint - 1).ToString();
        result.HostCount = cidr >= 31 ? 0 : (int)(broadcastUint - netUint - 1);
        result.WildcardMask = UintToIp(~mask).ToString();
        result.BinaryMask = Convert.ToString(mask, 2).PadLeft(32, '0').Insert(8, ".").Insert(17, ".").Insert(26, ".");

        return result;
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
