// 视觉特效 - 浮动尘埃粒子 + 烛光氛围
function initDustParticles() {
  const container = document.getElementById('dust-container');
  if (!container) return;

  const particleCount = 35;
  for (let i = 0; i < particleCount; i++) {
    createDustParticle(container);
  }
}

function createDustParticle(container) {
  const p = document.createElement('div');
  p.className = 'dust-particle';
  const size = Math.random() * 3 + 1;
  p.style.width = size + 'px';
  p.style.height = size + 'px';
  p.style.left = Math.random() * 100 + '%';
  p.style.top = Math.random() * 100 + '%';
  p.style.opacity = Math.random() * 0.4 + 0.1;
  p.style.animationDuration = (Math.random() * 20 + 15) + 's';
  p.style.animationDelay = (Math.random() * 10) + 's';
  p.style.setProperty('--drift-x', (Math.random() * 200 - 100) + 'px');
  p.style.setProperty('--drift-y', (Math.random() * -150 - 50) + 'px');
  container.appendChild(p);
}
