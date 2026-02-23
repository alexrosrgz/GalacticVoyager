import { ObjectPool } from '@/utils/ObjectPool.js';
import { Projectile } from '@/entities/Projectile.js';
import { PROJECTILE_DAMAGE } from '@/utils/Constants.js';

export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = new ObjectPool(
      () => {
        const p = new Projectile();
        this.scene.add(p.mesh);
        return p;
      },
      (p) => p.reset(),
      30
    );
  }

  fire(position, direction, source) {
    const projectile = this.pool.acquire();
    projectile.init(position, direction, source);
  }

  update(dt) {
    this.pool.forEach(projectile => {
      projectile.update(dt);
      if (!projectile.active) {
        this.pool.release(projectile);
      }
    });
  }

  checkCollisions(enemies, player) {
    const hits = [];

    this.pool.forEach(projectile => {
      if (!projectile.active) return;

      if (projectile.source === 'player') {
        for (const enemy of enemies) {
          const dist = projectile.mesh.position.distanceTo(enemy.mesh.position);
          if (dist < enemy.boundingRadius + 1) {
            hits.push({ type: 'enemy', projectile, enemy });
            break;
          }
        }
      } else if (projectile.source === 'enemy') {
        const dist = projectile.mesh.position.distanceTo(player.mesh.position);
        if (dist < player.boundingRadius + 1) {
          hits.push({ type: 'player', projectile });
        }
      }
    });

    return hits;
  }

  releaseProjectile(projectile) {
    projectile.active = false;
    this.pool.release(projectile);
  }
}
