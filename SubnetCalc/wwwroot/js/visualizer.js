let deleteMode = false;
let cableMode = false;
let cableStart = null;
let deviceCounter = 0;
const connections = [];
const canvas = document.getElementById('canvas');
const deleteStatus = document.getElementById("deleteStatus");
const cableBtn = document.getElementById("cableModeBtn");
const cableStatus = document.getElementById("cableStatus");
const devices = {};
let subnetResults = [];
const subnetColors = {}; // Store subnet colors

document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
    cableStatus.style.display = "none";
});

document.getElementById("clearCanvasBtn").addEventListener("click", () => {
    // Remove all devices, labels, IPs
    Object.values(devices).forEach(device => {
        if (device.element) device.element.remove();
        if (device.labelElement) device.labelElement.remove();
        if (device.ipAddressElement) device.ipAddressElement.remove();
    });

    // Clear all SVG lines (cables)
    const svg = document.getElementById("connectionLayer");
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }

    // Remove subnet outlines (extra divs with border)
    document.querySelectorAll("#canvas > div").forEach(div => {
        if (div.style.border?.includes("solid")) div.remove();
    });

    // Reset state
    Object.keys(devices).forEach(k => delete devices[k]);
    connections.length = 0;
    deviceCounter = 0;
    subnetResults.length = 0;

    // Clear results table
    document.getElementById("resultsBody").innerHTML = "";
    document.getElementById("subnetResults").style.display = "none";
});


document.querySelectorAll('.draggable').forEach(icon => {
    icon.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', icon.dataset.type);
        e.dataTransfer.setData('icon', icon.src);
    });
});

canvas.addEventListener('dragover', e => e.preventDefault());

function makeDraggable(el, label, device = null) {
    if (el.dataset.draggableInitialized) return;
    el.dataset.draggableInitialized = "true";

    let offsetX = 0, offsetY = 0;

    el.onmousedown = function (e) {
        if (e.button !== 0) return;

        const canvasRect = canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        offsetX = e.clientX - elRect.left;
        offsetY = e.clientY - elRect.top;

        document.onmousemove = function (eMove) {
            const newX = eMove.clientX - canvasRect.left - offsetX;
            const newY = eMove.clientY - canvasRect.top - offsetY;

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;

            if (label) {
                label.style.left = `${newX}px`;
                label.style.top = `${newY + 60}px`;
            }

            if (device?.ipAddressElement) {
                device.ipAddressElement.style.left = `${newX}px`;
                device.ipAddressElement.style.top = `${newY + 75}px`;
            }

            connections.forEach(conn => {
                if (conn.from === el || conn.to === el) {
                    updateLinePosition(conn.from, conn.to, conn.line);
                }
            });
        };

        document.onmouseup = function () {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    el.onclick = function () {
        if (deleteMode) {
            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].from === el || connections[i].to === el) {
                    connections[i].line.remove();
                    connections.splice(i, 1);
                }
            }

            // Clean up everything related to this device
            if (label) label.remove();

            const deviceId = el.dataset.id;
            if (deviceId && devices[deviceId]) {
                const device = devices[deviceId];
                if (device.ipAddressElement) {
                    device.ipAddressElement.remove();
                }
                delete devices[deviceId];
            }

            el.remove();
        }
    };

}


cableBtn.addEventListener("click", () => {
    cableMode = !cableMode;
    deleteMode = false;
    cableStart = null;
    canvas.style.cursor = cableMode ? "crosshair" : "default";
    cableStatus.style.display = cableMode ? "inline" : "none";
    deleteStatus.style.display = "none";
});

canvas.addEventListener('click', function (e) {
    if (!cableMode || !e.target.classList.contains('draggable')) return;

    if (!cableStart) {
        cableStart = e.target;
        e.target.style.outline = '2px dashed green';
    } else {
        drawSvgLine(cableStart, e.target);
        cableStart.style.outline = 'none';
        cableStart = null;
        cableMode = false;
        canvas.style.cursor = 'default';
        cableStatus.style.display = "none";
    }
});

function updateLinePosition(fromEl, toEl, line) {
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    line.setAttribute("x1", fromRect.left + fromRect.width / 2 - canvasRect.left);
    line.setAttribute("y1", fromRect.top + fromRect.height / 2 - canvasRect.top);
    line.setAttribute("x2", toRect.left + toRect.width / 2 - canvasRect.left);
    line.setAttribute("y2", toRect.top + toRect.height / 2 - canvasRect.top);
}

function drawSvgLine(fromEl, toEl) {
    const svg = document.getElementById("connectionLayer");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    // Set initial attributes
    line.setAttribute("stroke", "#007bff");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("pointer-events", "stroke"); // Enables click events on line itself
    line.style.cursor = "pointer";

    // Set position
    updateLinePosition(fromEl, toEl, line);

    // Make the line clickable for deletion
    line.addEventListener("click", function (e) {
        if (deleteMode) {
            svg.removeChild(line);

            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].line === line) {
                    connections.splice(i, 1);
                    break;
                }
            }

            e.stopPropagation();
        }
    });


    // Append to SVG
    svg.appendChild(line);

    // Track connection
    const fromId = fromEl.dataset.id;
    const toId = toEl.dataset.id;

    if (devices[fromId] && devices[toId]) {
        devices[fromId].connections.push(toId);
        devices[toId].connections.push(fromId);
    }

    connections.push({ from: fromEl, to: toEl, line: line });
}



function ipToUint(ipStr) {
    const parts = ipStr.split('.');
    let result = 0;
    for (let i = 0; i < parts.length; i++) {
        const num = parseInt(parts[i], 10);
        if (isNaN(num) || num < 0 || num > 255) {
            throw new Error(`Invalid IP segment: ${parts[i]}`);
        }
        result = (result << 8) + num;
    }
    return result;
}



function uintToIp(uint) {
    return [
        (uint >>> 24) & 0xff,
        (uint >>> 16) & 0xff,
        (uint >>> 8) & 0xff,
        uint & 0xff
    ].join('.');
}

function cidrToMask(cidr) {
    return uintToIp(cidr === 0 ? 0 : 0xffffffff << (32 - cidr));
}

function isValidIPAddress(ip) {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
}

function isValidCIDR(cidr) {
    const num = parseInt(cidr, 10);
    return !isNaN(num) && num >= 0 && num <= 32;
}

function autoSubnet(baseCidrStr, groups) {
    const [baseIpStr, cidrStr] = baseCidrStr.split('/');

    if (!isValidIPAddress(baseIpStr) || !isValidCIDR(cidrStr)) {
        alert("Invalid IP address or CIDR.");
        return;
    }
    console.log("baseIpStr:", baseIpStr);
    const baseIp = ipToUint(baseIpStr);
    const baseCidr = parseInt(cidrStr, 10);
    let nextIp = baseIp;
    subnetResults = [];

    // Calculate total required IPs
    let totalRequiredHosts = 0;
    groups.forEach(group => {
        const routers = group.filter(id => devices[id].type.toLowerCase() === 'router').length;
        const requiredHosts = routers === 2 ? 2 : group.length + 2;
        totalRequiredHosts += requiredHosts;
    });

    // Check if enough IPs are available
    const availableHosts = Math.pow(2, 32 - baseCidr);
    if (totalRequiredHosts > availableHosts) {
        alert("Not enough IP addresses available in the base network.");
        return;
    }

    groups.forEach((group, index) => {
        const routers = group.filter(id => devices[id].type.toLowerCase() === 'router').length;
        const requiredHosts = routers === 2 ? 2 : group.length + 2;
        let bits = 0;
        while ((Math.pow(2, bits) - 2) < requiredHosts) bits++;
        const cidr = 32 - bits;
        const blockSize = Math.pow(2, bits);

        const networkAddress = uintToIp(nextIp);
        const subnetMask = cidrToMask(cidr);
        const firstHost = uintToIp(nextIp + 1);
        const lastHost = uintToIp(nextIp + blockSize - 2);
        const broadcastAddress = uintToIp(nextIp + blockSize - 1);

        subnetResults.push({
            networkAddress,
            cidr,
            subnetMask,
            firstHost,
            lastHost,
            broadcastAddress,
            assignedDevices: group.map(id => devices[id]?.labelElement?.innerText || id),
            color: getRandomColor() // Assign a color to the subnet
        });

        // Assign IPs to devices within the subnet
        assignIPAddresses(group, nextIp + 1, blockSize - 2);

        nextIp += blockSize;
    });
}

function assignIPAddresses(group, startIp, numAddresses) {
    let currentIp = startIp;
    group.forEach(deviceId => {
        const device = devices[deviceId];
        if (device && device.type.toLowerCase() !== 'router') {
            if (numAddresses > 0) {
                device.ipAddress = uintToIp(currentIp);
                currentIp++;
                numAddresses--;
            } else {
                device.ipAddress = "N/A"; // Or handle this case as needed
            }
        } else if (device && device.type.toLowerCase() === 'router') {
            device.ipAddress = uintToIp(currentIp); // Assign IP to router
            currentIp++;
        }
    });
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getSubnetsFromRouterInterfaces() {
    const subnets = [];
    const visitedPairs = new Set();

    Object.values(devices).forEach(device => {
        if (device.type.toLowerCase() !== 'router') return;

        device.connections.forEach(peerId => {
            const peer = devices[peerId];
            if (!peer || peer.type.toLowerCase() !== 'router') return;

            // Create a unique pair key like "device_1-device_2" or "device_2-device_1"
            const pairKey = [device.id, peerId].sort().join('-');
            if (visitedPairs.has(pairKey)) return;

            visitedPairs.add(pairKey);
            subnets.push([device.id, peerId]);
        });
    });

    // Now handle router-to-non-router subnet groups
    Object.values(devices).forEach(device => {
        if (device.type.toLowerCase() !== 'router') return;

        device.connections.forEach(peerId => {
            const peer = devices[peerId];
            if (!peer || peer.type.toLowerCase() === 'router') return;

            // Build a subnet group: router + downstream devices
            const group = [device.id];
            const visited = new Set([device.id]);
            const queue = [peerId];

            while (queue.length > 0) {
                const currentId = queue.shift();
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                group.push(currentId);

                const current = devices[currentId];
                if (!current || current.type.toLowerCase() === 'router') continue;

                current.connections.forEach(next => {
                    if (!visited.has(next)) queue.push(next);
                });
            }

            // Avoid adding a duplicate group
            const alreadyExists = subnets.some(existing =>
                existing.length === group.length &&
                group.every(id => existing.includes(id))
            );
            if (!alreadyExists) subnets.push(group);
        });
    });

    return subnets;
}



document.getElementById("calculateBtn").addEventListener("click", () => {
    const base = document.getElementById("baseIp").value.trim();
    if (!base.includes("/")) return alert("Enter a base network with CIDR (e.g., 192.168.0.0/24)");

    const groups = getSubnetsFromRouterInterfaces();
    if (groups.length === 0) {
        alert("No subnets found. Connect routers to devices.");
        return;
    }
    autoSubnet(base, groups);

    if (subnetResults.length === 0) return; // Stop if autoSubnet failed

    const tableWrapper = document.getElementById("subnetResults");
    const tableBody = document.getElementById("resultsBody");
    if (!tableWrapper || !tableBody) return;

    tableBody.innerHTML = "";
    subnetResults.forEach(subnet => {
        const row = document.createElement("tr");
        row.style.borderLeft = `6px solid ${subnet.color}`; // Apply subnet color to row
        row.innerHTML = `
<td>${subnet.networkAddress}/${subnet.cidr}</td>
<td>${subnet.subnetMask}</td>
<td>${subnet.firstHost}</td>
<td>${subnet.lastHost}</td>
<td>${subnet.broadcastAddress}</td>
<td>${subnet.assignedDevices.map(id => `${id} (${devices[id]?.ipAddress || 'N/A'})`).join(", ")}</td>
`;

        tableBody.appendChild(row);

        const subnetDevices = subnet.assignedDevices.map(name => {
            return Object.values(devices).find(d => d.labelElement?.innerText === name)?.element;
        }).filter(Boolean);

        if (subnetDevices.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            subnetDevices.forEach(deviceEl => {
                const rect = deviceEl.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();

                const left = rect.left - canvasRect.left;
                const top = rect.top - canvasRect.top;
                const right = left + rect.width;
                const bottom = top + rect.height;

                minX = Math.min(minX, left);
                minY = Math.min(minY, top);
                maxX = Math.max(maxX, right);
                maxY = Math.max(maxY, bottom);
            });

            const outline = document.createElement("div");
            outline.style.position = "absolute";
            outline.style.border = `2px solid ${subnet.color}`;
            outline.style.left = `${minX - 20}px`;
            outline.style.top = `${minY - 20}px`;
            outline.style.width = `${maxX - minX + 40}px`;
            outline.style.height = `${maxY - minY + 40}px`;
            outline.style.zIndex = "0";
            outline.style.borderRadius = "10px";
            canvas.appendChild(outline);
        }
    });

    tableWrapper.style.display = "block";

    // Update visual representation with subnet colors and IPs
    Object.values(devices).forEach(device => {
        if (device.element) {
            const subnet = subnetResults.find(s => s.assignedDevices.includes(device.id));
            if (subnet) {
                device.element.style.backgroundColor = subnet.color; // Color the device
            }
            if (device.ipAddress) {
                if (!device.ipAddressElement) {
                    device.ipAddressElement = document.createElement('div');
                    device.ipAddressElement.innerText = device.ipAddress;
                    device.ipAddressElement.style.position = 'absolute';

                    //INSERT THIS BLOCK HERE
                    device.ipAddressElement.style.left = device.element.style.left;
                    device.ipAddressElement.style.top = (parseInt(device.element.style.top) + 85) + 'px';
                    device.ipAddressElement.style.fontSize = '10px';
                    device.ipAddressElement.style.color = '#000';
                    device.ipAddressElement.style.zIndex = "3";
                    device.ipAddressElement.style.backgroundColor = "#fff";
                    device.ipAddressElement.style.padding = "1px 4px";
                    device.ipAddressElement.style.borderRadius = "4px";

                    canvas.appendChild(device.ipAddressElement);
                } else {
                    device.ipAddressElement.innerText = device.ipAddress;
                    device.ipAddressElement.style.left = device.element.style.left;
                    device.ipAddressElement.style.top = (parseInt(device.element.style.top) + 85) + 'px';
                }
            }
        }
    });

});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
    let csv = "Network Address/CIDR,Subnet Mask,First Host,Last Host,Broadcast,Assigned Devices\n";
    subnetResults.forEach(s => {
        csv += `${s.networkAddress}/${s.cidr},${s.subnetMask},${s.firstHost},${s.lastHost},${s.broadcastAddress},"${s.assignedDevices.map(id => `${id} (${devices[id]?.ipAddress || 'N/A'})`).join(" | ")}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subnet_results.csv";
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("addTextBtn").addEventListener("click", () => {
    const textbox = document.createElement("div");
    textbox.className = "custom-textbox";
    textbox.contentEditable = true;
    textbox.innerText = "Double-click to edit";
    textbox.style.left = "100px";
    textbox.style.top = "100px";
    textbox.style.position = "absolute";
    canvas.appendChild(textbox);
    makeDraggable(textbox);
});

canvas.addEventListener('drop', e => {
    e.preventDefault();

    const type = e.dataTransfer.getData('type');
    const icon = e.dataTransfer.getData('icon');

    // If there's no icon or type, it's a drag *within* canvas, so skip
    if (!type || !icon) return;

    const node = document.createElement('img');
    node.src = icon;
    node.className = 'draggable';
    node.style.position = 'absolute';
    const canvasRect = canvas.getBoundingClientRect();
    node.style.left = `${e.clientX - canvasRect.left - 30}px`;
    node.style.top = `${e.clientY - canvasRect.top - 30}px`;
    const id = `device_${deviceCounter++}`;
    node.dataset.id = id;
    node.dataset.type = type;

    const label = document.createElement('div');
    label.innerText = `${type} (${id})`;
    label.contentEditable = true;
    label.title = "Click to rename";
    label.style.position = 'absolute';
    label.style.left = node.style.left;
    label.style.top = (parseInt(node.style.top) + 60) + 'px';
    label.style.fontSize = '10px';
    label.style.color = '#333';

    label.addEventListener('click', () => {
        if (deleteMode) label.remove();
    });

    canvas.appendChild(node);
    canvas.appendChild(label);

    devices[id] = {
        id,
        type,
        element: node,
        labelElement: label,
        connections: [],
        ipAddress: null,
        ipAddressElement: null
    };

    makeDraggable(node, label, devices[id]);
});


