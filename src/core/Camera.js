import * as THREE from 'three';

export class Camera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100000
    );
    this.camera.position.set(0, 10, 30);
    this.camera.lookAt(0, 0, 0);

    this.offset = new THREE.Vector3(0, 6, 22);
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  follow(player, dt) {
    const offset = this.offset.clone().applyQuaternion(player.mesh.quaternion);
    const desiredPosition = player.mesh.position.clone().add(offset);

    this.camera.position.lerp(desiredPosition, 1 - Math.pow(0.001, dt));

    const lookTarget = player.mesh.position.clone()
      .add(player.getForward().multiplyScalar(50));
    this.camera.lookAt(lookTarget);

    // Apply screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const intensity = this.shakeIntensity * (this.shakeTimer / this.shakeDuration);
      this.camera.position.x += (Math.random() - 0.5) * intensity;
      this.camera.position.y += (Math.random() - 0.5) * intensity;
      this.camera.position.z += (Math.random() - 0.5) * intensity;
    }
  }

  shake(intensity = 2, duration = 0.15) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  getCamera() {
    return this.camera;
  }
}
