// visualizer.js
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

document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;
    cableMode = false;
    cableStart = null;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
    cableStatus.style.display = "none";
    Object.values(devices).forEach(dev => {
        if (dev.element) dev.element.style.outline = 'none';
    });
});

document.getElementById("clearCanvasBtn").addEventListener("click", () => {
    Object.values(devices).forEach(device => {
        if (device.element) device.element.remove();
        if (device.labelElement) device.labelElement.remove();
        if (device.ipAddressElement) device.ipAddressElement.remove();
        if (device.interfaceLabels) {
            Object.values(device.interfaceLabels).forEach(label => label.remove());
        }
    });

    const svg = document.getElementById("connectionLayer");
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }

    document.querySelectorAll(".subnet-outline").forEach(outline => {
        outline.remove();
    });
    document.querySelectorAll(".custom-textbox").forEach(tb => tb.remove());

    Object.keys(devices).forEach(k => delete devices[k]);
    connections.length = 0;
    deviceCounter = 0;
    subnetResults.length = 0;
    deleteMode = false;
    cableMode = false;
    canvas.style.cursor = "default";
    deleteStatus.style.display = "none";
    cableStatus.style.display = "none";

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
    const isTextbox = el.classList.contains('custom-textbox');


    el.onmousedown = function (e) {
        if (e.button !== 0 || cableMode || (deleteMode && !isTextbox)) return;
        if (deleteMode && isTextbox) {
        } else if (deleteMode) {
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        offsetX = e.clientX - elRect.left;
        offsetY = e.clientY - elRect.top;

        document.onmousemove = function (eMove) {
            let newX = eMove.clientX - canvasRect.left - offsetX;
            let newY = eMove.clientY - canvasRect.top - offsetY;

            const elWidth = parseInt(el.style.width) || elRect.width;
            const elHeight = parseInt(el.style.height) || elRect.height;

            newX = Math.max(0, Math.min(newX, canvasRect.width - elWidth));
            newY = Math.max(0, Math.min(newY, canvasRect.height - elHeight));

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;

            if (label && device) {
                const iconWidth = parseInt(device.element.style.width) || 50;
                const iconHeight = parseInt(device.element.style.height) || 50;
                const labelWidth = parseInt(label.style.width) || 80;
                const labelHeight = parseInt(label.style.height) || 15;

                label.style.left = `${newX + (iconWidth / 2) - (labelWidth / 2)}px`;
                label.style.top = `${newY + iconHeight + 5}px`;

                if (device.ipAddressElement) {
                    const ipDisplayWidth = parseInt(device.ipAddressElement.offsetWidth);
                    device.ipAddressElement.style.left = `${newX + (iconWidth / 2) - (ipDisplayWidth / 2)}px`;
                    device.ipAddressElement.style.top = `${newY + iconHeight + labelHeight + 10}px`;
                }
            }

            if (device?.interfaceLabels) {
                Object.entries(device.interfaceLabels).forEach(([key, interfaceLabel]) => {
                    let peerElement = null;
                    if (key.startsWith('subnet_')) {
                        positionLabelNearDevice(device.element, interfaceLabel, 'gateway', null);
                    } else {
                        peerElement = devices[key]?.element;
                        if (peerElement) {
                            positionLabelNearDevice(el, interfaceLabel, 'left', peerElement);
                        }
                    }
                });
            }
            connections.forEach(conn => {
                if (conn.from === el && conn.toDevice?.interfaceLabels?.[device.id]) {
                    positionLabelNearDevice(conn.to, conn.toDevice.interfaceLabels[device.id], 'right', el);
                }
                if (conn.to === el && conn.fromDevice?.interfaceLabels?.[device.id]) {
                    positionLabelNearDevice(conn.from, conn.fromDevice.interfaceLabels[device.id], 'left', el);
                }
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

    el.onclick = function (e) {
        if (isTextbox) return;

        if (deleteMode) {
            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].from === el || connections[i].to === el) {
                    const conn = connections[i];
                    const fromId = conn.fromDevice?.id;
                    const toId = conn.toDevice?.id;
                    if (fromId && devices[fromId]?.interfaceLabels?.[toId]) { devices[fromId].interfaceLabels[toId].remove(); delete devices[fromId].interfaceLabels[toId]; if (devices[fromId].interfaceIPs) delete devices[fromId].interfaceIPs[toId]; }
                    if (toId && devices[toId]?.interfaceLabels?.[fromId]) { devices[toId].interfaceLabels[fromId].remove(); delete devices[toId].interfaceLabels[fromId]; if (devices[toId].interfaceIPs) delete devices[toId].interfaceIPs[fromId]; }
                    conn.line.remove(); connections.splice(i, 1);
                }
            }
            if (label) label.remove();
            const deviceId = el.dataset.id;
            if (deviceId && devices[deviceId]) {
                const currentDevice = devices[deviceId];
                if (currentDevice.ipAddressElement) currentDevice.ipAddressElement.remove();
                if (currentDevice.interfaceLabels) { Object.values(currentDevice.interfaceLabels).forEach(ifLabel => ifLabel.remove()); }
                Object.values(devices).forEach(d => { if (d.connections) d.connections = d.connections.filter(id => id !== deviceId); if (d.interfaceIPs) delete d.interfaceIPs[deviceId]; if (d.interfaceLabels && d.interfaceLabels[deviceId]) { d.interfaceLabels[deviceId].remove(); delete d.interfaceLabels[deviceId]; } });
                delete devices[deviceId];
            }
            el.remove();
            e.stopPropagation();
            return;
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
    Object.values(devices).forEach(dev => {
        if (dev.element) dev.element.style.outline = 'none';
    });
});

canvas.addEventListener('click', function (e) {
    if (cableMode && e.target.classList.contains('draggable-device')) {
        const clickedDeviceElement = e.target;
        if (!cableStart) {
            cableStart = clickedDeviceElement;
            clickedDeviceElement.style.outline = '2px dashed green';
        } else {
            if (cableStart === clickedDeviceElement) { cableStart.style.outline = 'none'; cableStart = null; return; }
            if (cableStart.dataset.id === clickedDeviceElement.dataset.id) { alert("Cannot connect a device to itself."); return; }
            const alreadyConnected = connections.some(conn => (conn.from === cableStart && conn.to === clickedDeviceElement) || (conn.from === clickedDeviceElement && conn.to === cableStart));
            if (alreadyConnected) { alert("These devices are already connected."); cableStart.style.outline = 'none'; cableStart = null; return; }
            drawSvgLine(cableStart, clickedDeviceElement);
            cableStart.style.outline = 'none';
            clickedDeviceElement.style.outline = 'none';
            cableStart = null;
        }
    } else if (cableMode && !e.target.classList.contains('draggable-device')) {
        if (cableStart) { cableStart.style.outline = 'none'; cableStart = null; }
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
    line.setAttribute("pointer-events", "stroke");
    line.style.cursor = "pointer";
    updateLinePosition(fromEl, toEl, line);
    const fromId = fromEl.dataset.id; const toId = toEl.dataset.id;
    const fromDevice = devices[fromId]; const toDevice = devices[toId];
    connections.push({ from: fromEl, to: toEl, line: line, fromDevice, toDevice });
    if (fromDevice && toDevice) { fromDevice.connections.push(toId); toDevice.connections.push(fromId); }
    line.addEventListener("click", function (e) {
        if (deleteMode) {
            svg.removeChild(line);
            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].line === line) {
                    const conn = connections[i];
                    if (conn.fromDevice?.interfaceIPs?.[conn.toDevice?.id]) delete conn.fromDevice.interfaceIPs[conn.toDevice.id];
                    if (conn.fromDevice?.interfaceLabels?.[conn.toDevice?.id]) { conn.fromDevice.interfaceLabels[conn.toDevice.id].remove(); delete conn.fromDevice.interfaceLabels[conn.toDevice.id]; }
                    if (conn.toDevice?.interfaceIPs?.[conn.fromDevice?.id]) delete conn.toDevice.interfaceIPs[conn.fromDevice.id];
                    if (conn.toDevice?.interfaceLabels?.[conn.fromDevice?.id]) { conn.toDevice.interfaceLabels[conn.fromDevice.id].remove(); delete conn.toDevice.interfaceLabels[conn.fromDevice.id]; }
                    if (conn.fromDevice) conn.fromDevice.connections = conn.fromDevice.connections.filter(id => id !== conn.toDevice?.id);
                    if (conn.toDevice) conn.toDevice.connections = conn.toDevice.connections.filter(id => id !== conn.fromDevice?.id);
                    connections.splice(i, 1); break;
                }
            }
            e.stopPropagation();
        }
    });
    svg.appendChild(line);
}

function positionLabelNearDevice(deviceEl, labelEl, side = 'left', relatedEl = null) {
    const deviceRect = deviceEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    labelEl.style.width = "";
    const labelRect = labelEl.getBoundingClientRect();
    let targetX, targetY;

    if (relatedEl) {
        const relatedRect = relatedEl.getBoundingClientRect();
        const vecX = (relatedRect.left + relatedRect.width / 2) - (deviceRect.left + deviceRect.width / 2);
        const vecY = (relatedRect.top + relatedRect.height / 2) - (deviceRect.top + deviceRect.height / 2);
        const dist = Math.sqrt(vecX * vecX + vecY * vecY) || 1;
        const offsetFactor = 0.25;
        const labelPosX = (deviceRect.left + deviceRect.width / 2) + vecX * offsetFactor;
        const labelPosY = (deviceRect.top + deviceRect.height / 2) + vecY * offsetFactor;
        const perpOffsetX = (side === 'left' ? -vecY / dist * 15 : vecY / dist * 15);
        const perpOffsetY = (side === 'left' ? vecX / dist * 15 : -vecX / dist * 15);
        targetX = labelPosX + perpOffsetX - canvasRect.left - (labelRect.width / 2);
        targetY = labelPosY + perpOffsetY - canvasRect.top - (labelRect.height / 2);
    } else if (side === 'gateway') {
        targetX = (deviceRect.left + deviceRect.width / 2 - canvasRect.left) - (labelRect.width / 2);
        targetY = (deviceRect.top - canvasRect.top) - labelRect.height - 5;
    } else {
        targetX = (deviceRect.left - canvasRect.left);
        targetY = (deviceRect.top - canvasRect.top + deviceRect.height + 5);
    }
    labelEl.style.position = 'absolute';
    labelEl.style.left = `${targetX}px`;
    labelEl.style.top = `${targetY}px`;
    labelEl.style.fontSize = '10px';
    labelEl.style.background = side === 'gateway' ? '#d1ecf1' : '#fff';
    labelEl.style.color = side === 'gateway' ? '#0c5460' : '#000';
    labelEl.style.padding = '1px 4px';
    labelEl.style.borderRadius = '4px';
    labelEl.style.zIndex = '10';
    labelEl.style.border = '1px solid #ccc';
}

function ipToUint(ipStr) { const parts = ipStr.split('.'); let result = 0; for (let i = 0; i < parts.length; i++) { const num = parseInt(parts[i], 10); if (isNaN(num) || num < 0 || num > 255) { console.error(`Invalid IP segment: ${parts[i]} in ${ipStr}`); throw new Error(`Invalid IP segment: ${parts[i]}`); } result = (result << 8) + num; } return result >>> 0; }
function uintToIp(uint) { return [(uint >>> 24) & 0xff, (uint >>> 16) & 0xff, (uint >>> 8) & 0xff, uint & 0xff].join('.'); }
function cidrToMask(cidr) { if (cidr === 0) return "0.0.0.0"; return uintToIp(0xffffffff << (32 - cidr)); }
function isValidIPAddress(ip) { if (!ip) return false; const parts = ip.split('.'); if (parts.length !== 4) return false; for (const part of parts) { const num = parseInt(part, 10); if (isNaN(num) || num < 0 || num > 255) return false; } return true; }
function isValidCIDR(cidr) { const num = parseInt(cidr, 10); return !isNaN(num) && num >= 0 && num <= 32; }

// MODIFIED: To allow switches to get IPs
function assignIPAddresses(groupDeviceIds, subnetInfo) {
    const { firstHostUint, lastHostUint, cidr, networkAddress } = subnetInfo;
    let currentIpUint = firstHostUint;
    const groupDevicesObjects = groupDeviceIds.map(id => devices[id]).filter(Boolean);
    const routersInGroup = groupDevicesObjects.filter(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');

    // End devices AND SWITCHES that are not routers/L3s
    const endDevicesAndSwitchesInGroup = groupDevicesObjects.filter(d =>
        d.type.toLowerCase() !== 'router' && d.type.toLowerCase() !== 'l3switch'
    );

    if (routersInGroup.length === 2 && endDevicesAndSwitchesInGroup.length === 0 && cidr === 30) { // Strict P2P Router link
        const router1 = routersInGroup[0]; const router2 = routersInGroup[1];
        if (currentIpUint <= lastHostUint) { router1.interfaceIPs = router1.interfaceIPs || {}; router1.interfaceIPs[router2.id] = uintToIp(currentIpUint++); }
        if (currentIpUint <= lastHostUint) { router2.interfaceIPs = router2.interfaceIPs || {}; router2.interfaceIPs[router1.id] = uintToIp(currentIpUint++); }
    } else if (routersInGroup.length === 1) { // Router is gateway for a mixed segment
        const router = routersInGroup[0];
        if (currentIpUint <= lastHostUint) { router.interfaceIPs = router.interfaceIPs || {}; router.interfaceIPs[`subnet_${networkAddress}`] = uintToIp(currentIpUint++); }
        // Assign to PCs, Servers, AND SWITCHES
        endDevicesAndSwitchesInGroup.forEach(device => {
            if (currentIpUint <= lastHostUint) { device.ipAddress = uintToIp(currentIpUint++); }
        });
    } else if (routersInGroup.length === 0 && endDevicesAndSwitchesInGroup.length > 0) { // Segment with no router (e.g. just PCs and Switches)
        endDevicesAndSwitchesInGroup.forEach(device => {
            if (currentIpUint <= lastHostUint) { device.ipAddress = uintToIp(currentIpUint++); }
        });
    }
    // Note: More complex scenarios with multiple routers in one non-P2P segment are not explicitly handled here for IP role distribution.
}

// MODIFIED: To count switches as IP consumers
function autoSubnet(baseCidrStr, groups) {
    const [baseIpStr, cidrStr] = baseCidrStr.split('/');
    if (!isValidIPAddress(baseIpStr) || !isValidCIDR(cidrStr)) { alert("Invalid IP address or CIDR prefix."); return; }
    const baseIpUint = ipToUint(baseIpStr);
    const baseCidr = parseInt(cidrStr, 10);
    let nextNetworkIpUint = baseIpUint;
    subnetResults = [];

    Object.values(devices).forEach(dev => {
        dev.ipAddress = null; if (dev.ipAddressElement) { dev.ipAddressElement.remove(); dev.ipAddressElement = null; }
        dev.interfaceIPs = {}; if (dev.interfaceLabels) { Object.values(dev.interfaceLabels).forEach(lbl => lbl.remove()); dev.interfaceLabels = {}; }
        if (dev.element) { dev.element.style.backgroundColor = ''; dev.element.style.border = ''; }
    });
    document.querySelectorAll(".subnet-outline").forEach(outline => { outline.remove(); });

    groups.sort((a, b) => {
        const aDevs = a.map(id => devices[id]).filter(Boolean);
        const bDevs = b.map(id => devices[id]).filter(Boolean);
        const aIsP2P = aDevs.length === 2 && aDevs.every(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
        const bIsP2P = bDevs.length === 2 && bDevs.every(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
        if (aIsP2P && !bIsP2P) return -1;
        if (!aIsP2P && bIsP2P) return 1;
        // Switches now count toward host requirement for sorting
        const hostsA = aDevs.length + (aDevs.some(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch') && aDevs.length > 0 ? 1 : 0) - (aIsP2P ? 1 : 0);
        const hostsB = bDevs.length + (bDevs.some(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch') && bDevs.length > 0 ? 1 : 0) - (bIsP2P ? 1 : 0);
        return hostsB - hostsA;
    });

    let allocationSuccessful = true;
    groups.forEach((groupDeviceIds, index) => {
        if (!allocationSuccessful) return;
        const groupDevices = groupDeviceIds.map(id => devices[id]).filter(Boolean); if (groupDevices.length === 0) return;
        const routersInGroup = groupDevices.filter(d => d.type.toLowerCase() === 'router' || d.type.toLowerCase() === 'l3switch');
        const ipConsumingDevicesInGroup = groupDevices; // All devices in the group are potential IP consumers

        let subnetCidr, neededHostIPs;

        if (routersInGroup.length === 2 && ipConsumingDevicesInGroup.length === 2) { // Strict P2P Router link
            subnetCidr = 30; neededHostIPs = 2;
        } else {
            neededHostIPs = 0;
            // If there's a router, it takes one IP for its interface in this subnet
            if (routersInGroup.length >= 1) { neededHostIPs += 1; }

            // Other devices (PCs, Servers, AND SWITCHES) take one IP each
            neededHostIPs += ipConsumingDevicesInGroup.filter(d =>
                d.type.toLowerCase() !== 'router' && d.type.toLowerCase() !== 'l3switch' // Exclude routers already counted for gateway role
            ).length;

            if (neededHostIPs === 0 && ipConsumingDevicesInGroup.length > 0) {
                neededHostIPs = ipConsumingDevicesInGroup.length; // Case: only end-devices (like switches alone), no router in this specific group.
            } else if (neededHostIPs === 0) { // Empty group or no IP consumers
                return;
            }

            if (neededHostIPs === 1) neededHostIPs = 2; // Minimum 2 assignable IPs for a subnet (/30)

            let hostBits = 0; while ((Math.pow(2, hostBits) - 2) < neededHostIPs) { hostBits++; }
            subnetCidr = 32 - hostBits; if (subnetCidr < 0) subnetCidr = 0; // Safety for extremely large neededHosts
        }

        const hostBitsForBlock = 32 - subnetCidr; const blockSize = Math.pow(2, hostBitsForBlock);
        if ((nextNetworkIpUint & (blockSize - 1)) !== 0) { nextNetworkIpUint = (nextNetworkIpUint + blockSize) & (~(blockSize - 1)); }
        const currentNetworkAddressUint = nextNetworkIpUint;
        const firstHostUint = currentNetworkAddressUint + 1; const lastHostUint = currentNetworkAddressUint + blockSize - 2;
        const broadcastAddressUint = currentNetworkAddressUint + blockSize - 1;

        if (broadcastAddressUint >= (baseIpUint + Math.pow(2, 32 - baseCidr))) {
            alert(`Not enough IP addresses remaining. Cannot allocate for subnet ${index + 1}.`);
            subnetResults = []; allocationSuccessful = false; return;
        }
        if (lastHostUint < firstHostUint && subnetCidr < 31) { // /31 and /32 are special, allow them. General subnets need space.
            nextNetworkIpUint += blockSize; return;
        }

        const subnetInfo = {
            networkAddress: uintToIp(currentNetworkAddressUint), cidr: subnetCidr, subnetMask: cidrToMask(subnetCidr),
            firstHost: uintToIp(firstHostUint), lastHost: uintToIp(lastHostUint), broadcastAddress: uintToIp(broadcastAddressUint),
            deviceIdsInSubnet: [...groupDeviceIds], color: getRandomColor(),
            networkAddressUint: currentNetworkAddressUint, firstHostUint, lastHostUint
        };
        subnetInfo.assignedDevicesDisplay = groupDeviceIds.map(id => devices[id]?.customName || devices[id]?.labelElement?.innerText || id);
        subnetResults.push(subnetInfo);
        assignIPAddresses(groupDeviceIds, subnetInfo);
        nextNetworkIpUint += blockSize;
    });

    if (!allocationSuccessful) {
        document.getElementById("resultsBody").innerHTML = "";
        document.getElementById("subnetResults").style.display = "none";
        document.querySelectorAll(".subnet-outline").forEach(outline => { outline.remove(); });
    }
}

function renderInterfaceLabels() {
    Object.values(devices).forEach(device => {
        const isValidType = ['router', 'l3switch'].includes(device.type.toLowerCase());
        if (device.interfaceLabels) {
            Object.keys(device.interfaceLabels).forEach(key => {
                if (!isValidType || !device.interfaceIPs || !device.interfaceIPs[key]) {
                    device.interfaceLabels[key].remove(); delete device.interfaceLabels[key];
                }
            });
        }
        if (!isValidType || !device.interfaceIPs) return;
        if (!device.interfaceLabels) device.interfaceLabels = {};
        Object.entries(device.interfaceIPs).forEach(([key, ip]) => {
            let peerDevice = null; let labelSide = 'left'; let isGatewayLabel = false;
            if (key.startsWith('subnet_')) { isGatewayLabel = true; labelSide = 'gateway'; }
            else { peerDevice = devices[key]; if (!peerDevice) { if (device.interfaceLabels[key]) { device.interfaceLabels[key].remove(); delete device.interfaceLabels[key]; } return; } }
            let label = device.interfaceLabels[key];
            if (!label) { label = document.createElement('div'); label.className = "interface-ip-label"; if (isGatewayLabel) label.classList.add("gateway-ip-label"); canvas.appendChild(label); device.interfaceLabels[key] = label; }
            label.innerText = ip;
            if (isGatewayLabel) { positionLabelNearDevice(device.element, label, 'gateway', null); }
            else if (peerDevice) { positionLabelNearDevice(device.element, label, 'left', peerDevice.element); }
        });
    });
}

function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }

// MODIFIED: getSubnetsFromRouterInterfaces to consider any isolated group if devices exist
function getSubnetsFromRouterInterfaces() {
    const subnets = []; const visitedDevicesForGrouping = new Set();
    // 1. Router-to-Router links (same as before)
    Object.values(devices).forEach(device => {
        if (device.type.toLowerCase() !== 'router' && device.type.toLowerCase() !== 'l3switch') return;
        device.connections.forEach(peerId => {
            const peer = devices[peerId];
            if (peer && (peer.type.toLowerCase() === 'router' || peer.type.toLowerCase() === 'l3switch')) {
                const pairKey = [device.id, peerId].sort().join('-');
                if (!subnets.some(s => s.length === 2 && [s[0], s[1]].sort().join('-') === pairKey)) {
                    subnets.push([device.id, peerId]); visitedDevicesForGrouping.add(device.id); visitedDevicesForGrouping.add(peerId);
                }
            }
        });
    });
    // 2. Router to LAN segments (same as before, switches are part of these segments naturally)
    Object.values(devices).forEach(routerDevice => {
        if (routerDevice.type.toLowerCase() !== 'router' && routerDevice.type.toLowerCase() !== 'l3switch') return;
        routerDevice.connections.forEach(directPeerId => {
            const directPeer = devices[directPeerId];
            if (!directPeer || directPeer.type.toLowerCase() === 'router' || directPeer.type.toLowerCase() === 'l3switch') return;
            const currentSegment = new Set([routerDevice.id]); const queue = [directPeerId];
            const visitedInThisSegmentSearch = new Set([routerDevice.id, directPeerId]);

            if (visitedDevicesForGrouping.has(directPeerId) && subnets.some(s => s.includes(directPeerId) && s.includes(routerDevice.id) && s.length > 2)) { return; }
            else if (visitedDevicesForGrouping.has(directPeerId) && !subnets.flat().includes(directPeerId)) { }
            else if (visitedDevicesForGrouping.has(directPeerId) && !subnets.some(s => s.length === 2 && s.includes(directPeerId) && s.includes(routerDevice.id))) { return; }

            currentSegment.add(directPeerId);
            while (queue.length > 0) {
                const currentDeviceId = queue.shift(); const currentDevice = devices[currentDeviceId];
                currentDevice.connections.forEach(neighborId => {
                    const neighbor = devices[neighborId];
                    if (neighbor && !visitedInThisSegmentSearch.has(neighborId) && (neighbor.type.toLowerCase() !== 'router' && neighbor.type.toLowerCase() !== 'l3switch')) {
                        let alreadyInAnotherLanSegment = false;
                        for (const sn of subnets) { if (sn.length > 2 && sn.includes(neighborId) && !sn.includes(routerDevice.id)) { alreadyInAnotherLanSegment = true; break; } }
                        if (alreadyInAnotherLanSegment) return;
                        visitedInThisSegmentSearch.add(neighborId); currentSegment.add(neighborId); queue.push(neighborId);
                    }
                });
            }
            const newSegmentArray = Array.from(currentSegment);
            const segmentExists = subnets.some(existingSn => existingSn.length === newSegmentArray.length && existingSn.every(id => newSegmentArray.includes(id)));
            if (!segmentExists && newSegmentArray.length > 1) {
                const isSubsetOfP2P = subnets.some(p2pSn => p2pSn.length === 2 && newSegmentArray.every(id => p2pSn.includes(id)) && p2pSn.every(id => newSegmentArray.includes(id)));
                if (!isSubsetOfP2P || newSegmentArray.length > 2) { subnets.push(newSegmentArray); newSegmentArray.forEach(id => visitedDevicesForGrouping.add(id)); }
            }
        });
    });
    // 3. Isolated groups (any remaining devices, including switches, can form a group)
    const allGroupedDevices = new Set(subnets.flat());
    Object.keys(devices).forEach(deviceId => {
        if (!allGroupedDevices.has(deviceId)) {
            // Removed the type check, any un-grouped device can start an isolated segment search
            const isolatedSegment = new Set(); const queue = [deviceId]; const visitedInIsolation = new Set();
            while (queue.length > 0) {
                const currentId = queue.shift();
                // Don't cross into router domains if accidentally hit (should be pre-grouped)
                if (visitedInIsolation.has(currentId) || (devices[currentId].type.toLowerCase() === 'router' || devices[currentId].type.toLowerCase() === 'l3switch')) continue;
                visitedInIsolation.add(currentId); isolatedSegment.add(currentId); allGroupedDevices.add(currentId);
                devices[currentId].connections.forEach(neighborId => {
                    if (!visitedInIsolation.has(neighborId) && !allGroupedDevices.has(neighborId)) { queue.push(neighborId); }
                });
            }
            if (isolatedSegment.size > 0) {
                // Any group of connected devices can now be considered a subnet segment.
                // autoSubnet will try to assign IPs. If it's just switches, they'll get IPs.
                subnets.push(Array.from(isolatedSegment));
            }
        }
    });
    return subnets;
}

// MODIFIED: calculateBtn display logic for switches
document.getElementById("calculateBtn").addEventListener("click", () => {
    const baseIpInput = document.getElementById("baseIp").value.trim();
    if (!baseIpInput.includes("/")) { alert("Enter a base network with CIDR (e.g., 192.168.0.0/24)"); return; }
    const groups = getSubnetsFromRouterInterfaces();

    if (groups.length === 0 && Object.keys(devices).length > 0) {
        const allDevices = Object.keys(devices); // Now all devices are IP consumers
        if (allDevices.length > 0) {
            alert("No distinct subnets detected by router logic. If this is a flat network, calculation will proceed by treating all devices as one segment. Add routers to define multiple segments.");
            groups.push(allDevices); // Treat all devices as one group if no routers define segments
        } else {
            alert("The canvas is empty. Add devices."); return;
        }
    } else if (groups.length === 0 && Object.keys(devices).length === 0) {
        alert("The canvas is empty. Add devices to calculate subnets."); return;
    }

    autoSubnet(baseIpInput, groups);
    const tableWrapper = document.getElementById("subnetResults");
    const tableBody = document.getElementById("resultsBody");
    tableBody.innerHTML = "";
    if (!subnetResults || subnetResults.length === 0) { tableWrapper.style.display = "none"; document.querySelectorAll(".subnet-outline").forEach(o => o.remove()); return; }

    subnetResults.forEach(subnet => {
        const row = document.createElement("tr"); row.style.borderLeft = `6px solid ${subnet.color}`;
        const assignedDevicesDisplay = subnet.deviceIdsInSubnet.map(deviceId => {
            const deviceObj = devices[deviceId];
            if (deviceObj) {
                let ipInfo = "";
                if (deviceObj.ipAddress) { ipInfo = deviceObj.ipAddress; }
                else if (deviceObj.interfaceIPs) {
                    if (deviceObj.interfaceIPs[`subnet_${subnet.networkAddress}`]) { ipInfo = deviceObj.interfaceIPs[`subnet_${subnet.networkAddress}`]; }
                    else if (subnet.deviceIdsInSubnet.length === 2) { const otherDeviceId = subnet.deviceIdsInSubnet.find(id => id !== deviceId); if (otherDeviceId && deviceObj.interfaceIPs[otherDeviceId]) { ipInfo = deviceObj.interfaceIPs[otherDeviceId]; } }
                }
                return `${deviceObj.customName || deviceObj.labelElement?.innerText || deviceObj.id}${ipInfo ? ` (${ipInfo})` : ''}`;
            } return deviceId;
        }).join(", ");
        row.innerHTML = `<td>${subnet.networkAddress}/${subnet.cidr}</td><td>${subnet.subnetMask}</td><td>${subnet.firstHost}</td><td>${subnet.lastHost}</td><td>${subnet.broadcastAddress}</td><td>${assignedDevicesDisplay}</td>`;
        tableBody.appendChild(row);

        const subnetDeviceElements = subnet.deviceIdsInSubnet.map(deviceId => devices[deviceId]?.element).filter(Boolean);
        if (subnetDeviceElements.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const canvasRect = canvas.getBoundingClientRect();
            subnetDeviceElements.forEach(deviceEl => {
                const rect = deviceEl.getBoundingClientRect();
                const left = rect.left - canvasRect.left; const top = rect.top - canvasRect.top;
                minX = Math.min(minX, left); minY = Math.min(minY, top);
                maxX = Math.max(maxX, left + rect.width); maxY = Math.max(maxY, top + rect.height);
            });
            const outline = document.createElement("div"); outline.className = "subnet-outline";
            outline.style.position = "absolute"; outline.style.border = `2px dashed ${subnet.color}`;
            outline.style.left = `${minX - 20}px`; outline.style.top = `${minY - 20}px`;
            outline.style.width = `${maxX - minX + 40}px`; outline.style.height = `${maxY - minY + 40}px`;
            outline.style.zIndex = "0"; outline.style.borderRadius = "10px";
            canvas.appendChild(outline);
        }
    });
    tableWrapper.style.display = "block";
    renderInterfaceLabels();

    // Update device visuals - switches are now treated like other IP-consuming devices
    Object.values(devices).forEach(device => {
        // Removed the specific 'if switch' block that cleared IP/border
        if (device.ipAddress && device.element) { // Check device.element exists
            if (!device.ipAddressElement) {
                device.ipAddressElement = document.createElement('div'); device.ipAddressElement.className = 'device-ip-display';
                device.ipAddressElement.style.position = 'absolute'; device.ipAddressElement.style.fontSize = '10px';
                device.ipAddressElement.style.color = '#000'; device.ipAddressElement.style.zIndex = "3";
                device.ipAddressElement.style.backgroundColor = "rgba(255,255,255,0.7)"; device.ipAddressElement.style.padding = "1px 4px";
                device.ipAddressElement.style.borderRadius = "4px"; canvas.appendChild(device.ipAddressElement);
            }
            device.ipAddressElement.innerText = device.ipAddress;
            const deviceRect = device.element.getBoundingClientRect(); const canvasRect = canvas.getBoundingClientRect();
            const mainLabelHeight = device.labelElement ? device.labelElement.offsetHeight : 15;
            const ipDisplayWidth = device.ipAddressElement.offsetWidth;
            const iconWidth = parseInt(device.element.style.width) || 50;
            device.ipAddressElement.style.left = (deviceRect.left - canvasRect.left + iconWidth / 2 - ipDisplayWidth / 2) + 'px';
            device.ipAddressElement.style.top = (deviceRect.top - canvasRect.top + (parseInt(device.element.style.height) || 50) + mainLabelHeight + 10) + 'px';
        } else if (device.ipAddressElement) { device.ipAddressElement.remove(); device.ipAddressElement = null; }

        const ownSubnet = subnetResults.find(s => s.deviceIdsInSubnet.includes(device.id));
        if (ownSubnet && device.element) { device.element.style.border = `2px solid ${ownSubnet.color}`; }
        else if (device.element) { device.element.style.border = ''; }
    });
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
    if (subnetResults.length === 0) { alert("No subnet data to export."); return; }
    let csv = "Network Address/CIDR,Subnet Mask,First Usable Host,Last Usable Host,Broadcast Address,Assigned Devices (with IPs)\n";
    subnetResults.forEach(s => {
        const assignedDevicesDisplay = s.deviceIdsInSubnet.map(deviceId => {
            const deviceObj = devices[deviceId];
            if (deviceObj) {
                let ipInfo = "";
                if (deviceObj.ipAddress) { ipInfo = deviceObj.ipAddress; }
                else if (deviceObj.interfaceIPs) {
                    if (deviceObj.interfaceIPs[`subnet_${s.networkAddress}`]) ipInfo = deviceObj.interfaceIPs[`subnet_${s.networkAddress}`];
                    else if (s.deviceIdsInSubnet.length === 2) { const otherDeviceId = s.deviceIdsInSubnet.find(id => id !== deviceId); if (otherDeviceId && deviceObj.interfaceIPs[otherDeviceId]) ipInfo = deviceObj.interfaceIPs[otherDeviceId]; }
                }
                return `${deviceObj.customName || deviceObj.labelElement?.innerText || deviceObj.id}${ipInfo ? ` (${ipInfo})` : ''}`;
            } return deviceId;
        }).join(" | ");
        csv += `"${s.networkAddress}/${s.cidr}","${s.subnetMask}","${s.firstHost}","${s.lastHost}","${s.broadcastAddress}","${assignedDevicesDisplay}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subnet_results.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});

document.getElementById("addTextBtn").addEventListener("click", () => {
    const textbox = document.createElement("div");
    textbox.className = "custom-textbox draggable-textbox";
    textbox.contentEditable = "true"; textbox.innerText = "Editable Text";
    textbox.style.position = "absolute"; const canvasRect = canvas.getBoundingClientRect();
    textbox.style.left = `${canvasRect.width / 2 - 50}px`; textbox.style.top = `${canvasRect.height / 2 - 20}px`;
    textbox.style.padding = "5px"; textbox.style.border = "1px dashed #ccc";
    textbox.style.backgroundColor = "rgba(255, 255, 255, 0.8)"; textbox.style.cursor = "move";
    textbox.style.zIndex = "5"; textbox.style.minWidth = "50px"; textbox.style.minHeight = "20px";
    textbox.style.textAlign = "center";
    canvas.appendChild(textbox);
    makeDraggable(textbox, null, null);
    textbox.addEventListener('mousedown', (e) => { if (deleteMode) { e.stopPropagation(); } });
    textbox.addEventListener('click', (e) => { if (deleteMode) { textbox.remove(); e.stopPropagation(); } });
    textbox.addEventListener('dblclick', () => { textbox.focus(); });
});

canvas.addEventListener('drop', e => {
    e.preventDefault();
    if (deleteMode) return;
    const type = e.dataTransfer.getData('type');
    const iconSrc = e.dataTransfer.getData('icon');
    if (!type || !iconSrc) return;

    const node = document.createElement('img');
    node.src = iconSrc;
    node.className = 'draggable-device device-icon';
    node.style.position = 'absolute';
    node.style.zIndex = "2";
    const iconWidth = 50; const iconHeight = 50;
    node.style.width = `${iconWidth}px`; node.style.height = `${iconHeight}px`;

    const canvasRect = canvas.getBoundingClientRect(); // This is viewport-relative position of the canvas div
    // Correct drop position relative to the canvas div itself
    let dropX = e.clientX - canvasRect.left;
    let dropY = e.clientY - canvasRect.top;

    // Center icon on cursor
    dropX -= (iconWidth / 2);
    dropY -= (iconHeight / 2);

    // Constrain to canvas boundaries (getBoundingClientRect gives rendered size, which is fine here)
    dropX = Math.max(0, Math.min(dropX, canvasRect.width - iconWidth));
    dropY = Math.max(0, Math.min(dropY, canvasRect.height - iconHeight));
    node.style.left = `${dropX}px`; node.style.top = `${dropY}px`;

    const id = `device_${deviceCounter}`;
    node.dataset.id = id; node.dataset.type = type;
    const label = document.createElement('div');
    const currentDeviceCountForType = Object.values(devices).filter(d => d.type === type).length + 1;
    label.innerText = `${type} ${currentDeviceCountForType}`;
    label.className = 'device-label'; label.contentEditable = "plaintext-only";
    label.title = "Click to rename"; label.style.position = 'absolute';
    label.style.textAlign = 'center'; label.style.width = '80px';
    label.style.height = '15px';
    label.style.left = `${dropX + (iconWidth / 2) - (parseInt(label.style.width) / 2)}px`;
    label.style.top = `${dropY + iconHeight + 5}px`;
    label.style.fontSize = '10px'; label.style.color = '#333';
    label.style.backgroundColor = 'rgba(255,255,255,0.6)';
    label.style.padding = '1px 3px'; label.style.borderRadius = '3px';
    label.style.zIndex = "3";
    deviceCounter++;

    label.addEventListener('blur', () => { if (devices[id]) devices[id].customName = label.innerText; });
    canvas.appendChild(node); canvas.appendChild(label);
    devices[id] = {
        id, type, element: node, labelElement: label, connections: [],
        ipAddress: null, ipAddressElement: null, interfaceIPs: {}, interfaceLabels: {},
        customName: label.innerText
    };
    makeDraggable(node, label, devices[id]);
});