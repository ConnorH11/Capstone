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

// Toggle delete mode
document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
    cableStatus.style.display = "none";
});

// Allow drag from toolbox
document.querySelectorAll('.draggable').forEach(icon => {
    icon.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', icon.dataset.type);
        e.dataTransfer.setData('icon', icon.src);
    });
});

canvas.addEventListener('dragover', e => e.preventDefault());

canvas.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const icon = e.dataTransfer.getData('icon');
    const node = document.createElement('img');
    node.src = icon;
    node.className = 'draggable';
    node.style.position = 'absolute';

    const canvasRect = canvas.getBoundingClientRect();
    node.style.left = `${e.clientX - canvasRect.left - 30}px`;
    node.style.top = `${e.clientY - canvasRect.top - 30}px`;

    canvas.appendChild(node);
    makeDraggable(node);
});

// Enable dragging and deleting
function makeDraggable(el, label) {
    let offsetX, offsetY;

    el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        const canvasRect = canvas.getBoundingClientRect();
        offsetX = e.clientX - el.offsetLeft - canvasRect.left;
        offsetY = e.clientY - el.offsetTop - canvasRect.top;

        document.onmousemove = function (eMove) {
            el.style.left = `${eMove.clientX - canvasRect.left - offsetX}px`;
            el.style.top = `${eMove.clientY - canvasRect.top - offsetY}px`;

            if (label) {
                label.style.left = el.style.left;
                label.style.top = (parseInt(el.style.top) + 60) + 'px';
            }

            // Update cable lines
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
    });

    el.addEventListener('click', function () {
        if (deleteMode) {
            // Delete connections
            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].from === el || connections[i].to === el) {
                    connections[i].line.remove();
                    connections.splice(i, 1);
                }
            }
            // Remove the icon and label
            if (label) label.remove();
            el.remove();
        }
    });
}




cableBtn.addEventListener("click", () => {
    cableMode = !cableMode;
    deleteMode = false; // Turn off delete mode when cable mode active
    cableStart = null;
    canvas.style.cursor = cableMode ? "crosshair" : "default";

    cableStatus.style.display = cableMode ? "inline" : "none";
    deleteStatus.style.display = "none";
});

canvas.addEventListener('click', function (e) {
    if (!cableMode) return;
    if (!e.target.classList.contains('draggable')) return;

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


// Line reposition helper
function updateLinePosition(fromEl, toEl, line) {
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
    const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
    const y2 = toRect.top + toRect.height / 2 - canvasRect.top;

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
}

function drawSvgLine(fromEl, toEl) {
    const svg = document.getElementById("connectionLayer");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "#007bff");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    updateLinePosition(fromEl, toEl, line);

    // Save connection into devices
    const fromId = fromEl.dataset.id;
    const toId = toEl.dataset.id;

    if (devices[fromId] && devices[toId]) {
        devices[fromId].connections.push(toId);
        devices[toId].connections.push(fromId);
    }

    connections.push({
        from: fromEl,
        to: toEl,
        line: line
    });
}

function buildNetworkGroups() {
    const visited = new Set();
    const networks = [];

    // Find all routers
    const routers = Object.values(devices).filter(d => d.type.toLowerCase() === 'router');

    routers.forEach(router => {
        router.connections.forEach(connId => {
            if (!visited.has(connId)) {
                const network = [router.id];
                traverseNetwork(connId, visited, network);
                networks.push(network);
            }
        });
    });

    return networks;
}

function traverseNetwork(deviceId, visited, network) {
    if (visited.has(deviceId)) return;
    visited.add(deviceId);
    network.push(deviceId);

    const device = devices[deviceId];
    if (!device) return;

    device.connections.forEach(connId => {
        traverseNetwork(connId, visited, network);
    });
}

function autoSubnet(baseNetworkCidr, networks) {
    const [baseIpStr, baseCidrStr] = baseNetworkCidr.split('/');
    const baseIp = ipToUint(baseIpStr);
    const baseCidr = parseInt(baseCidrStr);

    const subnets = [];
    let nextIp = baseIp;

    networks.forEach(network => {
        const deviceCount = network.length;
        const neededHosts = deviceCount + 2; // +2 for network and broadcast addresses

        // Find minimum subnet size
        let bits = 0;
        while ((Math.pow(2, bits) - 2) < neededHosts) bits++;
        const cidr = 32 - bits;
        const blockSize = Math.pow(2, bits);

        const networkAddress = uintToIp(nextIp);
        const broadcastAddress = uintToIp(nextIp + blockSize - 1);
        const firstHost = uintToIp(nextIp + 1);
        const lastHost = uintToIp(nextIp + blockSize - 2);

        subnets.push({
            networkAddress,
            cidr,
            subnetMask: cidrToMask(cidr),
            firstHost,
            lastHost,
            broadcastAddress,
            assignedDevices: network.map(id => devices[id]?.labelElement?.innerText || id)
        });

        nextIp += blockSize;
    });

    return subnets;
}

function ipToUint(ipStr) {
    return ipStr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
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


document.getElementById("calculateBtn").addEventListener("click", () => {
    const baseNetwork = document.getElementById("baseIp").value;
    if (!baseNetwork) {
        alert("Please input a base network (e.g. 192.168.0.0/24)");
        return;
    }

    const groups = buildNetworkGroups();
    const results = autoSubnet(baseNetwork, groups);

    console.log("Subnetting Results:", results);
    results.forEach((subnet, index) => {
        const assignedDeviceIds = subnet.assignedDevices;

        // Get device elements from IDs
        const elements = assignedDeviceIds.map(label => {
            // Reverse lookup devices by label text (temporary for now)
            return Object.values(devices).find(dev => dev.labelElement.innerText === label)?.element;
        }).filter(Boolean);

        if (elements.length === 0) return; // Skip if no devices

        // Find center position
        let avgX = 0, avgY = 0;
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            avgX += rect.left + rect.width / 2;
            avgY += rect.top + rect.height / 2;
        });
        avgX /= elements.length;
        avgY /= elements.length;

        const canvasRect = canvas.getBoundingClientRect();

        // Create label
        const label = document.createElement("div");
        label.className = "subnet-label";
        label.style.position = "absolute";
        label.style.left = `${avgX - canvasRect.left}px`;
        label.style.top = `${avgY - canvasRect.top}px`;
        label.style.padding = "5px 8px";
        label.style.background = "#e7f3ff";
        label.style.border = "1px solid #007bff";
        label.style.fontSize = "12px";
        label.style.borderRadius = "8px";
        label.style.zIndex = "3";
        label.style.pointerEvents = "none";

        label.innerHTML = `
        <strong>${subnet.networkAddress}/${subnet.cidr}</strong><br/>
        Mask: ${subnet.subnetMask}<br/>
        Hosts: ${subnet.firstHost} - ${subnet.lastHost}
    `;

        canvas.appendChild(label);
    });


    // Later: we'll show results on canvas nicely!
});

document.getElementById("addTextBtn").addEventListener("click", () => {
    const textbox = document.createElement("div");
    textbox.className = "custom-textbox";
    textbox.contentEditable = true;
    textbox.innerText = "Double-click to edit";

    // Default position
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

    const node = document.createElement('img');
    node.src = icon;
    node.className = 'draggable';
    node.style.position = 'absolute';

    const canvasRect = canvas.getBoundingClientRect();
    node.style.left = `${e.clientX - canvasRect.left - 30}px`;
    node.style.top = `${e.clientY - canvasRect.top - 30}px`;

    // Assign a unique ID and label
    const deviceId = `device_${deviceCounter++}`;
    node.dataset.id = deviceId;
    node.dataset.type = type;  // save the type to dataset too

    // Add a small label under the icon
    const label = document.createElement('div');
    label.innerText = `${type} (${deviceId})`;
    label.style.position = 'absolute';
    label.style.left = node.style.left;
    label.style.top = (parseInt(node.style.top) + 60) + 'px'; // offset below the image
    label.style.fontSize = '10px';
    label.style.color = '#333';

    canvas.appendChild(node);
    canvas.appendChild(label);

    devices[deviceId] = {
        id: deviceId,
        type: type,
        element: node,
        labelElement: label,
        connections: []
    };

    makeDraggable(node, label);
});