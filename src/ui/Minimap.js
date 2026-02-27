export class Minimap {
  constructor(isMobile = false) {
    this.size = isMobile ? 120 : 180;
    this.range = 2000;

    const canvas = document.createElement('canvas');
    canvas.id = 'minimap';
    canvas.width = this.size;
    canvas.height = this.size;

    const position = isMobile
      ? 'top: 10px; right: 10px;'
      : 'bottom: 60px; left: 30px;';

    canvas.style.cssText = `
      position: absolute;
      ${position}
      width: ${this.size}px;
      height: ${this.size}px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      pointer-events: none;
    `;
    document.getElementById('hud').appendChild(canvas);

    this.ctx = canvas.getContext('2d');
    this.halfSize = this.size / 2;
  }

  update(playerPos, playerQuaternion, enemies, planets) {
    const ctx = this.ctx;
    const hs = this.halfSize;
    const scale = this.halfSize / this.range;

    ctx.clearRect(0, 0, this.size, this.size);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(hs, hs, hs - 1, 0, Math.PI * 2);
    ctx.clip();

    // Range circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hs, hs, hs * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Asteroid belt ring
    for (const planet of planets) {
      if (planet.type !== 'asteroidBelt') continue;
      const center = planet.systemCenter;
      const cx = hs + (center.x - playerPos.x) * scale;
      const cz = hs + ((center.z || 0) - playerPos.z) * scale;
      const rInner = planet.innerRadius * scale;
      const rOuter = planet.outerRadius * scale;
      const rMid = (rInner + rOuter) / 2;
      const thickness = rOuter - rInner;

      if (cx + rOuter > 0 && cx - rOuter < this.size && cz + rOuter > 0 && cz - rOuter < this.size) {
        ctx.strokeStyle = 'rgba(136, 119, 102, 0.25)';
        ctx.lineWidth = Math.max(1, thickness);
        ctx.beginPath();
        ctx.arc(cx, cz, rMid, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Orbital paths — unified loop using body metadata
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    for (const planet of planets) {
      if (planet.type === 'asteroidBelt') continue;
      if (!planet.minimapOrbitalPath) continue;

      const center = planet.systemCenter;
      const cx = hs + (center.x - playerPos.x) * scale;
      const cz = hs + ((center.z || 0) - playerPos.z) * scale;

      const dx = planet.position.x - center.x;
      const dz = planet.position.z - (center.z || 0);
      const orbitRadius = Math.sqrt(dx * dx + dz * dz) || planet.radius;
      const r = orbitRadius * scale;

      if (cx + r > 0 && cx - r < this.size && cz + r > 0 && cz - r < this.size) {
        ctx.beginPath();
        ctx.arc(cx, cz, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Planets & stars
    const earthRadius = 8;
    const baseSize = 4;
    for (const planet of planets) {
      if (planet.type === 'asteroidBelt') continue;
      const dx = (planet.position.x - playerPos.x) * scale;
      const dz = (planet.position.z - playerPos.z) * scale;
      const px = hs + dx;
      const py = hs + dz;

      if (px > -10 && px < this.size + 10 && py > -10 && py < this.size + 10) {
        const hex = planet.minimapColorOverride || '#' + planet.color.toString(16).padStart(6, '0');

        if (planet.isStar) {
          // Stars get a glow effect and larger minimum size
          const dotSize = Math.min(12, Math.max(6, baseSize * Math.sqrt(planet.radius / earthRadius)));
          ctx.shadowColor = hex;
          ctx.shadowBlur = 8;
          ctx.fillStyle = hex;
          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          const dotSize = Math.min(10, Math.max(2, baseSize * Math.sqrt(planet.radius / earthRadius)));
          ctx.fillStyle = hex;
          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Enemies
    for (const enemy of enemies) {
      const dx = (enemy.mesh.position.x - playerPos.x) * scale;
      const dz = (enemy.mesh.position.z - playerPos.z) * scale;
      const ex = hs + dx;
      const ey = hs + dz;

      if (ex > 0 && ex < this.size && ey > 0 && ey < this.size) {
        ctx.fillStyle = '#ff4477';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player at center
    ctx.fillStyle = '#44ff88';
    ctx.beginPath();
    ctx.arc(hs, hs, 3, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator (extract forward XZ from quaternion)
    const qx = playerQuaternion.x, qy = playerQuaternion.y;
    const qz = playerQuaternion.z, qw = playerQuaternion.w;
    // Forward is (0,0,-1) rotated by quaternion — take x and z components
    const fx = -(2 * (qx * qz + qw * qy));
    const fz = -(1 - 2 * (qx * qx + qy * qy));
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hs, hs);
    ctx.lineTo(hs + fx * 12, hs + fz * 12);
    ctx.stroke();

    ctx.restore();
  }
}
