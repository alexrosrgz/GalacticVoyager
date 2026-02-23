import * as THREE from 'three';
import { PROJECTILE_SPEED, PROJECTILE_LIFETIME } from '@/utils/Constants.js';

const geometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 6);
geometry.rotateX(Math.PI / 2);

const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

export class Projectile {
  constructor() {
    this.mesh = new THREE.Mesh(geometry, playerMaterial);
    this.velocity = new THREE.Vector3();
    this.lifetime = 0;
    this.active = false;
    this.source = 'player';
  }

  init(position, direction, source) {
    this.mesh.position.copy(position);
    this.velocity.copy(direction).normalize().multiplyScalar(PROJECTILE_SPEED);
    this.lifetime = PROJECTILE_LIFETIME;
    this.active = true;
    this.source = source;
    this.mesh.material = source === 'player' ? playerMaterial : enemyMaterial;
    this.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      direction.clone().normalize()
    );
  }

  update(dt) {
    if (!this.active) return;

    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.active = false;
    }
  }

  reset() {
    this.active = false;
    this.mesh.position.set(0, -10000, 0);
    this.velocity.set(0, 0, 0);
  }
}
