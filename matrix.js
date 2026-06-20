const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let width, height;
const dotSpacing = 28; // Spacing between dots in the grid
const dotRadius = 1.5; // Base size of the dots
let mouseX = -1000;
let mouseY = -1000;
let time = 0;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  // Handle high-DPI displays for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resize);
resize();

// Track mouse position
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Animation loop
function draw() {
  ctx.clearRect(0, 0, width, height);
  
  // Check theme to adjust dot base colors
  const isLight = document.body.classList.contains('light-theme');
  const r = isLight ? 150 : 200;
  const g = isLight ? 150 : 200;
  const b = isLight ? 150 : 200;
  const baseAlpha = isLight ? 0.2 : 0.15;

  const cols = Math.floor(width / dotSpacing);
  const rows = Math.floor(height / dotSpacing);

  // Center the grid in the viewport
  const offsetX = (width - cols * dotSpacing) / 2;
  const offsetY = (height - rows * dotSpacing) / 2;

  time += 0.015; // Speed of the wave effect

  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const x = offsetX + i * dotSpacing;
      const y = offsetY + j * dotSpacing;

      // Distance from this dot to the mouse cursor
      const dx = mouseX - x;
      const dy = mouseY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let alpha = baseAlpha;
      let radius = dotRadius;
      let color = `rgba(${r}, ${g}, ${b}, ${alpha})`;

      // Ambient subtle wave motion/twinkle across the screen
      const wave = Math.sin(x * 0.005 + time) * Math.cos(y * 0.005 + time);
      alpha += wave * 0.05;

      // Proximity effect near the mouse cursor
      const maxDist = 200; // Radius of interaction
      if (dist < maxDist) {
        const intensity = Math.pow(1 - (dist / maxDist), 1.5);
        alpha += intensity * 0.6; // Gets much brighter
        radius += intensity * 1.2; // Gets slightly larger
        
        // Blend into the premium brand red color when hovered
        color = `rgba(239, 68, 68, ${alpha})`;
      } else {
         color = `rgba(${r}, ${g}, ${b}, ${Math.max(0, alpha)})`;
      }

      // Draw the dot
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  requestAnimationFrame(draw);
}

// Start the animation
draw();
