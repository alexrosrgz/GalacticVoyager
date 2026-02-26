import * as THREE from 'three';
import { PLANETS, ALPHA_CENTAURI_BODIES, ALPHA_CENTAURI_CENTER } from '@/utils/Constants.js';
import { CelestialBody } from '@/world/CelestialBody.js';

export class SolarSystem {
  constructor(scene, { isMobile = false } = {}) {
    // Create Sol system bodies
    this.bodies = PLANETS.map(config => {
      const body = new CelestialBody(config);
      scene.add(body.mesh);

      // Orbital path ring for planets (not the Sun)
      if (config.distance > 0) {
        const line = this._createOrbitalLine(config.distance, { x: 0, y: 0, z: 0 }, isMobile);
        scene.add(line);
      }

      return body;
    });

    // Create Alpha Centauri bodies
    const acBodiesByName = {};
    const acBodies = ALPHA_CENTAURI_BODIES.map(config => {
      const bodyConfig = { ...config, systemOrigin: ALPHA_CENTAURI_CENTER };
      const body = new CelestialBody(bodyConfig);
      scene.add(body.mesh);
      acBodiesByName[config.name] = body;

      // Orbital path line for stars orbiting the barycenter
      if (config.distance > 0 && !config.parentStar) {
        const line = this._createOrbitalLine(config.distance, ALPHA_CENTAURI_CENTER, isMobile);
        scene.add(line);
      }
      return body;
    });

    // Wire parentBody references for planets orbiting specific stars
    for (let i = 0; i < ALPHA_CENTAURI_BODIES.length; i++) {
      const config = ALPHA_CENTAURI_BODIES[i];
      if (config.parentStar) {
        acBodies[i].parentBody = acBodiesByName[config.parentStar];
        // Add orbital line as child of the parent star mesh so it moves with the star
        const line = this._createOrbitalLine(config.distance, { x: 0, y: 0, z: 0 }, isMobile);
        acBodiesByName[config.parentStar].mesh.add(line);
      }
    }

    // Add all AC bodies to the main bodies array
    this.bodies.push(...acBodies);

    // Create lights for Alpha Centauri stars
    this.starLights = [];
    for (const body of acBodies) {
      const config = ALPHA_CENTAURI_BODIES.find(c => c.name === body.name);
      if (config && config.isStar) {
        const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 0);
        light.position.copy(body.mesh.position);
        scene.add(light);
        this.starLights.push({ light, body });
      }
    }
  }

  _createOrbitalLine(distance, center, isMobile) {
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        0,
        center.z + Math.sin(angle) * distance
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isMobile ? 0.2 : 0.08,
    });
    return new THREE.Line(geometry, material);
  }

  update(dt) {
    for (const body of this.bodies) {
      body.update(dt);
    }
    // Sync star light positions
    for (const { light, body } of this.starLights) {
      light.position.copy(body.mesh.position);
    }
  }

  getBodies() {
    return this.bodies.map(body => body.getInfo());
  }
}
