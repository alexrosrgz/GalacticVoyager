import * as THREE from 'three';

export class Lighting {
  constructor(scene) {
    // Physically-correct PointLight needs high intensity to illuminate
    // objects hundreds of units away (falloff is 1/distance²)
    this.sunLight = new THREE.PointLight(0xffffff, 2500000, 0);
    this.sunLight.position.set(0, 0, 0);
    scene.add(this.sunLight);

    // Ambient so objects on the far side of the sun aren't completely black
    this.ambientLight = new THREE.AmbientLight(0x334466, 2);
    scene.add(this.ambientLight);
  }
}
