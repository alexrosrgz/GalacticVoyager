import * as THREE from 'three';
import { PLANETS } from '@/utils/Constants.js';
import { CelestialBody } from '@/world/CelestialBody.js';

export class SolarSystem {
  constructor(scene, { isMobile = false } = {}) {
    this.bodies = PLANETS.map(config => {
      const body = new CelestialBody(config);
      scene.add(body.mesh);

      // Orbital path ring for planets (not the Sun)
      if (config.distance > 0) {
        const segments = 128;
        const points = [];
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(
            Math.cos(angle) * config.distance,
            0,
            Math.sin(angle) * config.distance
          ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: isMobile ? 0.2 : 0.08,
        });
        scene.add(new THREE.Line(geometry, material));
      }

      return body;
    });
  }

  update(dt) {
    for (const body of this.bodies) {
      body.update(dt);
    }
  }

  getBodies() {
    return this.bodies.map(body => body.getInfo());
  }
}
