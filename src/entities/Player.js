import * as THREE from 'three';
import {
  PLAYER_SPEED,
  PLAYER_BOOST_MULTIPLIER,
  PLAYER_MAX_HEALTH,
  PLAYER_DRAG,
  PLAYER_ROTATION_SPEED,
  PLAYER_ROLL_SPEED,
  PLAYER_FIRE_RATE,
} from '@/utils/Constants.js';
import { loadModel } from '@/utils/ModelLoader.js';

export class Player {
  constructor() {
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.boundingRadius = 5;
    this.modelLoaded = false;

    this._buildPlaceholder();
    this._buildEngineTrail();
    this._loadModel();

    // Start near Earth
    this.mesh.position.set(350, 20, 0);
    this.isThrusting = false;
  }

  _buildPlaceholder() {
    // Simple placeholder visible until OBJ model loads
    const mat = new THREE.MeshStandardMaterial({ color: 0x4488cc, metalness: 0.6, roughness: 0.3 });
    this.placeholder = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 8), mat);
    this.placeholder.rotation.x = Math.PI / 2;
    this.mesh.add(this.placeholder);
  }

  async _loadModel() {
    try {
      const model = await loadModel(
        '/models/striker/Striker.obj',
        '/models/striker/Striker_Blue.png',
        1.8
      );
      // OBJ model faces +Z, we need it to face -Z (our forward direction)
      model.rotation.y = Math.PI;
      this.mesh.remove(this.placeholder);
      this.mesh.add(model);
      this.modelLoaded = true;
    } catch (e) {
      console.warn('Failed to load player model, keeping placeholder:', e);
    }
  }

  _buildEngineTrail() {
    const trailCount = 30;
    const positions = new Float32Array(trailCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.trailMaterial = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    this.trail = new THREE.Points(geometry, this.trailMaterial);
    this.trailPositions = [];
    this.trailCount = trailCount;
  }

  updateTrail() {
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();
    const trailPos = this.mesh.position.clone().add(backward.multiplyScalar(6));

    this.trailPositions.unshift(trailPos);
    if (this.trailPositions.length > this.trailCount) {
      this.trailPositions.pop();
    }

    const posAttr = this.trail.geometry.getAttribute('position');
    for (let i = 0; i < this.trailCount; i++) {
      if (i < this.trailPositions.length) {
        posAttr.array[i * 3]     = this.trailPositions[i].x;
        posAttr.array[i * 3 + 1] = this.trailPositions[i].y;
        posAttr.array[i * 3 + 2] = this.trailPositions[i].z;
      } else {
        posAttr.array[i * 3]     = trailPos.x;
        posAttr.array[i * 3 + 1] = trailPos.y;
        posAttr.array[i * 3 + 2] = trailPos.z;
      }
    }
    posAttr.needsUpdate = true;

    this.trailMaterial.opacity = this.isThrusting ? 0.7 : 0.15;
  }

  update(dt, input) {
    // Rotation from mouse
    const mouseDelta = input.getMouseDelta();
    const yaw = -mouseDelta.x * PLAYER_ROTATION_SPEED;
    const pitch = -mouseDelta.y * PLAYER_ROTATION_SPEED;

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion).normalize(),
      yaw
    );
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize(),
      pitch
    );

    this.mesh.quaternion.premultiply(yawQuat);
    this.mesh.quaternion.premultiply(pitchQuat);

    // Roll with A/D
    if (input.isKeyDown('KeyA')) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        this.getForward(),
        PLAYER_ROLL_SPEED * dt
      );
      this.mesh.quaternion.premultiply(rollQuat);
    }
    if (input.isKeyDown('KeyD')) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        this.getForward(),
        -PLAYER_ROLL_SPEED * dt
      );
      this.mesh.quaternion.premultiply(rollQuat);
    }

    // Thrust
    const forward = this.getForward();
    let thrustPower = 0;

    if (input.isKeyDown('KeyW')) {
      thrustPower = PLAYER_SPEED;
      if (input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight')) {
        thrustPower *= PLAYER_BOOST_MULTIPLIER;
      }
    }
    if (input.isKeyDown('KeyS')) {
      thrustPower = -PLAYER_SPEED * 0.5;
    }

    this.isThrusting = thrustPower > 0;

    if (thrustPower !== 0) {
      this.velocity.add(forward.multiplyScalar(thrustPower * dt));
    }

    // Drag
    this.velocity.multiplyScalar(PLAYER_DRAG);

    // Update position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

    // Fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    input.resetMouseDelta();
  }

  canFire() {
    return this.fireCooldown <= 0;
  }

  fire(projectileManager) {
    if (!this.canFire()) return;

    this.fireCooldown = PLAYER_FIRE_RATE;

    const forward = this.getForward();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize();

    // Dual lasers offset left and right
    const leftOrigin = this.mesh.position.clone()
      .add(right.clone().multiplyScalar(-3))
      .add(forward.clone().multiplyScalar(8));
    const rightOrigin = this.mesh.position.clone()
      .add(right.clone().multiplyScalar(3))
      .add(forward.clone().multiplyScalar(8));

    projectileManager.fire(leftOrigin, forward.clone(), 'player');
    projectileManager.fire(rightOrigin, forward.clone(), 'player');
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize();
  }

  getSpeed() {
    return this.velocity.length();
  }

  reset() {
    this.mesh.position.set(350, 20, 0);
    this.mesh.quaternion.identity();
    this.velocity.set(0, 0, 0);
    this.health = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
  }
}
