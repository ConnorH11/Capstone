// ACL Generator Logic

document.addEventListener('DOMContentLoaded', function () {
    // Attach event listeners
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateACL);
    }

    // Toggle port inputs based on protocol
    const protocolSelect = document.getElementById('protocol');
    if (protocolSelect) {
        protocolSelect.addEventListener('change', togglePortInputs);
    }

    // Initial toggle
    togglePortInputs();
});

function togglePortInputs() {
    const protocol = document.getElementById('protocol').value;
    const portInputs = document.querySelectorAll('.port-input');
    // Disable ports for ip, icmp, and any
    const disable = (protocol === 'ip' || protocol === 'icmp' || protocol === 'any');

    portInputs.forEach(input => {
        input.disabled = disable;
        if (disable) input.value = '';
    });
}

function generateACL() {
    const vendor = document.getElementById('vendor').value;
    const type = document.getElementById('aclType').value; // Standard/Extended for Cisco
    const action = document.getElementById('action').value;
    const protocol = document.getElementById('protocol').value;
    const sourceIp = document.getElementById('sourceIp').value.trim();
    const sourceCidr = document.getElementById('sourceCidr').value.trim(); // e.g. /24 or 255.255.255.0
    const destIp = document.getElementById('destIp').value.trim();
    const destCidr = document.getElementById('destCidr').value.trim();
    const sourcePort = document.getElementById('sourcePort').value.trim();
    const destPort = document.getElementById('destPort').value.trim();

    // Basic Validation
    if (!sourceIp || !destIp) {
        alert("Source and Destination IP are required.");
        return;
    }

    let result = "";
    if (vendor === 'cisco') {
        result = generateCisco(type, action, protocol, sourceIp, sourceCidr, destIp, destCidr, sourcePort, destPort);
    } else if (vendor === 'juniper') {
        result = generateJuniper(action, protocol, sourceIp, sourceCidr, destIp, destCidr, sourcePort, destPort);
    }

    document.getElementById('aclOutput').value = result;
}

function generateCisco(type, action, protocol, sIp, sCidr, dIp, dCidr, sPort, dPort) {
    // Cisco Format: access-list <num> <action> <protocol> <source> <wildcard> <dest> <wildcard> [eq port]

    // Map 'any' to 'ip' for Cisco
    let ciscoProto = protocol;
    if (protocol === 'any') ciscoProto = 'ip';

    let acl = `access-list 100 ${action} ${ciscoProto} `;

    // Source
    acl += formatCiscoAddress(sIp, sCidr);

    // Source Port
    if (sPort && (protocol === 'tcp' || protocol === 'udp')) {
        acl += ` eq ${sPort}`;
    }

    acl += " ";

    // Destination
    acl += formatCiscoAddress(dIp, dCidr);

    // Dest Port
    if (dPort && (protocol === 'tcp' || protocol === 'udp')) {
        acl += ` eq ${dPort}`;
    }

    return acl;
}

function formatCiscoAddress(ip, cidr) {
    if (!cidr || cidr === '/32' || cidr === '32') {
        return `host ${ip}`;
    }

    if (cidr === '/0' || cidr === '0' || ip === 'any') {
        return 'any';
    }

    // Calculate wildcard
    const wildcard = cidrToWildcard(cidr);
    return `${ip} ${wildcard}`;
}

function cidrToWildcard(cidr) {
    let prefix = 0;
    if (cidr.startsWith('/')) {
        prefix = parseInt(cidr.substring(1), 10);
    } else {
        // Assume it's a mask like 255.255.255.0, convert to prefix first or handle directly
        // For simplicity, let's assume user inputs /CIDR or we parse the mask.
        // If it's dotted decimal:
        if (cidr.includes('.')) {
            // Convert mask to wildcard directly: 255.255.255.0 -> 0.0.0.255
            return maskToWildcard(cidr);
        }
        prefix = parseInt(cidr, 10);
    }

    if (isNaN(prefix)) return "0.0.0.0";

    // Calculate wildcard from prefix
    // e.g. /24 -> 0.0.0.255
    const mask = 0xffffffff << (32 - prefix);
    const wildcard = ~mask; // bitwise NOT

    return intToIp(wildcard >>> 0); // unsigned shift
}

function maskToWildcard(mask) {
    const parts = mask.split('.');
    const wildcardParts = parts.map(part => 255 - parseInt(part, 10));
    return wildcardParts.join('.');
}

function intToIp(int) {
    const part1 = (int >>> 24) & 255;
    const part2 = (int >>> 16) & 255;
    const part3 = (int >>> 8) & 255;
    const part4 = int & 255;
    return `${part1}.${part2}.${part3}.${part4}`;
}

function generateJuniper(action, protocol, sIp, sCidr, dIp, dCidr, sPort, dPort) {
    // Juniper Format:
    // term <name> { from { ... } then { <action>; } }

    let termName = `allow-${protocol}`;
    if (action === 'deny') termName = `block-${protocol}`;

    let config = `term ${termName} {\n`;
    config += `    from {\n`;

    // Source
    config += `        source-address {\n`;
    config += `            ${formatJuniperAddress(sIp, sCidr)};\n`;
    config += `        }\n`;

    // Destination
    config += `        destination-address {\n`;
    config += `            ${formatJuniperAddress(dIp, dCidr)};\n`;
    config += `        }\n`;

    // Protocol
    // Map 'any' or 'ip' to 'all' for Juniper (or just omit, but 'protocol all' is explicit)
    if (protocol === 'any' || protocol === 'ip') {
        config += `        protocol all;\n`;
    } else {
        config += `        protocol ${protocol};\n`;
    }

    // Ports
    if (sPort && (protocol === 'tcp' || protocol === 'udp')) {
        config += `        source-port ${sPort};\n`;
    }
    if (dPort && (protocol === 'tcp' || protocol === 'udp')) {
        config += `        destination-port ${dPort};\n`;
    }

    config += `    }\n`; // end from

    // Action
    let junosAction = 'accept';
    if (action === 'deny') junosAction = 'discard'; // or reject

    config += `    then {\n`;
    config += `        ${junosAction};\n`;
    config += `    }\n`;
    config += `}`; // end term

    return config;
}

function formatJuniperAddress(ip, cidr) {
    if (!cidr) return `${ip}/32`;
    if (cidr.startsWith('/')) return `${ip}${cidr}`;
    return `${ip}/${cidr}`; // Assume user might enter just '24'
}
