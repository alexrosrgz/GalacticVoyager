import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    this.ambientLight = new THREE.AmbientLight(0x334466, 2);
    scene.add(this.ambientLight);
  }
}
