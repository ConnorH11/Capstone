namespace SubnetCalc.Pages
{
    public class SubnetResult
    {
        public string NetworkAddress { get; set; }
        public string SubnetMask { get; set; }
        public string BroadcastAddress { get; set; }
        public string FirstHost { get; set; }
        public string LastHost { get; set; }
        public int HostCount { get; set; }
        public string WildcardMask { get; set; }
        public string BinaryMask { get; set; }
        public string CidrNotation { get; set; }
        public string Label { get; set; }


    }

}
