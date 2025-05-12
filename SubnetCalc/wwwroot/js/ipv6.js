/**
 * Main function to calculate and display IPv6 subnet information.
 * Reads user input, validates it, and generates the expanded/compressed
 * addresses, usable range, and optionally splits into multiple subnets.
 */
function calculateIPv6() {
    const input = document.getElementById("ipv6Address").value.trim();
    const subnetCount = parseInt(document.getElementById("subnetCount").value.trim(), 10);
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";

    // Validate presence of prefix
    if (!input.includes("/")) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Please enter an IPv6 address with a prefix, e.g., 2001:db8::/64</div>`;
        return;
    }

    const [ipPart, prefixStr] = input.split("/");
    const prefix = parseInt(prefixStr, 10);

    // Validate prefix range
    if (isNaN(prefix) || prefix < 0 || prefix > 128) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Invalid prefix. Must be between 0 and 128.</div>`;
        return;
    }

    try {
        // Expand and compress for display
        const expanded = expandIPv6(ipPart);
        const compressed = compressIPv6(expanded);

        // Convert to binary and slice to the prefix length
        const baseBinary = ipv6ToBinary(expanded).substring(0, prefix);
        const hostBits = 128 - prefix;

        // Build the initial result HTML
        let outputHtml = `
            <p><strong>Expanded:</strong> ${expanded}</p>
            <p><strong>Compressed:</strong> ${compressed}</p>
            <p><strong>Prefix:</strong> /${prefix}</p>
            <p><strong>Usable Range:</strong><br>
               ${compressIPv6(binaryToIPv6(baseBinary.padEnd(128, '0')))} - 
               ${compressIPv6(binaryToIPv6(baseBinary.padEnd(128, '1')))}
            </p>
        `;

        // If user requested multiple subnets, calculate them
        if (!isNaN(subnetCount) && subnetCount > 0) {
            const neededBits = Math.ceil(Math.log2(subnetCount));
            const newPrefix = prefix + neededBits;

            // Check if there's enough room for that many subnets
            if (newPrefix > 128) {
                outputHtml += `<div class="alert alert-warning mt-3">Not enough bits to create ${subnetCount} subnets from /${prefix}</div>`;
            } else {
                outputHtml += `<p><strong>New Subnet Prefix:</strong> /${newPrefix}</p>`;
                outputHtml += `<h5 class="mt-3">Subnets:</h5><ul class="list-group">`;

                // Generate each subnet based on increasing binary suffix
                for (let i = 0; i < subnetCount; i++) {
                    const subnetBinary = baseBinary + intToBinary(i, neededBits).padEnd(hostBits, '0');
                    const subnetAddress = binaryToIPv6(subnetBinary);
                    outputHtml += `<li class="list-group-item">${subnetAddress} /${newPrefix}</li>`;
                }

                outputHtml += `</ul>`;
            }
        }

        // Render everything
        resultDiv.innerHTML = outputHtml;
    } catch (err) {
        // Catch and display any unexpected errors
        resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

// --- Helper Functions ---

/**
 * Expands a compressed IPv6 address (using ::) into its full 8-group form.
 * @param {string} ip - The possibly compressed IPv6 address (no prefix).
 * @returns {string} The full 8-group, zero-padded IPv6 address.
 */
function expandIPv6(ip) {
    if (ip.includes("::")) {
        const parts = ip.split("::");
        const left = parts[0] ? parts[0].split(":") : [];
        const right = parts[1] ? parts[1].split(":") : [];
        const fill = new Array(8 - (left.length + right.length)).fill("0000");
        const full = [...left, ...fill, ...right];
        return full.map(part => part.padStart(4, '0')).join(":");
    } else {
        return ip.split(":").map(part => part.padStart(4, '0')).join(":");
    }
}

/**
 * Compresses a full 8-group IPv6 address by collapsing longest runs of zeros.
 * @param {string} ipv6 - The expanded IPv6 address (8 groups of 4 hex digits).
 * @returns {string} The shortest possible compressed form.
 */
function compressIPv6(ipv6) {
    const sections = ipv6.split(":").map(part => part.replace(/^0+/, '') || '0');

    // Find the longest run of consecutive "0" sections
    let bestStart = -1, bestLen = 0, currStart = -1, currLen = 0;
    for (let i = 0; i <= sections.length; i++) {
        if (i < sections.length && sections[i] === '0') {
            if (currStart === -1) currStart = i;
            currLen++;
        } else {
            if (currLen > bestLen) {
                bestStart = currStart;
                bestLen = currLen;
            }
            currStart = -1;
            currLen = 0;
        }
    }

    // Replace the longest zero-run with empty string to get "::"
    if (bestLen > 1) {
        sections.splice(bestStart, bestLen, '');
        if (bestStart === 0) sections.unshift('');
        if (bestStart + bestLen === 8) sections.push('');
    }

    return sections.join(":").replace(/:{3,}/, "::").toLowerCase();
}

/**
 * Converts an expanded IPv6 string into a 128-bit binary string.
 * @param {string} ip - Expanded IPv6 address.
 * @returns {string} 128-character string of 0s and 1s.
 */
function ipv6ToBinary(ip) {
    return expandIPv6(ip)
        .split(":")
        .map(h => parseInt(h, 16).toString(2).padStart(16, '0'))
        .join('');
}

/**
 * Converts a 128-bit binary string back into a compressed IPv6 address.
 * @param {string} bin - 128-character binary representation.
 * @returns {string} Compressed IPv6 address.
 */
function binaryToIPv6(bin) {
    const hexGroups = [];
    for (let i = 0; i < 128; i += 16) {
        hexGroups.push(parseInt(bin.slice(i, i + 16), 2).toString(16));
    }
    return compressIPv6(hexGroups.join(":"));
}

/**
 * Converts an integer to its binary string, padded to a given bit length.
 * @param {number} n - The integer to convert.
 * @param {number} bits - The desired string length.
 * @returns {string} Binary string of length 'bits'.
 */
function intToBinary(n, bits) {
    return n.toString(2).padStart(bits, '0');
}
