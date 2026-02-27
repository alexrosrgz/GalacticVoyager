import * as THREE from 'three';
import { STAR_SYSTEMS, INTERSTELLAR_SPACE_NAME } from '@/utils/Constants.js';
import { CelestialBody } from '@/world/CelestialBody.js';
import { AsteroidBelt } from '@/world/AsteroidBelt.js';

export class SolarSystem {
  constructor(scene, { isMobile = false } = {}) {
    this.bodies = [];
    this.starLights = [];
    this.asteroidBelts = [];
    this.systems = STAR_SYSTEMS;

    for (const system of STAR_SYSTEMS) {
      const center = system.center;
      const bodiesByName = {};
      const systemBodies = [];

      // Create all bodies in this system
      for (const config of system.bodies) {
        const bodyConfig = { ...config, systemOrigin: center };
        const body = new CelestialBody(bodyConfig);
        scene.add(body.mesh);
        bodiesByName[config.name] = body;
        systemBodies.push(body);

        // Orbital line for bodies orbiting the barycenter (not a parent star)
        if (config.distance > 0 && !config.parentStar) {
          const line = this._createOrbitalLine(config.distance, center, isMobile, {
            eccentricity: config.eccentricity || 0,
            reversed: config.orbitReversed || false,
            tilt: config.orbitalTilt || 0,
          });
          scene.add(line);
        }
      }

      // Wire parent-child relationships
      for (let i = 0; i < system.bodies.length; i++) {
        const config = system.bodies[i];
        if (config.parentStar) {
          systemBodies[i].parentBody = bodiesByName[config.parentStar];
          const line = this._createOrbitalLine(config.distance, { x: 0, y: 0, z: 0 }, isMobile);
          bodiesByName[config.parentStar].mesh.add(line);
        }
      }

      // Create PointLights for stars
      for (const body of systemBodies) {
        const config = system.bodies.find(c => c.name === body.name);
        if (config && config.isStar && config.lightIntensity) {
          const light = new THREE.PointLight(config.lightColor || 0xffffff, config.lightIntensity, 0);
          light.position.copy(body.mesh.position);
          scene.add(light);
          this.starLights.push({ light, body });
        }
      }

      // Create asteroid belt if defined
      if (system.asteroidBelt) {
        const belt = new AsteroidBelt(system.asteroidBelt, center);
        scene.add(belt.mesh);
        this.asteroidBelts.push(belt);
      }

      this.bodies.push(...systemBodies);
    }
  }

  getSystemAt(position) {
    for (const system of this.systems) {
      const dx = position.x - system.center.x;
      const dy = position.y - (system.center.y || 0);
      const dz = position.z - (system.center.z || 0);
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < system.boundaryRadius) {
        return system.name;
      }
    }
    return INTERSTELLAR_SPACE_NAME;
  }

  _createOrbitalLine(distance, center, isMobile, { eccentricity = 0, tilt = 0, reversed = false } = {}) {
    const segments = 128;
    const points = [];
    const sign = reversed ? -1 : 1;
    const e = eccentricity;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = e > 0 ? distance * (1 - e * e) / (1 + e * Math.cos(theta)) : distance;
      const xLocal = sign * r * Math.cos(theta);
      const zLocal = sign * r * Math.sin(theta);
      const x = center.x + xLocal;
      const y = tilt ? zLocal * Math.sin(tilt) : 0;
      const z = center.z + (tilt ? zLocal * Math.cos(tilt) : zLocal);
      points.push(new THREE.Vector3(x, y, z));
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
    for (const belt of this.asteroidBelts) {
      belt.update(dt);
    }
    // Sync star light positions
    for (const { light, body } of this.starLights) {
      light.position.copy(body.mesh.position);
    }
  }

  getBodies() {
    const infos = this.bodies.map(body => body.getInfo());
    for (const belt of this.asteroidBelts) {
      infos.push(belt.getMinimapInfo());
    }
    return infos;
  }
}
