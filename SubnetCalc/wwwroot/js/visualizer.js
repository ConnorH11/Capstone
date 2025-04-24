let deleteMode = false;
const connections = [];
const canvas = document.getElementById('canvas');
const deleteStatus = document.getElementById("deleteStatus");

// Toggle delete mode
document.getElementById("deleteModeBtn").addEventListener("click", () => {
    deleteMode = !deleteMode;
    canvas.style.cursor = deleteMode ? "not-allowed" : "default";
    deleteStatus.style.display = deleteMode ? "inline" : "none";
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
function makeDraggable(el) {
    let offsetX, offsetY;

    el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;

        const canvasRect = canvas.getBoundingClientRect();
        offsetX = e.clientX - el.offsetLeft - canvasRect.left;
        offsetY = e.clientY - el.offsetTop - canvasRect.top;

        document.onmousemove = function (eMove) {
            el.style.left = `${eMove.clientX - canvasRect.left - offsetX}px`;
            el.style.top = `${eMove.clientY - canvasRect.top - offsetY}px`;

            // Update any connected lines
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
            for (let i = connections.length - 1; i >= 0; i--) {
                if (connections[i].from === el || connections[i].to === el) {
                    connections[i].line.remove();
                    connections.splice(i, 1);
                }
            }
            el.remove();
        }
    });
}

// Cable connection logic
let cableStart = null;

canvas.addEventListener('click', function (e) {
    if (!e.target.classList.contains('draggable')) {
        if (cableStart) cableStart.style.outline = 'none';
        cableStart = null;
        return;
    }

    if (!cableStart) {
        cableStart = e.target;
        e.target.style.outline = '2px dashed green';
    } else {
        drawSvgLine(cableStart, e.target);
        cableStart.style.outline = 'none';
        cableStart = null;
    }
});

// Draw and track a cable
function drawSvgLine(fromEl, toEl) {
    const svg = document.getElementById("connectionLayer");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "#007bff");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    connections.push({
        from: fromEl,
        to: toEl,
        line: line
    });

    updateLinePosition(fromEl, toEl, line);
}

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

