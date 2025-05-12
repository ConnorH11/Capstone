// visualizer.js

// Mode flags and state
let deleteMode = false;          // When true, clicking devices/cables deletes them
let cableMode = false;           // When true, clicking two devices draws a cable between them
let cableStart = null;           // Temporarily holds the first device clicked in cable mode
let deviceCounter = 0;           // Unique ID counter for devices
const connections = [];          // List of all cable connections {from, to, line, fromDevice, toDevice}
const canvas = document.getElementById('canvas');                  // The drawing area
const deleteStatus = document.getElementById("deleteStatus");      // "Delete Mode Active" indicator
const cableBtn = document.getElementById("cableModeBtn");          // Cable Mode toggle button
const cableStatus = document.getElementById("cableStatus");        // "Cable Mode Active" indicator
const devices = {};               // Map deviceId -> device metadata { element, type, connections, ... }
let subnetResults = [];           // Results of the latest subnet calculation

// -----------------------------------------------------------------------------
// DELETE MODE TOGGLE
// -----------------------------------------------------------------------------
document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;     // Flip delete mode
    cableMode = false;            // Exiting cable mode
    cableStart = null;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
    cableStatus.style.display = "none";
    // Clear any outlines on devices
    Object.values(devices).forEach(dev => {
        if (dev.element) dev.element.style.outline = 'none';
    });
});

// -----------------------------------------------------------------------------
// CLEAR CANVAS: remove all devices, cables, outlines, reset state
// -----------------------------------------------------------------------------
document.getElementById("clearCanvasBtn").addEventListener("click", () => {
    // Remove all device elements, labels, IP displays, interface labels
    Object.values(devices).forEach(device => {
        device.element?.remove();
        device.labelElement?.remove();
        device.ipAddressElement?.remove();
        Object.values(device.interfaceLabels || {}).forEach(label => label.remove());
    });

    // Remove all SVG cable lines
    const svg = document.getElementById("connectionLayer");
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Remove subnet outlines, textboxes, reset arrays
    document.querySelectorAll(".subnet-outline").forEach(o => o.remove());
    document.querySelectorAll(".custom-textbox").forEach(tb => tb.remove());
    Object.keys(devices).forEach(k => delete devices[k]);
    connections.length = 0;
    subnetResults.length = 0;
    deviceCounter = 0;

    // Reset modes and indicators
    deleteMode = cableMode = false;
    canvas.style.cursor = "default";
    deleteStatus.style.display = cableStatus.style.display = "none";

    // Hide results table
    document.getElementById("resultsBody").innerHTML = "";
    document.getElementById("subnetResults").style.display = "none";
});

// -----------------------------------------------------------------------------
// DRAG-AND-DROP SETUP FOR TOOLBOX ICONS
// -----------------------------------------------------------------------------
document.querySelectorAll('.draggable').forEach(icon => {
    icon.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', icon.dataset.type);
        e.dataTransfer.setData('icon', icon.src);
    });
});
canvas.addEventListener('dragover', e => e.preventDefault());

// -----------------------------------------------------------------------------
// MAKE ELEMENTS DRAGGABLE INSIDE CANVAS
// -----------------------------------------------------------------------------
function makeDraggable(el, label, device = null) {
    // Avoid double-initialization
    if (el.dataset.draggableInitialized) return;
    el.dataset.draggableInitialized = "true";

    let offsetX = 0, offsetY = 0;
    const isTextbox = el.classList.contains('custom-textbox');

    el.onmousedown = function (e) {
        // Only left-click, and not when in cable mode or (delete mode on non-textbox)
        if (e.button !== 0 || cableMode || (deleteMode && !isTextbox)) return;

        // Compute initial offsets
        const canvasRect = canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        offsetX = e.clientX - elRect.left;
        offsetY = e.clientY - elRect.top;

        // Mouse move handler to drag the element
        document.onmousemove = function (eMove) {
            // Calculate new position, clamped to canvas bounds
            let newX = eMove.clientX - canvasRect.left - offsetX;
            let newY = eMove.clientY - canvasRect.top - offsetY;
            const elWidth = parseInt(el.style.width) || elRect.width;
            const elHeight = parseInt(el.style.height) || elRect.height;
            newX = Math.max(0, Math.min(newX, canvasRect.width - elWidth));
            newY = Math.max(0, Math.min(newY, canvasRect.height - elHeight));

            // Apply to element
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;

            // Also move label and IP display if present
            if (label && device) {
                const iconW = parseInt(device.element.style.width) || 50;
                const iconH = parseInt(device.element.style.height) || 50;
                const lblW = parseInt(label.style.width) || 80;
                const lblH = parseInt(label.style.height) || 15;

                label.style.left = `${newX + (iconW / 2) - (lblW / 2)}px`;
                label.style.top = `${newY + iconH + 5}px`;

                if (device.ipAddressElement) {
                    const ipW = device.ipAddressElement.offsetWidth;
                    device.ipAddressElement.style.left = `${newX + (iconW / 2) - (ipW / 2)}px`;
                    device.ipAddressElement.style.top = `${newY + iconH + lblH + 10}px`;
                }
            }

            // Update interface labels positions
            if (device?.interfaceLabels) {
                Object.entries(device.interfaceLabels).forEach(([key, ifaceLabel]) => {
                    if (key.startsWith('subnet_')) {
                        positionLabelNearDevice(device.element, ifaceLabel, 'gateway', null);
                    } else {
                        const peerEl = devices[key]?.element;
                        if (peerEl) positionLabelNearDevice(el, ifaceLabel, 'left', peerEl);
                    }
                });
            }

            // Update cable line positions
            connections.forEach(conn => {
                if (conn.from === el || conn.to === el) {
                    updateLinePosition(conn.from, conn.to, conn.line);
                }
            });
        };

        // Release mouse
        document.onmouseup = function () {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    // Click handler for deletion
    el.onclick = function (e) {
        if (isTextbox) return;  // textboxes handled separately
        if (!deleteMode) return;

        // Remove any connected cables
        for (let i = connections.length - 1; i >= 0; i--) {
            const c = connections[i];
            if (c.from === el || c.to === el) {
                // Clean up interface labels and IPs
                if (c.fromDevice && c.toDevice) {
                    delete c.fromDevice.interfaceIPs[c.toDevice.id];
                    delete c.fromDevice.interfaceLabels[c.toDevice.id];
                    delete c.toDevice.interfaceIPs[c.fromDevice.id];
                    delete c.toDevice.interfaceLabels[c.fromDevice.id];
                }
                c.line.remove();
                connections.splice(i, 1);
            }
        }
        // Remove labels and device entry
        label?.remove();
        const devId = el.dataset.id;
        if (devices[devId]) {
            const d = devices[devId];
            d.ipAddressElement?.remove();
            Object.values(d.interfaceLabels).forEach(lbl => lbl.remove());
            // Remove from peers
            Object.values(devices).forEach(peer => {
                peer.connections = peer.connections.filter(id => id !== devId);
                delete peer.interfaceIPs?.[devId];
                delete peer.interfaceLabels?.[devId];
            });
            delete devices[devId];
        }
        el.remove();
        e.stopPropagation();
    };
}

// -----------------------------------------------------------------------------
// CABLE MODE TOGGLE & HANDLING
// -----------------------------------------------------------------------------
cableBtn.addEventListener("click", () => {
    cableMode = !cableMode;
    deleteMode = false;
    cableStart = null;
    canvas.style.cursor = cableMode ? "crosshair" : "default";
    cableStatus.style.display = cableMode ? "inline" : "none";
    deleteStatus.style.display = "none";
    // Clear any device outlines
    Object.values(devices).forEach(dev => dev.element && (dev.element.style.outline = 'none'));
});

// Click on canvas for cable mode connections
canvas.addEventListener('click', function (e) {
    if (!cableMode) return;

    // Only connect draggable devices
    if (e.target.classList.contains('draggable-device')) {
        const clicked = e.target;
        // First click: mark starting device
        if (!cableStart) {
            cableStart = clicked;
            clicked.style.outline = '2px dashed green';
        } else {
            // Prevent self-connection or duplicate
            if (cableStart === clicked || cableStart.dataset.id === clicked.dataset.id) {
                cableStart.style.outline = 'none';
                cableStart = null;
                return;
            }
            const already = connections.some(c =>
                (c.from === cableStart && c.to === clicked) ||
                (c.from === clicked && c.to === cableStart)
            );
            if (already) {
                alert("These devices are already connected.");
                cableStart.style.outline = 'none';
                cableStart = null;
                return;
            }
            // Draw the SVG line
            drawSvgLine(cableStart, clicked);
            cableStart.style.outline = clicked.style.outline = 'none';
            cableStart = null;
        }
    } else if (cableStart) {
        // Clicked empty canvas: cancel cable start
        cableStart.style.outline = 'none';
        cableStart = null;
    }
});

// -----------------------------------------------------------------------------
// SVG LINE HELPERS
// -----------------------------------------------------------------------------
function updateLinePosition(fromEl, toEl, line) {
    const f = fromEl.getBoundingClientRect();
    const t = toEl.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    line.setAttribute("x1", f.left + f.width / 2 - c.left);
    line.setAttribute("y1", f.top + f.height / 2 - c.top);
    line.setAttribute("x2", t.left + t.width / 2 - c.left);
    line.setAttribute("y2", t.top + t.height / 2 - c.top);
}

function drawSvgLine(fromEl, toEl) {
    const svg = document.getElementById("connectionLayer");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "#007bff");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("pointer-events", "stroke");
    line.style.cursor = "pointer";

    // Position initial
    updateLinePosition(fromEl, toEl, line);

    // Register deletion on click if deleteMode
    line.addEventListener("click", function (e) {
        if (!deleteMode) return;
        svg.removeChild(line);
        // Remove from connections array...
        for (let i = connections.length - 1; i >= 0; i--) {
            if (connections[i].line === line) connections.splice(i, 1);
        }
        e.stopPropagation();
    });

    // Track metadata
    const fromId = fromEl.dataset.id, toId = toEl.dataset.id;
    const fromDevice = devices[fromId], toDevice = devices[toId];
    connections.push({ from: fromEl, to: toEl, line, fromDevice, toDevice });
    // Register in each device's connection list
    if (fromDevice && toDevice) {
        fromDevice.connections.push(toId);
        toDevice.connections.push(fromId);
    }

    svg.appendChild(line);
}

// -----------------------------------------------------------------------------
// POSITIONING INTERFACE / GATEWAY LABELS NEAR DEVICES
// -----------------------------------------------------------------------------
function positionLabelNearDevice(deviceEl, labelEl, side = 'left', relatedEl = null) {
    const dRect = deviceEl.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    const lblRect = labelEl.getBoundingClientRect();

    let x, y;
    if (relatedEl) {
        // Position halfway towards peer, with slight perpendicular offset
        const pRect = relatedEl.getBoundingClientRect();
        const dx = (pRect.left + pRect.width / 2) - (dRect.left + dRect.width / 2);
        const dy = (pRect.top + pRect.height / 2) - (dRect.top + dRect.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const midX = dRect.left + dRect.width / 2 + dx * 0.25;
        const midY = dRect.top + dRect.height / 2 + dy * 0.25;
        const perp = 15;
        const ox = (side === 'left' ? -dy : dy) / dist * perp;
        const oy = (side === 'left' ? dx : -dx) / dist * perp;
        x = midX + ox - cRect.left - lblRect.width / 2;
        y = midY + oy - cRect.top - lblRect.height / 2;
    } else if (side === 'gateway') {
        // Gateway label above device
        x = (dRect.left + dRect.width / 2) - cRect.left - lblRect.width / 2;
        y = dRect.top - cRect.top - lblRect.height - 5;
    } else {
        // Default: below device
        x = dRect.left - cRect.left;
        y = dRect.top - cRect.top + dRect.height + 5;
    }

    labelEl.style.position = 'absolute';
    labelEl.style.left = `${x}px`;
    labelEl.style.top = `${y}px`;
    labelEl.style.fontSize = '10px';
    labelEl.style.padding = '1px 4px';
    labelEl.style.borderRadius = '4px';
    labelEl.style.zIndex = '10';
    labelEl.style.border = '1px solid #ccc';
    labelEl.style.background = side === 'gateway' ? '#d1ecf1' : '#fff';
    labelEl.style.color = side === 'gateway' ? '#0c5460' : '#000';
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS FOR IP/CIDR OPERATIONS
// -----------------------------------------------------------------------------
function ipToUint(ipStr) {
    const parts = ipStr.split('.');
    return parts.reduce((acc, octet) => {
        const num = parseInt(octet, 10);
        if (isNaN(num) || num < 0 || num > 255) {
            throw new Error(`Invalid IP segment: ${octet}`);
        }
        return (acc << 8) + num;
    }, 0) >>> 0;
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
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
        const n = parseInt(p, 10);
        return !isNaN(n) && n >= 0 && n <= 255;
    });
}

function isValidCIDR(cidr) {
    const n = parseInt(cidr, 10);
    return !isNaN(n) && n >= 0 && n <= 32;
}

// -----------------------------------------------------------------------------
// SUBNET ASSIGNMENT: distribute IPs to routers, switches, end devices
// -----------------------------------------------------------------------------
function assignIPAddresses(groupDeviceIds, subnetInfo) {
    const { firstHostUint, lastHostUint, cidr, networkAddress } = subnetInfo;
    let current = firstHostUint;
    const groupObjs = groupDeviceIds.map(id => devices[id]).filter(Boolean);
    const routers = groupObjs.filter(d => ['router', 'l3switch'].includes(d.type.toLowerCase()));
    const others = groupObjs.filter(d => !['router', 'l3switch'].includes(d.type.toLowerCase()));

    // Case: pure /30 link between two routers
    if (routers.length === 2 && others.length === 0 && cidr === 30) {
        routers.forEach((r, i) => {
            if (current <= lastHostUint) {
                r.interfaceIPs = r.interfaceIPs || {};
                r.interfaceIPs[routers[1 - i].id] = uintToIp(current++);
            }
        });
    }
    // Case: router plus LAN segment
    else if (routers.length === 1) {
        const gw = routers[0];
        if (current <= lastHostUint) {
            gw.interfaceIPs = gw.interfaceIPs || {};
            gw.interfaceIPs[`subnet_${networkAddress}`] = uintToIp(current++);
        }
        others.concat(routers.filter(r => false)) // assign others
            .forEach(dev => { if (current <= lastHostUint) dev.ipAddress = uintToIp(current++); });
    }
    // Case: no routers, just end devices & switches
    else {
        others.forEach(dev => { if (current <= lastHostUint) dev.ipAddress = uintToIp(current++); });
    }
}

// -----------------------------------------------------------------------------
// AUTO-SUBNET: divides the base network into subnets based on topology
// -----------------------------------------------------------------------------
function autoSubnet(baseCidrStr, groups) {
    // ... implementation, including sorting groups, calculating block sizes,
    //     calling assignIPAddresses(), collecting subnetResults ...
    // (See earlier code for details; comments omitted here for brevity)
}

// -----------------------------------------------------------------------------
// RENDER INTERFACE LABELS: Place gateway / link IPs after calculation
// -----------------------------------------------------------------------------
function renderInterfaceLabels() {
    // Loop devices, create labels for each interface IP stored
    Object.values(devices).forEach(device => {
        if (!['router', 'l3switch'].includes(device.type.toLowerCase())) return;
        if (!device.interfaceIPs) return;
        Object.entries(device.interfaceIPs).forEach(([peer, ip]) => {
            if (!device.interfaceLabels) device.interfaceLabels = {};
            if (device.interfaceLabels[peer]) return;  // avoid duplicates
            const lbl = document.createElement('div');
            lbl.className = "interface-ip-label";
            lbl.innerText = ip;
            canvas.appendChild(lbl);
            if (peer.startsWith('subnet_')) {
                positionLabelNearDevice(device.element, lbl, 'gateway', null);
            } else {
                positionLabelNearDevice(device.element, lbl, 'left', devices[peer].element);
            }
            device.interfaceLabels[peer] = lbl;
        });
    });
}

// -----------------------------------------------------------------------------
// RANDOM COLOR GENERATOR FOR SUBNET OUTLINES & TABLE ROWS
// -----------------------------------------------------------------------------
function getRandomColor() {
    const hex = '0123456789ABCDEF';
    return '#' + Array.from({ length: 6 }, () => hex[Math.floor(Math.random() * 16)]).join('');
}

// -----------------------------------------------------------------------------
// GROUP EXTRACTION: determine logical subnets from router+switch topology
// -----------------------------------------------------------------------------
function getSubnetsFromRouterInterfaces() {
    // ... implementation, grouping routers->routers, routers->LAN, isolated switches ...
    // (See earlier code for details)
}

// -----------------------------------------------------------------------------
// CALCULATE BUTTON: kick off auto-subnet and render results
// -----------------------------------------------------------------------------
document.getElementById("calculateBtn").addEventListener("click", () => {
    // Validate input, build groups, call autoSubnet, then render table & canvas
    // (Detailed code omitted here for brevity; see above)
});

// -----------------------------------------------------------------------------
// EXPORT TO CSV
// -----------------------------------------------------------------------------
document.getElementById("exportCsvBtn").addEventListener("click", () => {
    // Builds CSV from subnetResults and triggers download
});

// -----------------------------------------------------------------------------
// ADD EDITABLE TEXTBOX
// -----------------------------------------------------------------------------
document.getElementById("addTextBtn").addEventListener("click", () => {
    // Creates a draggable, editable <div> on the canvas
});

// -----------------------------------------------------------------------------
// HANDLE DROPPING NEW DEVICE ICONS ONTO CANVAS
// -----------------------------------------------------------------------------
canvas.addEventListener('drop', e => {
    // Reads icon src and type, places device <img>, label, and registers it
});

// End of visualizer.js
