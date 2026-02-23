import { PLANETS } from '@/utils/Constants.js';
import { CelestialBody } from '@/world/CelestialBody.js';

export class SolarSystem {
  constructor(scene) {
    this.bodies = PLANETS.map(config => {
      const body = new CelestialBody(config);
      scene.add(body.mesh);
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
