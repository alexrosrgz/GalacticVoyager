export class Minimap {
  constructor() {
    this.size = 180;
    this.range = 2000;

    const canvas = document.createElement('canvas');
    canvas.id = 'minimap';
    canvas.width = this.size;
    canvas.height = this.size;
    canvas.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 30px;
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

    // Planets
    for (const planet of planets) {
      const dx = (planet.position.x - playerPos.x) * scale;
      const dz = (planet.position.z - playerPos.z) * scale;
      const px = hs + dx;
      const py = hs + dz;

      if (px > -10 && px < this.size + 10 && py > -10 && py < this.size + 10) {
        const dotSize = Math.max(2, planet.radius * scale * 0.5);
        ctx.fillStyle = planet.name === 'Sun' ? '#ffaa00' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies
    for (const enemy of enemies) {
      const dx = (enemy.mesh.position.x - playerPos.x) * scale;
      const dz = (enemy.mesh.position.z - playerPos.z) * scale;
      const ex = hs + dx;
      const ey = hs + dz;

      if (ex > 0 && ex < this.size && ey > 0 && ey < this.size) {
        ctx.fillStyle = '#ff4444';
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

    // Player direction indicator
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hs, hs);
    ctx.lineTo(hs, hs - 10);
    ctx.stroke();

    ctx.restore();
  }
}
