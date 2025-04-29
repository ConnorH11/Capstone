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
let subnetResults = [];  // Store results for CSV export

document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
    cableStatus.style.display = "none";
});

document.querySelectorAll('.draggable').forEach(icon => {
    icon.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', icon.dataset.type);
        e.dataTransfer.setData('icon', icon.src);
    });
});

canvas.addEventListener('dragover', e => e.preventDefault());

function makeDraggable(el, label) {
    let offsetX, offsetY;

    el.onmousedown = function (e) {
        if (e.button !== 0) return;
        const canvasRect = canvas.getBoundingClientRect();
        offsetX = e.clientX - el.offsetLeft - canvasRect.left;
        offsetY = e.clientY - el.offsetTop - canvasRect.top;

        document.onmousemove = function (eMove) {
            el.style.left = `${eMove.clientX - offsetX}px`;
            el.style.top = `${eMove.clientY - offsetY}px`;
            if (label) {
                label.style.left = el.style.left;
                label.style.top = (parseInt(el.style.top) + 60) + 'px';
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
            if (label) label.remove();
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
    line.setAttribute("stroke", "#007bff");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
    updateLinePosition(fromEl, toEl, line);

    const fromId = fromEl.dataset.id;
    const toId = toEl.dataset.id;
    if (devices[fromId] && devices[toId]) {
        devices[fromId].connections.push(toId);
        devices[toId].connections.push(fromId);
    }
    connections.push({ from: fromEl, to: toEl, line: line });
}

function buildNetworkGroups() {
    const visited = new Set();
    const networks = [];
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
    device.connections.forEach(connId => traverseNetwork(connId, visited, network));
}

function autoSubnet(baseCidrStr, groups) {
    const [baseIpStr, cidrStr] = baseCidrStr.split('/');
    const baseIp = ipToUint(baseIpStr);
    let nextIp = baseIp;
    subnetResults = [];

    groups.forEach(group => {
        const routers = group.filter(id => devices[id].type.toLowerCase() === "router").length;
        const requiredHosts = routers === 2 ? 2 : group.length + 2;
        let bits = 0;
        while ((Math.pow(2, bits) - 2) < requiredHosts) bits++;
        const cidr = 32 - bits;
        const blockSize = Math.pow(2, bits);
        const subnet = {
            networkAddress: uintToIp(nextIp),
            cidr,
            subnetMask: cidrToMask(cidr),
            firstHost: uintToIp(nextIp + 1),
            lastHost: uintToIp(nextIp + blockSize - 2),
            broadcastAddress: uintToIp(nextIp + blockSize - 1),
            assignedDevices: group.map(id => devices[id]?.labelElement?.innerText || id)
        };
        subnetResults.push(subnet);
        nextIp += blockSize;
    });
}

function ipToUint(ipStr) {
    return ipStr.split('.').reduce((acc, oct) => (acc << 8) + parseInt(octet), 0);
}
function uintToIp(uint) {
    return [(uint >>> 24) & 0xff, (uint >>> 16) & 0xff, (uint >>> 8) & 0xff, uint & 0xff].join('.');
}
function cidrToMask(cidr) {
    return uintToIp(cidr === 0 ? 0 : 0xffffffff << (32 - cidr));
}

document.getElementById("calculateBtn").addEventListener("click", () => {
    const baseNetwork = document.getElementById("baseIp").value.trim();
    if (!baseNetwork.includes("/")) {
        alert("Please enter a valid CIDR notation (e.g., 192.168.1.0/24)");
        return;
    }

    const groups = buildNetworkGroups();
    autoSubnet(baseNetwork, groups);

    const tableWrapper = document.getElementById("subnetResults");
    const tableBody = document.getElementById("resultsBody");

    if (!tableWrapper || !tableBody) {
        alert("Missing results table elements in HTML.");
        return;
    }

    tableBody.innerHTML = "";
    subnetResults.forEach(subnet => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${subnet.networkAddress}/${subnet.cidr}</td>
            <td>${subnet.subnetMask}</td>
            <td>${subnet.firstHost}</td>
            <td>${subnet.lastHost}</td>
            <td>${subnet.broadcastAddress}</td>
            <td>${subnet.assignedDevices.join(", ")}</td>
        `;
        tableBody.appendChild(row);
    });

    tableWrapper.style.display = "block";
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
    let csv = "Network Address/CIDR,Subnet Mask,First Host,Last Host,Broadcast,Assigned Devices\n";
    subnetResults.forEach(s => {
        csv += `${s.networkAddress}/${s.cidr},${s.subnetMask},${s.firstHost},${s.lastHost},${s.broadcastAddress},"${s.assignedDevices.join(" | ")}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subnet_results.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    // Calculate the drop position to center the element
    node.style.left = `${e.clientX - canvasRect.left - 30}px`; // 30px is half the width of the element
    node.style.top = `${e.clientY - canvasRect.top - 30}px`;  // 30px is half the height
    const id = `device_${deviceCounter++}`;
    node.dataset.id = id;
    node.dataset.type = type;

    const label = document.createElement('div');
    label.innerText = `${type} (${id})`;
    label.style.position = 'absolute';
    label.style.left = node.style.left;
    label.style.top = (parseInt(node.style.top) + 60) + 'px';
    label.style.fontSize = '10px';
    label.style.color = '#333';

    canvas.appendChild(node);
    canvas.appendChild(label);
    devices[id] = { id, type, element: node, labelElement: label, connections: [] };
    makeDraggable(node, label);
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