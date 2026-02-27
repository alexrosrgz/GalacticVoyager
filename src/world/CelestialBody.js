import * as THREE from 'three';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const textureLoader = new THREE.TextureLoader();

// Load Audiowide font once, shared by all bodies
const fontPromise = new Promise((resolve) => {
  new TTFLoader().load('/fonts/Audiowide-Regular.ttf', (json) => {
    resolve(new Font(json));
  });
});

export class CelestialBody {
  constructor(config) {
    this.name = config.name;
    this.distance = config.distance;
    this.orbitalSpeed = config.orbitalSpeed;
    this.orbitalAngle = config.initialAngle !== undefined
      ? config.initialAngle : Math.random() * Math.PI * 2;

    const geometry = new THREE.SphereGeometry(config.radius, 64, 64);

    let material;
    if (config.texture) {
      const texture = textureLoader.load(config.texture);
      texture.colorSpace = THREE.SRGBColorSpace;

      if (config.emissive) {
        material = new THREE.MeshBasicMaterial({ map: texture });
      } else {
        material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          metalness: 0.1,
        });
      }
    } else if (config.emissive) {
      material = new THREE.MeshBasicMaterial({ color: config.color });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.7,
        metalness: 0.1,
      });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(config.distance, 0, 0);

    this.rotationSpeed = config.rotationSpeed;
    this.radius = config.radius;
    this.color = config.color;
    this.parentBody = null;
    this.systemOrigin = config.systemOrigin || { x: 0, y: 0, z: 0 };
    this.isStar = config.isStar || false;
    this.eccentricity = config.eccentricity || 0;
    this.orbitalTilt = config.orbitalTilt || 0;
    this.orbitReversed = config.orbitReversed || false;
    this.minimapOrbitalPath = config.minimapOrbitalPath !== undefined
      ? config.minimapOrbitalPath : (config.distance > 0);
    this.minimapColorOverride = config.minimapColorOverride || null;

    if (config.rings) {
      const innerR = config.radius * 1.1;
      const outerR = config.radius * 2.3;
      const ringGeometry = new THREE.RingGeometry(innerR, outerR, 128);

      // Remap UVs so U goes 0→1 from inner to outer edge
      const pos = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
      }

      // Procedural ring texture with band structure and Cassini Division
      const ringTex = this._createRingTexture();
      const ringMaterial = new THREE.MeshBasicMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      // Saturn's axial tilt ~26.7°
      ring.rotation.x = Math.PI * 0.5 - 0.466;
      this.mesh.add(ring);
    }

    // 3D spinning label above the planet
    const neonColor = config.labelColor || '#aaaacc';
    this.labelPivot = new THREE.Object3D();
    this.mesh.add(this.labelPivot);
    this._createLabel3D(config.name, config.radius, neonColor);

    // Moons
    this.moons = [];
    if (config.moons) {
      this.moonPivot = new THREE.Object3D();
      this.mesh.add(this.moonPivot);

      for (const moonConfig of config.moons) {
        const moonGeo = new THREE.SphereGeometry(moonConfig.radius, 32, 32);
        let moonMat;
        if (moonConfig.texture) {
          const tex = textureLoader.load(moonConfig.texture);
          tex.colorSpace = THREE.SRGBColorSpace;
          moonMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0.1,
          });
        } else {
          moonMat = new THREE.MeshStandardMaterial({
            color: moonConfig.color,
            roughness: 0.8,
            metalness: 0.1,
          });
        }
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        const angle = Math.random() * Math.PI * 2;
        moonMesh.position.set(
          Math.cos(angle) * moonConfig.orbitRadius,
          0,
          Math.sin(angle) * moonConfig.orbitRadius
        );
        this.moonPivot.add(moonMesh);

        const moonNeon = '#' + new THREE.Color(moonConfig.color).getHexString();
        const moonLabelPivot = new THREE.Object3D();
        moonMesh.add(moonLabelPivot);
        this._createMoonLabel(moonConfig.name, moonConfig.radius, moonNeon, moonLabelPivot);

        this.moons.push({
          mesh: moonMesh,
          orbitRadius: moonConfig.orbitRadius,
          orbitSpeed: moonConfig.orbitSpeed,
          angle,
          labelPivot: moonLabelPivot,
        });
      }
    }

    // Atmosphere glow for all non-emissive bodies
    if (!config.emissive) {
      const glowGeometry = new THREE.SphereGeometry(config.radius * 1.15, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.07,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.mesh.add(glow);
    }
  }

  _createRingTexture() {
    const width = 1024;
    const height = 1;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Ring structure (position 0→1 maps inner→outer edge):
    //   D ring:  0.00–0.08  very faint
    //   C ring:  0.08–0.30  dim, warm gray
    //   B ring:  0.30–0.55  brightest, dense cream
    //   Cassini: 0.55–0.60  near-empty gap
    //   A ring:  0.60–0.85  moderate density
    //   Encke:   0.72–0.73  thin gap in A ring
    //   F ring:  0.92–0.95  thin faint outer ring

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      const t = x / width; // 0→1 inner to outer
      let r, g, b, a;

      if (t < 0.08) {
        // D ring — very faint
        r = 140; g = 130; b = 110; a = 20;
      } else if (t < 0.30) {
        // C ring — dim, slightly transparent
        const f = (t - 0.08) / 0.22;
        r = 150 + f * 30; g = 140 + f * 25; b = 115 + f * 15;
        a = 40 + f * 60;
      } else if (t < 0.55) {
        // B ring — brightest and densest
        const f = (t - 0.30) / 0.25;
        r = 210 + f * 15; g = 195 + f * 10; b = 160 - f * 10;
        // Slight variation for texture
        const noise = Math.sin(f * 40) * 10;
        r += noise; g += noise * 0.7;
        a = 180 + f * 40;
      } else if (t < 0.60) {
        // Cassini Division — dark gap
        r = 50; g = 45; b = 40; a = 12;
      } else if (t < 0.85) {
        // A ring — moderate
        const f = (t - 0.60) / 0.25;
        r = 190 - f * 30; g = 175 - f * 25; b = 145 - f * 20;
        const noise = Math.sin(f * 30) * 8;
        r += noise; g += noise * 0.6;
        a = 140 - f * 40;

        // Encke gap
        if (t > 0.72 && t < 0.73) {
          a = 10;
        }
      } else if (t > 0.92 && t < 0.95) {
        // F ring — thin outer ring
        r = 170; g = 160; b = 140; a = 50;
      } else {
        // Empty space
        r = 0; g = 0; b = 0; a = 0;
      }

      const i = x * 4;
      data[i]     = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = Math.max(0, Math.min(255, a));
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  async _createMoonLabel(name, radius, neonColor, pivot) {
    const font = await fontPromise;
    const fontSize = Math.max(radius * 0.5, 1.2);
    const depth = fontSize * 0.2;

    const textGeo = new TextGeometry(name, {
      font,
      size: fontSize,
      depth,
      curveSegments: 4,
      bevelEnabled: false,
    });
    textGeo.computeBoundingBox();
    const bb = textGeo.boundingBox;
    const centerOffsetX = -(bb.max.x - bb.min.x) / 2;

    const mat = new THREE.MeshBasicMaterial({
      color: neonColor,
      transparent: true,
      opacity: 0.7,
    });

    const textMesh = new THREE.Mesh(textGeo, mat);
    textMesh.position.set(centerOffsetX, radius * 1.6, 0);
    pivot.add(textMesh);
  }

  async _createLabel3D(name, radius, neonColor) {
    const font = await fontPromise;

    // Scale text size relative to planet, with min/max bounds
    const fontSize = Math.max(Math.min(radius * 0.35, 8), 2);
    const depth = fontSize * 0.25;

    const textGeo = new TextGeometry(name, {
      font,
      size: fontSize,
      depth,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: depth * 0.15,
      bevelSize: depth * 0.1,
      bevelSegments: 3,
    });

    // Center the text horizontally
    textGeo.computeBoundingBox();
    const bb = textGeo.boundingBox;
    const centerOffsetX = -(bb.max.x - bb.min.x) / 2;

    const faceMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      transparent: true,
      opacity: 0.9,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      transparent: true,
      opacity: 0.45,
    });

    const textMesh = new THREE.Mesh(textGeo, [faceMat, sideMat]);
    textMesh.position.set(centerOffsetX, radius * 1.4, 0);

    this.labelPivot.add(textMesh);
  }

  update(dt) {
    this.mesh.rotation.y += this.rotationSpeed * dt;

    // Counter-rotate the label pivot so it spins independently at a steady rate,
    // not affected by the planet's own rotation
    if (this.labelPivot) {
      this.labelPivot.rotation.y -= this.rotationSpeed * dt;
      this.labelPivot.rotation.y += 0.4 * dt;
    }

    // Counter-rotate moon pivot against planet spin so moons orbit independently
    if (this.moonPivot) {
      this.moonPivot.rotation.y -= this.rotationSpeed * dt;
    }

    // Update moon positions
    for (const moon of this.moons) {
      moon.angle += moon.orbitSpeed * dt;
      moon.mesh.position.set(
        Math.cos(moon.angle) * moon.orbitRadius,
        0,
        Math.sin(moon.angle) * moon.orbitRadius
      );
      // Counter-rotate moon label against all parent rotations
      if (moon.labelPivot) {
        moon.labelPivot.rotation.y = -moon.angle;
      }
    }

    if (this.distance > 0) {
      this.orbitalAngle += this.orbitalSpeed * dt;
      const baseX = this.parentBody ? this.parentBody.mesh.position.x : this.systemOrigin.x;
      const baseY = this.parentBody ? this.parentBody.mesh.position.y : 0;
      const baseZ = this.parentBody ? this.parentBody.mesh.position.z : this.systemOrigin.z;

      let r, theta;
      if (this.eccentricity > 0) {
        const e = this.eccentricity;
        const M = this.orbitalAngle % (Math.PI * 2);
        const E = this._solveKepler(M, e);
        const cosE = Math.cos(E);
        const sinE = Math.sin(E);
        const denom = 1 - e * cosE;
        theta = Math.atan2(Math.sqrt(1 - e * e) * sinE / denom, (cosE - e) / denom);
        r = this.distance * (1 - e * cosE);
      } else {
        theta = this.orbitalAngle;
        r = this.distance;
      }

      const sign = this.orbitReversed ? -1 : 1;
      const xLocal = sign * r * Math.cos(theta);
      const zLocal = sign * r * Math.sin(theta);

      this.mesh.position.x = baseX + xLocal;
      if (this.orbitalTilt) {
        this.mesh.position.y = baseY + zLocal * Math.sin(this.orbitalTilt);
        this.mesh.position.z = baseZ + zLocal * Math.cos(this.orbitalTilt);
      } else {
        this.mesh.position.y = baseY;
        this.mesh.position.z = baseZ + zLocal;
      }
    } else if (this.systemOrigin.x !== 0 || this.systemOrigin.z !== 0) {
      this.mesh.position.x = this.systemOrigin.x;
      this.mesh.position.z = this.systemOrigin.z;
    }
  }

  _solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  getInfo() {
    return {
      name: this.name,
      position: this.mesh.position.clone(),
      radius: this.radius,
      color: this.color,
      isStar: this.isStar,
      minimapOrbitalPath: this.minimapOrbitalPath,
      minimapColorOverride: this.minimapColorOverride,
      systemCenter: this.systemOrigin,
    };
  }
}
