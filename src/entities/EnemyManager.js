import * as THREE from 'three';
import { ObjectPool } from '@/utils/ObjectPool.js';
import { Enemy } from '@/entities/Enemy.js';
import { randomPointOnSphere, randomRange } from '@/utils/MathUtils.js';
import {
  MAX_ENEMIES,
  ENEMY_SPAWN_INTERVAL_MAX,
  ENEMY_SPAWN_INTERVAL_MIN,
  ENEMY_SPAWN_RADIUS_MIN,
  ENEMY_SPAWN_RADIUS_MAX,
} from '@/utils/Constants.js';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = new ObjectPool(
      () => {
        const enemy = new Enemy();
        this.scene.add(enemy.mesh);
        return enemy;
      },
      (e) => e.reset(),
      MAX_ENEMIES
    );
    this.spawnTimer = 3; // First enemy spawns after 3 seconds
    this.explosionParticles = [];
  }

  update(dt, playerPosition, projectileManager, score) {
    // Spawn logic
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const activeCount = this.pool.getActive().length;
      if (activeCount < MAX_ENEMIES) {
        this._spawnEnemy(playerPosition);
      }
      // Spawn interval decreases as score rises
      const interval = Math.max(
        ENEMY_SPAWN_INTERVAL_MIN,
        ENEMY_SPAWN_INTERVAL_MAX - score / 500
      );
      this.spawnTimer = interval;
    }

    // Update active enemies
    this.pool.forEach(enemy => {
      enemy.update(dt, playerPosition, projectileManager);
      if (!enemy.active) {
        this.pool.release(enemy);
      }
    });

    // Update explosion particles
    this._updateExplosions(dt);
  }

  _spawnEnemy(playerPosition) {
    const radius = randomRange(ENEMY_SPAWN_RADIUS_MIN, ENEMY_SPAWN_RADIUS_MAX);
    const offset = randomPointOnSphere(radius);
    const spawnPos = playerPosition.clone().add(offset);

    const enemy = this.pool.acquire();
    enemy.init(spawnPos);
  }

  getActiveEnemies() {
    return this.pool.getActive();
  }

  handleEnemyDeath(enemy) {
    this._spawnExplosion(enemy.mesh.position.clone());
    enemy.active = false;
    this.pool.release(enemy);
  }

  _spawnExplosion(position) {
    const count = 20;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(new THREE.Vector3(
        randomRange(-50, 50),
        randomRange(-50, 50),
        randomRange(-50, 50)
      ));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.explosionParticles.push({
      points,
      velocities,
      lifetime: 0.6,
      elapsed: 0,
    });
  }

  _updateExplosions(dt) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const explosion = this.explosionParticles[i];
      explosion.elapsed += dt;

      if (explosion.elapsed >= explosion.lifetime) {
        this.scene.remove(explosion.points);
        explosion.points.geometry.dispose();
        explosion.points.material.dispose();
        this.explosionParticles.splice(i, 1);
        continue;
      }

      // Update particle positions
      const posAttr = explosion.points.geometry.getAttribute('position');
      for (let j = 0; j < explosion.velocities.length; j++) {
        posAttr.array[j * 3]     += explosion.velocities[j].x * dt;
        posAttr.array[j * 3 + 1] += explosion.velocities[j].y * dt;
        posAttr.array[j * 3 + 2] += explosion.velocities[j].z * dt;
      }
      posAttr.needsUpdate = true;

      // Fade out
      explosion.points.material.opacity = 1 - (explosion.elapsed / explosion.lifetime);
    }
  }
}
