const gridBg = document.getElementById('gridBg');
const orb1 = document.getElementById('orb1');
const orb2 = document.getElementById('orb2');
const orb3 = document.getElementById('orb3');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let targetX = mouseX;
let targetY = mouseY;

window.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
});

function animateBackground() {
  // Smooth follow for cursor
  mouseX += (targetX - mouseX) * 0.05;
  mouseY += (targetY - mouseY) * 0.05;

  // Move the grid very slightly (parallax)
  const xOffset = (mouseX / window.innerWidth - 0.5) * 40;
  const yOffset = (mouseY / window.innerHeight - 0.5) * 40;
  if(gridBg) {
    gridBg.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  }

  // Move the glow orbs towards mouse
  if(orb1 && orb2) {
    orb1.style.transform = `translate(${xOffset * 2}px, ${yOffset * 2}px)`;
    orb2.style.transform = `translate(${xOffset * -1.5}px, ${yOffset * -1.5}px)`;
    if(orb3) orb3.style.transform = `translate(${xOffset * 0.8}px, ${yOffset * -0.5}px)`;
  }

  requestAnimationFrame(animateBackground);
}
animateBackground();


/* ── 2. Magnetic Node Hover (3D Tilt) ── */
document.querySelectorAll('.brick-node, .terminal-window').forEach(node => {
  node.addEventListener('mousemove', e => {
    const r = node.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const px = x / r.width;
    const py = y / r.height;
    
    // Tilt
    const rotateX = (0.5 - py) * 10; // max 5 deg
    const rotateY = (px - 0.5) * 10;
    
    node.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    node.style.borderColor = 'rgba(255,255,255,0.2)';
  });
  
  node.addEventListener('mouseleave', () => { 
    node.style.transform = '';
    node.style.borderColor = '';
  });
});


/* ── 3. Dynamic SVG Wires ── */
const svg = document.getElementById('wireLayer');

// Define the connections we want to draw
// [sourcePortId, targetPortId, colorTheme, srcDirection, tgtDirection]
const connections = [
  ['hero-out', 'feat-crypto-in', 'var(--type-bytes)', 'down', 'left'],
  ['feat-crypto-out', 'feat-zk-in', 'var(--type-array)', 'right', 'left'],
  ['feat-zk-out', 'feat-chain-in', 'var(--type-point)', 'right', 'left'],
  ['feat-chain-out', 'pro-in', 'var(--type-number)', 'right', 'left'],
  ['pro-out', 'download-in', 'var(--type-any)', 'right', 'left'],
];

let wirePaths = [];

function initWires() {
  svg.innerHTML = '';
  wirePaths = [];

  connections.forEach(([src, tgt, color, srcDir, tgtDir]) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'wire-path');
    path.style.stroke = color;
    svg.appendChild(path);
    
    wirePaths.push({
      path,
      srcId: src,
      tgtId: tgt,
      srcDir: srcDir,
      tgtDir: tgtDir
    });
  });

  drawWires();
}

function drawWires() {
  if (!svg) return;

  wirePaths.forEach((wire, index) => {
    const srcEl = document.querySelector(`[data-port-id="${wire.srcId}"] .port-handle`);
    const tgtEl = document.querySelector(`[data-port-id="${wire.tgtId}"] .port-handle`);

    if (!srcEl || !tgtEl) return;

    // SVG is now position: fixed, so we use pure viewport coordinates
    const srcRect = srcEl.getBoundingClientRect();
    const tgtRect = tgtEl.getBoundingClientRect();

    const x1 = srcRect.left + srcRect.width / 2;
    const y1 = srcRect.top + srcRect.height / 2;
    
    const x2 = tgtRect.left + tgtRect.width / 2;
    const y2 = tgtRect.top + tgtRect.height / 2;

    // Calculate bezier control points for a smooth flowing physical wire
    const deltaY = Math.abs(y2 - y1);
    const deltaX = Math.abs(x2 - x1);
    
    // Make the offset massive so it physically swings wide around the cards
    const offsetX = Math.max(deltaX * 1.5, 300);
    const offsetY = Math.max(deltaY * 0.5, 100);

    let cp1x = x1;
    let cp1y = y1;
    if (wire.srcDir === 'right') { cp1x = x1 + offsetX; cp1y = y1 + offsetY; }
    else if (wire.srcDir === 'left') { cp1x = x1 - offsetX; cp1y = y1 + offsetY; }
    else if (wire.srcDir === 'down') { cp1x = x1; cp1y = y1 + Math.max(deltaY * 0.8, 300); }

    let cp2x = x2;
    let cp2y = y2;
    if (wire.tgtDir === 'right') { cp2x = x2 + offsetX; cp2y = y2 - offsetY; }
    else if (wire.tgtDir === 'left') { cp2x = x2 - offsetX; cp2y = y2 - offsetY; }
    else if (wire.tgtDir === 'down') { cp2x = x2; cp2y = y2 - Math.max(deltaY * 0.8, 300); }

    // Construct SVG path command
    const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    wire.path.setAttribute('d', d);

    // Wire drawing animation based on scroll depth
    const pathLength = wire.path.getTotalLength() || 1500; // fallback if not immediately ready
    
    // Calculate how far down the screen the target element is
    // When the top of the target element is at the bottom of the viewport, ratio is 0
    // When the top of the target element is in the middle of the viewport, ratio is 0.5
    // Add an earlier trigger point so wires draw slightly before you see the node
    const targetScrollRatio = (window.innerHeight - tgtRect.top + 150) / window.innerHeight;
    
    // Clamp between 0 and 1
    let drawProgress = Math.min(Math.max(targetScrollRatio, 0), 1);
    
    // Force the first wire to always be drawn
    if (index === 0) {
      drawProgress = 1;
    }

    // Animate stroke dasharray based on progress
    wire.path.style.strokeDasharray = pathLength;
    wire.path.style.strokeDashoffset = pathLength * (1 - drawProgress);
  });
}

// Re-init on resize, redraw on scroll
window.addEventListener('resize', initWires);
window.addEventListener('scroll', () => { requestAnimationFrame(drawWires); }, { passive: true });

// Initial setup delay to ensure layout is done. Also draw immediately.
setTimeout(() => {
  initWires();
  // Force a redraw slightly later just in case fonts/images moved layout
  setTimeout(drawWires, 500);
}, 100);

/* ── 4. Docs Sidebar Navigation ── */
const docSections = document.querySelectorAll('.docs-content section');
const docNavLinks = document.querySelectorAll('.docs-nav-links a');

if (docSections.length > 0 && docNavLinks.length > 0) {
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove active class from all
        docNavLinks.forEach(link => link.classList.remove('active'));
        // Add active class to corresponding link
        const id = entry.target.getAttribute('id');
        const activeLink = document.querySelector(`.docs-nav-links a[href="#${id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, observerOptions);

  docSections.forEach(section => observer.observe(section));
}
