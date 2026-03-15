import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const fontPromise = new Promise((resolve) => {
  new TTFLoader().load('/fonts/Audiowide-Regular.ttf', (json) => {
    resolve(new Font(json));
  });
});

export class SpaceStation {
  constructor(config, scene) {
    this.name = config.name;
    this.orbitBodyName = config.orbitBody || null;
    this.orbitBody = null;
    this.offset = config.offset ? new THREE.Vector3(config.offset.x, config.offset.y, config.offset.z) : null;
    this.orbitDistance = config.orbitDistance || 0;
    this.orbitSpeed = config.orbitSpeed || 0;
    this.orbitCenter = config.orbitCenter ? new THREE.Vector3(config.orbitCenter.x, config.orbitCenter.y, config.orbitCenter.z) : null;
    this.orbitalAngle = Math.random() * Math.PI * 2;
    this.position = config.position
      ? new THREE.Vector3(config.position.x, config.position.y, config.position.z)
      : new THREE.Vector3();
    this.rotationSpeed = config.rotationSpeed || 0.05;
    this.scale = config.scale || 1;
    this.boundingRadius = config.boundingRadius || 50;
    this.color = config.color || 0x88aacc;
    this.labelColor = config.labelColor || '#88ccff';
    this.loaded = false;

    // Root container
    this.mesh = new THREE.Object3D();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    // Load glTF model
    const loader = new GLTFLoader();
    loader.load(config.modelPath, (gltf) => {
      this.model = gltf.scene;
      this.model.scale.setScalar(this.scale);

      // Use PBR materials from the model but ensure they work with scene lighting
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          // Boost emissive slightly so station windows glow through bloom
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = Math.max(child.material.emissiveIntensity || 0, 0.3);
          }
        }
      });

      this.mesh.add(this.model);
      this.loaded = true;

      // Compute actual bounding radius from model geometry
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);
      this.boundingRadius = Math.max(size.x, size.y, size.z) / 2;
    });

    // 3D label
    this._createLabel();
  }

  async _createLabel() {
    const font = await fontPromise;
    const fontSize = Math.max(Math.min(this.boundingRadius * 0.15, 8), 2);
    const depth = fontSize * 0.25;

    const textGeo = new TextGeometry(this.name, {
      font,
      size: fontSize,
      depth,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: depth * 0.15,
      bevelSize: depth * 0.1,
      bevelSegments: 3,
    });

    textGeo.computeBoundingBox();
    const bb = textGeo.boundingBox;
    const centerOffsetX = -(bb.max.x - bb.min.x) / 2;

    const faceMat = new THREE.MeshBasicMaterial({
      color: this.labelColor,
      transparent: true,
      opacity: 0.9,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      color: this.labelColor,
      transparent: true,
      opacity: 0.45,
    });

    const textMesh = new THREE.Mesh(textGeo, [faceMat, sideMat]);
    textMesh.position.set(centerOffsetX, this.boundingRadius * 1.4, 0);

    this.labelPivot = new THREE.Object3D();
    this.labelPivot.add(textMesh);
    this.mesh.add(this.labelPivot);
  }

  update(dt) {
    // Follow orbit body if assigned
    if (this.orbitBody) {
      this.mesh.position.copy(this.orbitBody.mesh.position).add(this.offset);
    } else if (this.orbitDistance > 0 && this.orbitCenter) {
      this.orbitalAngle += this.orbitSpeed * dt;
      this.mesh.position.set(
        this.orbitCenter.x + Math.cos(this.orbitalAngle) * this.orbitDistance,
        this.orbitCenter.y,
        this.orbitCenter.z + Math.sin(this.orbitalAngle) * this.orbitDistance
      );
    }

    // Slow majestic rotation
    if (this.model) {
      this.model.rotation.y += this.rotationSpeed * dt;
    }
    // Counter-rotate label so it always faces outward and spins gently
    if (this.labelPivot) {
      if (this.model) {
        this.labelPivot.rotation.y = -this.model.rotation.y + 0.4 * performance.now() * 0.001;
      }
    }
  }

  getInfo() {
    return {
      name: this.name,
      position: this.mesh.position.clone(),
      radius: this.boundingRadius,
      color: this.color,
      isStar: false,
      isStation: true,
      minimapOrbitalPath: false,
      minimapColorOverride: null,
    };
  }
}
