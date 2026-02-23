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

// Soft neon tints per planet
const NEON_COLORS = {
  Sun:     '#ffcc66',
  Mercury: '#bbbbcc',
  Venus:   '#e8d8a8',
  Earth:   '#66aaff',
  Mars:    '#ff8866',
  Jupiter: '#eebb88',
  Saturn:  '#ddcc88',
  Uranus:  '#88ddee',
  Neptune: '#7788ee',
};

export class CelestialBody {
  constructor(config) {
    this.name = config.name;
    this.distance = config.distance;
    this.orbitalSpeed = config.orbitalSpeed;
    this.orbitalAngle = Math.random() * Math.PI * 2;

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

    if (config.rings) {
      const ringGeometry = new THREE.RingGeometry(
        config.radius * 1.3,
        config.radius * 2.0,
        64
      );
      const pos = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      const innerR = config.radius * 1.3;
      const outerR = config.radius * 2.0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
      }

      let ringMaterial;
      if (config.ringTexture) {
        const ringTex = textureLoader.load(config.ringTexture);
        ringTex.colorSpace = THREE.SRGBColorSpace;
        ringMaterial = new THREE.MeshStandardMaterial({
          map: ringTex,
          alphaMap: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          roughness: 0.8,
        });
      } else {
        ringMaterial = new THREE.MeshStandardMaterial({
          color: 0xaa9966,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
          roughness: 0.8,
        });
      }
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI * 0.4;
      this.mesh.add(ring);
    }

    // 3D spinning label above the planet
    const neonColor = NEON_COLORS[config.name] || '#aaaacc';
    this.labelPivot = new THREE.Object3D();
    this.mesh.add(this.labelPivot);
    this._createLabel3D(config.name, config.radius, neonColor);

    // Atmosphere glow for non-emissive bodies
    if (!config.emissive && config.radius > 5) {
      const glowGeometry = new THREE.SphereGeometry(config.radius * 1.15, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.mesh.add(glow);
    }
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

    if (this.distance > 0) {
      this.orbitalAngle += this.orbitalSpeed * dt;
      this.mesh.position.x = Math.cos(this.orbitalAngle) * this.distance;
      this.mesh.position.z = Math.sin(this.orbitalAngle) * this.distance;
    }
  }

  getInfo() {
    return {
      name: this.name,
      position: this.mesh.position.clone(),
      radius: this.radius,
    };
  }
}
