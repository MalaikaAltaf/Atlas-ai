/**
 * Mindmap Full-Screen Renderer
 * Dedicated physics and rendering for large canvas
 */

let simulation = null;
let currentTransform = { x: 0, y: 0, k: 1 };
let mindmapData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadMindmap();
    setupControls();
});

async function loadMindmap() {
    chrome.storage.local.get(['atlas_mindmap_data'], (result) => {
        if (result.atlas_mindmap_data) {
            mindmapData = result.atlas_mindmap_data;
            renderMindmap(mindmapData);
            document.getElementById('loading-overlay').classList.add('hidden');
        } else {
            console.error("No mindmap data found in storage.");
            document.querySelector('#loading-overlay p').textContent = "Error: No data found. Try re-generating from the sidebar.";
        }
    });
}

function setupControls() {
    document.getElementById('zoom-in').onclick = () => zoom(1.2);
    document.getElementById('zoom-out').onclick = () => zoom(0.8);
    document.getElementById('reset-view').onclick = resetView;

    // Pan handling
    const viewport = document.getElementById('mindmap-viewport');
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };

    viewport.onmousedown = (e) => {
        if (e.target.tagName === 'rect' || e.target.tagName === 'text') return;
        isPanning = true;
        startPoint = { x: e.clientX - currentTransform.x, y: e.clientY - currentTransform.y };
    };

    window.onmousemove = (e) => {
        if (!isPanning) return;
        currentTransform.x = e.clientX - startPoint.x;
        currentTransform.y = e.clientY - startPoint.y;
        updateTransform();
    };

    window.onmouseup = () => { isPanning = false; };

    // Mouse wheel zoom
    viewport.onwheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        zoom(factor, e.clientX, e.clientY);
    };
}

function zoom(factor, centerX = window.innerWidth / 2, centerY = window.innerHeight / 2) {
    const newK = Math.max(0.1, Math.min(5, currentTransform.k * factor));

    // Zoom towards point
    const dx = (centerX - currentTransform.x) / currentTransform.k;
    const dy = (centerY - currentTransform.y) / currentTransform.k;

    currentTransform.k = newK;
    currentTransform.x = centerX - dx * newK;
    currentTransform.y = centerY - dy * newK;

    updateTransform();
}

function resetView() {
    currentTransform = { x: 0, y: 0, k: 1 };
    updateTransform();
}

function updateTransform() {
    const container = document.getElementById('main-container');
    container.setAttribute('transform', `translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.k})`);
}

function renderMindmap(data) {
    const svg = document.getElementById('mindmap-svg');
    const nodeGroup = document.getElementById('node-group');
    const linkGroup = document.getElementById('link-group');

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Flatten Data
    const nodes = [];
    const links = [];

    function processNode(node, parent, level) {
        const nodeId = node.id || `n_${nodes.length}`;
        const flatNode = {
            id: nodeId,
            name: node.name,
            x: parent ? parent.x + (Math.random() - 0.5) * 500 : width / 2,
            y: parent ? parent.y + (Math.random() - 0.5) * 500 : height / 2,
            level: level,
            isRoot: level === 0,
            width: 0,
            height: 40,
            vx: 0,
            vy: 0
        };
        nodes.push(flatNode);
        if (parent) links.push({ source: parent, target: flatNode });
        if (node.children) node.children.forEach(c => processNode(c, flatNode, level + 1));
    }

    processNode(data, null, 0);

    // 2. Create Elements
    links.forEach(link => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('stroke', 'rgba(139, 92, 246, 0.2)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        link.el = line;
        linkGroup.appendChild(line);
    });

    nodes.forEach(node => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node-pill');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        text.textContent = node.name;
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', node.isRoot ? '16px' : '14px');
        text.setAttribute('font-weight', node.isRoot ? '600' : '400');
        text.setAttribute('dy', '5');

        // Measure text for pill width
        const padding = 40;
        const textWidth = node.name.length * (node.isRoot ? 9 : 8);
        node.width = textWidth + padding;

        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('rx', node.height / 2);
        rect.setAttribute('fill', node.isRoot ? 'var(--primary)' : 'rgba(139, 92, 246, 0.15)');
        rect.setAttribute('stroke', 'rgba(139, 92, 246, 0.4)');
        rect.setAttribute('stroke-width', '1.5');

        g.appendChild(rect);
        g.appendChild(text);
        nodeGroup.appendChild(g);

        node.el = g;
        node.rectEl = rect;
        node.textEl = text;

        // Interaction
        g.onmousedown = (e) => startDrag(e, node);
    });

    // 3. Start Simulation
    simulation = new MindmapSimulation(nodes, links, width, height);
    simulation.start();
}

function startDrag(e, node) {
    e.stopPropagation();
    node.isDragging = true;
    const g = node.el;
    g.style.cursor = 'grabbing';

    const onMove = (moveEvent) => {
        const worldPos = screenToWorld(moveEvent.clientX, moveEvent.clientY);
        node.x = worldPos.x;
        node.y = worldPos.y;
    };

    const onUp = () => {
        node.isDragging = false;
        g.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function screenToWorld(sx, sy) {
    return {
        x: (sx - currentTransform.x) / currentTransform.k,
        y: (sy - currentTransform.y) / currentTransform.k
    };
}

class MindmapSimulation {
    constructor(nodes, links, width, height) {
        this.nodes = nodes;
        this.links = links;
        this.width = width;
        this.height = height;
        this.damping = 0.85;
        this.running = false;
    }

    start() {
        this.running = true;
        const tick = () => {
            if (!this.running) return;
            this.update();
            this.draw();
            requestAnimationFrame(tick);
        };
        tick();
    }

    update() {
        const k = 0.02; // Spring
        const repulsion = 20000; // Stronger for full screen
        const centerForce = 0.002;

        // Repulsion
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy || 1;
                const dist = Math.sqrt(distSq);

                const force = repulsion / distSq;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                if (!a.isDragging && !a.isRoot) { a.vx -= fx; a.vy -= fy; }
                if (!b.isDragging && !b.isRoot) { b.vx += fx; b.vy += fy; }

                // Collision
                const minDist = (a.width + b.width) / 2 + 50;
                if (dist < minDist) {
                    const push = (minDist - dist) * 0.5;
                    a.vx -= (dx / dist) * push;
                    a.vy -= (dy / dist) * push;
                    b.vx += (dx / dist) * push;
                    b.vy += (dy / dist) * push;
                }
            }
        }

        // Springs
        this.links.forEach(l => {
            const a = l.source;
            const b = l.target;
            const targetLen = (a.width + b.width) / 2 + 150;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - targetLen) * k;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!a.isDragging) { a.vx += fx; a.vy += fy; }
            if (!b.isDragging) { b.vx -= fx; b.vy -= fy; }
        });

        // Update positions
        this.nodes.forEach(n => {
            if (n.isDragging) return;

            // Subtle centripetal force
            if (!n.isRoot) {
                n.vx += (this.width / 2 - n.x) * centerForce;
                n.vy += (this.height / 2 - n.y) * centerForce;
            } else {
                n.vx += (this.width / 2 - n.x) * 0.05;
                n.vy += (this.height / 2 - n.y) * 0.05;
            }

            n.vx *= this.damping;
            n.vy *= this.damping;
            n.x += n.vx;
            n.y += n.vy;
        });
    }

    draw() {
        this.links.forEach(l => {
            const s = l.source;
            const t = l.target;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
            l.el.setAttribute('d', `M${s.x},${s.y}A${dr},${dr} 0 0,1 ${t.x},${t.y}`);
        });

        this.nodes.forEach(n => {
            n.el.setAttribute('transform', `translate(${n.x - n.width / 2}, ${n.y - n.height / 2})`);
            n.textEl.setAttribute('x', n.width / 2);
            n.textEl.setAttribute('y', n.height / 2);
        });
    }
}
