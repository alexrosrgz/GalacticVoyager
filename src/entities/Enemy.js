import * as THREE from 'three';
import { ENEMY_SPEED, ENEMY_HEALTH, ENEMY_FIRE_RATE } from '@/utils/Constants.js';
import { randomRange } from '@/utils/MathUtils.js';
import { loadModel } from '@/utils/ModelLoader.js';

export class Enemy {
  constructor() {
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.health = ENEMY_HEALTH;
    this.maxHealth = ENEMY_HEALTH;
    this.active = false;
    this.state = 'approaching';
    this.fireCooldown = 0;
    this.evadeTimer = 0;
    this.evadeDirection = new THREE.Vector3();
    this.boundingRadius = 5;
    this.flashTimer = 0;
    this.flashMeshes = [];

    this._buildPlaceholder();
    this._loadModel();
  }

  _buildPlaceholder() {
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xcc3322,
    });

    this.placeholder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.5, 0),
      bodyMat
    );
    this.mesh.add(this.placeholder);
    this.flashMeshes = [this.placeholder];
  }

  async _loadModel() {
    try {
      const model = await loadModel(
        '/models/insurgent/Insurgent.obj',
        '/models/insurgent/Insurgent_Red.png',
        1.5
      );
      this.mesh.remove(this.placeholder);
      this.mesh.add(model);
      this.loadedModel = model;

      // Collect meshes for flash effect
      this.flashMeshes = [];
      model.traverse((child) => {
        if (child.isMesh) {
          this.flashMeshes.push(child);
        }
      });
    } catch (e) {
      console.warn('Failed to load enemy model, keeping placeholder:', e);
    }
  }

  init(position) {
    this.mesh.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.health = ENEMY_HEALTH;
    this.active = true;
    this.state = 'approaching';
    this.fireCooldown = randomRange(0.5, 2);
    this.evadeTimer = 0;
    this.flashTimer = 0;
    this._resetFlash();
  }

  _resetFlash() {
    for (const m of this.flashMeshes) {
      if (m.material && m.material.emissive) {
        m.material.emissive.set(0x000000);
      }
    }
  }

  update(dt, playerPosition, projectileManager) {
    if (!this.active) return;

    const toPlayer = playerPosition.clone().sub(this.mesh.position);
    const distance = toPlayer.length();
    const dirToPlayer = toPlayer.normalize();

    switch (this.state) {
      case 'approaching':
        this._steerToward(dirToPlayer, dt);
        if (distance < 300) {
          this.state = 'attacking';
        }
        break;

      case 'attacking':
        if (distance > 600) {
          this.state = 'approaching';
        } else if (this.health < this.maxHealth * 0.3) {
          this.state = 'evading';
          this.evadeTimer = 3;
          this.evadeDirection = new THREE.Vector3()
            .crossVectors(dirToPlayer, new THREE.Vector3(0, 1, 0))
            .normalize()
            .multiplyScalar(Math.random() > 0.5 ? 1 : -1);
        } else {
          if (distance < 200) {
            this._steerToward(dirToPlayer.clone().negate(), dt);
          } else if (distance > 400) {
            this._steerToward(dirToPlayer, dt);
          } else {
            const orbit = new THREE.Vector3()
              .crossVectors(dirToPlayer, new THREE.Vector3(0, 1, 0))
              .normalize();
            this._steerToward(orbit, dt);
          }

          this.fireCooldown -= dt;
          if (this.fireCooldown <= 0) {
            this.fireCooldown = ENEMY_FIRE_RATE + randomRange(-0.3, 0.3);
            projectileManager.fire(
              this.mesh.position.clone().add(dirToPlayer.clone().multiplyScalar(5)),
              dirToPlayer.clone(),
              'enemy'
            );
          }
        }
        break;

      case 'evading':
        this._steerToward(this.evadeDirection, dt);
        this.evadeTimer -= dt;
        if (this.evadeTimer <= 0) {
          this.state = 'approaching';
        }
        break;
    }

    // Face movement direction
    if (this.velocity.lengthSq() > 0.1) {
      const lookTarget = this.mesh.position.clone().add(this.velocity.clone().normalize());
      this.mesh.lookAt(lookTarget);
    }

    // Apply drag and update position
    this.velocity.multiplyScalar(0.98);
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

    // Flash effect on hit
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this._resetFlash();
      }
    }
  }

  _steerToward(direction, dt) {
    const desired = direction.clone().normalize().multiplyScalar(ENEMY_SPEED);
    this.velocity.lerp(desired, 2 * dt);
  }

  takeDamage(amount) {
    this.health -= amount;
    this.flashTimer = 0.08;
    for (const m of this.flashMeshes) {
      if (m.material && m.material.emissive) {
        m.material.emissive.set(0xffffff);
      }
    }

    if (this.health <= 0) {
      this.active = false;
    }
  }

  reset() {
    this.active = false;
    this.mesh.position.set(0, -10000, 0);
    this.velocity.set(0, 0, 0);
    this._resetFlash();
  }
}
