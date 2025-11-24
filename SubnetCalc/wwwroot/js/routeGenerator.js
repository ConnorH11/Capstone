// Route Generator Logic

document.addEventListener('DOMContentLoaded', function () {
    // Attach event listeners
    const generateBtn = document.getElementById('generateRouteBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateRouteConfig);
    }

    const protocolSelect = document.getElementById('protocol');
    if (protocolSelect) {
        protocolSelect.addEventListener('change', toggleProtocolFields);
    }

    // Initial toggle
    toggleProtocolFields();
});

function toggleProtocolFields() {
    const protocol = document.getElementById('protocol').value;
    const fields = document.querySelectorAll('.protocol-fields');

    fields.forEach(field => {
        field.style.display = 'none';
    });

    if (protocol === 'static') {
        document.getElementById('staticFields').style.display = 'block';
    } else if (protocol === 'ospf') {
        document.getElementById('ospfFields').style.display = 'block';
    } else if (protocol === 'bgp') {
        document.getElementById('bgpFields').style.display = 'block';
    } else if (protocol === 'rip') {
        document.getElementById('ripFields').style.display = 'block';
    } else if (protocol === 'eigrp') {
        document.getElementById('eigrpFields').style.display = 'block';
    }
}

function generateRouteConfig() {
    const vendor = document.getElementById('vendor').value;
    const protocol = document.getElementById('protocol').value;

    let result = "";

    if (vendor === 'cisco') {
        result = generateCiscoRoute(protocol);
    } else if (vendor === 'juniper') {
        result = generateJuniperRoute(protocol);
    }

    document.getElementById('routeOutput').value = result;
}

function generateCiscoRoute(protocol) {
    if (protocol === 'static') {
        const dest = document.getElementById('staticDestIp').value.trim();
        const mask = document.getElementById('staticMask').value.trim();
        const nextHop = document.getElementById('staticNextHop').value.trim();

        if (!dest || !mask || !nextHop) return "Error: Please fill in all fields.";

        // Basic check if mask is CIDR, convert if needed (simplified)
        let finalMask = mask;
        if (mask.startsWith('/')) {
            finalMask = cidrToMask(mask.substring(1));
        }

        return `ip route ${dest} ${finalMask} ${nextHop}`;
    }
    else if (protocol === 'ospf') {
        const processId = document.getElementById('ospfProcessId').value.trim();
        const area = document.getElementById('ospfArea').value.trim();
        const network = document.getElementById('ospfNetwork').value.trim();
        const wildcard = document.getElementById('ospfWildcard').value.trim();

        if (!processId || !area || !network || !wildcard) return "Error: Please fill in all fields.";

        return `router ospf ${processId}\n network ${network} ${wildcard} area ${area}`;
    }
    else if (protocol === 'bgp') {
        const asn = document.getElementById('bgpAsn').value.trim();
        const neighbor = document.getElementById('bgpNeighborIp').value.trim();
        const remoteAs = document.getElementById('bgpRemoteAs').value.trim();
        const routerId = document.getElementById('bgpRouterId').value.trim();

        if (!asn || !neighbor || !remoteAs) return "Error: Please fill in all fields.";

        let config = `router bgp ${asn}\n`;
        if (routerId) config += ` bgp router-id ${routerId}\n`;
        config += ` neighbor ${neighbor} remote-as ${remoteAs}`;

        return config;
    }
    else if (protocol === 'rip') {
        const version = document.getElementById('ripVersion').value;
        const network = document.getElementById('ripNetwork').value.trim();

        if (!network) return "Error: Please enter a network.";

        return `router rip\n version ${version}\n network ${network}`;
    }
    else if (protocol === 'eigrp') {
        const asn = document.getElementById('eigrpAsn').value.trim();
        const network = document.getElementById('eigrpNetwork').value.trim();
        const wildcard = document.getElementById('eigrpWildcard').value.trim();

        if (!asn || !network) return "Error: Please fill in AS Number and Network.";

        let config = `router eigrp ${asn}\n`;
        if (wildcard) {
            config += ` network ${network} ${wildcard}`;
        } else {
            config += ` network ${network}`;
        }
        return config;
    }
    return "";
}

function generateJuniperRoute(protocol) {
    if (protocol === 'static') {
        const dest = document.getElementById('staticDestIp').value.trim();
        const mask = document.getElementById('staticMask').value.trim();
        const nextHop = document.getElementById('staticNextHop').value.trim();

        if (!dest || !mask || !nextHop) return "Error: Please fill in all fields.";

        let destination = dest;
        if (mask.startsWith('/')) destination += mask;
        else destination += `/${mask}`;

        return `set routing-options static route ${destination} next-hop ${nextHop}`;
    }
    else if (protocol === 'ospf') {
        const area = document.getElementById('ospfArea').value.trim();
        const network = document.getElementById('ospfNetwork').value.trim();

        if (!area || !network) return "Error: Please fill in all fields.";

        return `set protocols ospf area ${area} interface ${network}`;
    }
    else if (protocol === 'bgp') {
        const asn = document.getElementById('bgpAsn').value.trim();
        const neighbor = document.getElementById('bgpNeighborIp').value.trim();
        const remoteAs = document.getElementById('bgpRemoteAs').value.trim();

        if (!asn || !neighbor || !remoteAs) return "Error: Please fill in all fields.";

        let config = `set routing-options autonomous-system ${asn}\n`;
        config += `set protocols bgp group external-peers type external\n`;
        config += `set protocols bgp group external-peers neighbor ${neighbor} peer-as ${remoteAs}`;

        return config;
    }
    else if (protocol === 'rip') {
        const network = document.getElementById('ripNetwork').value.trim();
        if (!network) return "Error: Please enter a network/interface.";

        return `set protocols rip group rip-group neighbor ${network}`;
    }
    else if (protocol === 'eigrp') {
        return "Error: EIGRP is a Cisco proprietary protocol and is not supported on Juniper devices.";
    }
    return "";
}

function cidrToMask(cidr) {
    let prefix = parseInt(cidr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return "255.255.255.0";
    let mask = 0xffffffff << (32 - prefix);
    return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
}
