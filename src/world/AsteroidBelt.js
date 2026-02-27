import * as THREE from 'three';

const NUM_VARIANTS = 5;

export class AsteroidBelt {
  constructor(config, systemCenter) {
    const {
      innerRadius, outerRadius, count, minSize, maxSize,
      beltThickness, orbitalSpeed,
    } = config;

    this.count = count;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.systemCenter = { x: systemCenter.x, y: systemCenter.y || 0, z: systemCenter.z || 0 };

    // Per-asteroid data arrays
    this.orbitDistances = new Float32Array(count);
    this.orbitAngles = new Float32Array(count);
    this.yOffsets = new Float32Array(count);
    this.radii = new Float32Array(count);
    this.speedFactors = new Float32Array(count);
    this.positions = new Float32Array(count * 3);

    // Non-uniform scale factors for visual variety (<=1 so collision sphere encompasses visual)
    this.scaleFactorsX = new Float32Array(count);
    this.scaleFactorsY = new Float32Array(count);
    this.scaleFactorsZ = new Float32Array(count);

    // Tumble data
    this.tumbleSpeeds = new Float32Array(count);
    this.tumbleAxes = new Float32Array(count * 3);
    this.tumbleAngles = new Float32Array(count);

    this.maxRadius = 0;

    const range = outerRadius - innerRadius;

    for (let i = 0; i < count; i++) {
      const orbitDist = innerRadius + Math.random() * range;
      this.orbitDistances[i] = orbitDist;
      this.orbitAngles[i] = Math.random() * Math.PI * 2;
      this.yOffsets[i] = ((Math.random() + Math.random()) / 2 - 0.5) * beltThickness;

      const t = Math.pow(Math.random(), 3);
      const radius = minSize + t * (maxSize - minSize);
      this.radii[i] = radius;
      if (radius > this.maxRadius) this.maxRadius = radius;

      const normalizedDist = (orbitDist - innerRadius) / range;
      this.speedFactors[i] = orbitalSpeed * (1.2 - 0.4 * normalizedDist) * (0.9 + Math.random() * 0.2);

      // Non-uniform scale: 0.55–1.0 so shapes vary but stay within collision sphere
      this.scaleFactorsX[i] = 0.55 + Math.random() * 0.45;
      this.scaleFactorsY[i] = 0.55 + Math.random() * 0.45;
      this.scaleFactorsZ[i] = 0.55 + Math.random() * 0.45;

      const ax = Math.random() - 0.5;
      const ay = Math.random() - 0.5;
      const az = Math.random() - 0.5;
      const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      this.tumbleAxes[i * 3] = ax / len;
      this.tumbleAxes[i * 3 + 1] = ay / len;
      this.tumbleAxes[i * 3 + 2] = az / len;
      this.tumbleSpeeds[i] = 0.2 + Math.random() * 1.8;
      this.tumbleAngles[i] = Math.random() * Math.PI * 2;
    }

    // Build geometry variants + material
    const geometries = this._createGeometryVariants();
    const texture = this._createRockTexture();

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.92,
      metalness: 0.12,
      flatShading: true,
    });

    // One InstancedMesh per variant, grouped together
    this.mesh = new THREE.Group();
    this._variants = [];

    const perVariant = Math.ceil(count / NUM_VARIANTS);
    const tmpColor = new THREE.Color();

    for (let v = 0; v < NUM_VARIANTS; v++) {
      const start = v * perVariant;
      const end = Math.min(start + perVariant, count);
      const n = end - start;
      if (n <= 0) continue;

      const instMesh = new THREE.InstancedMesh(geometries[v], material, n);
      instMesh.frustumCulled = false;

      // Per-instance color: warm gray-brown tones
      for (let j = 0; j < n; j++) {
        const hue = 0.06 + Math.random() * 0.05;
        const sat = 0.1 + Math.random() * 0.25;
        const light = 0.2 + Math.random() * 0.3;
        tmpColor.setHSL(hue, sat, light);
        instMesh.setColorAt(j, tmpColor);
      }
      instMesh.instanceColor.needsUpdate = true;

      this.mesh.add(instMesh);
      this._variants.push({ mesh: instMesh, startIdx: start, count: n });
    }

    this._dummy = new THREE.Object3D();
    this._axis = new THREE.Vector3();

    this._updatePositionsAndMatrices();
  }

  _createGeometryVariants() {
    const variants = [];

    for (let v = 0; v < NUM_VARIANTS; v++) {
      // Mix base shapes for silhouette variety
      let geo;
      if (v < 2) {
        geo = new THREE.IcosahedronGeometry(1, 2);
      } else if (v < 4) {
        geo = new THREE.DodecahedronGeometry(1, 2);
      } else {
        geo = new THREE.IcosahedronGeometry(1, 1);
      }

      // Per-variant seed for unique noise pattern
      const seed = v * 7.13;
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Multi-octave sine noise displacement
        const noise =
          0.2  * Math.sin(x * 3.7 + seed) * Math.cos(z * 4.3 + seed * 0.7) +
          0.15 * Math.sin(y * 5.1 + seed * 1.3) * Math.cos(x * 3.9 + z * 2.7) +
          0.08 * Math.sin(x * 9 + y * 7 + z * 11 + seed * 2.1) +
          (Math.random() - 0.5) * 0.12;

        const scale = 1 + noise;
        pos.setX(i, x * scale);
        pos.setY(i, y * scale);
        pos.setZ(i, z * scale);
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();
      variants.push(geo);
    }

    return variants;
  }

  _createRockTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base rock color
    ctx.fillStyle = '#8a7b6b';
    ctx.fillRect(0, 0, size, size);

    // Mottled spots — 3 layers, finer each pass
    for (let layer = 0; layer < 3; layer++) {
      const spotCount = 200 + layer * 150;
      for (let i = 0; i < spotCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * (8 - layer * 2) + 1;
        const gray = Math.floor(60 + Math.random() * 100);
        const brown = Math.floor(gray * (0.8 + Math.random() * 0.15));
        const alpha = 0.05 + Math.random() * 0.15;
        ctx.fillStyle = `rgba(${gray}, ${brown}, ${Math.floor(brown * 0.75)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dark crevice-like curves
    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle = `rgba(30, 25, 20, ${0.06 + Math.random() * 0.1})`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.quadraticCurveTo(
        Math.random() * size, Math.random() * size,
        Math.random() * size, Math.random() * size
      );
      ctx.stroke();
    }

    // Light mineral highlights
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 3 + 0.5;
      ctx.fillStyle = `rgba(180, 170, 155, ${0.05 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  _updatePositionsAndMatrices() {
    const cx = this.systemCenter.x;
    const cy = this.systemCenter.y;
    const cz = this.systemCenter.z;

    // Compute world positions for all asteroids (used by collision)
    for (let i = 0; i < this.count; i++) {
      const angle = this.orbitAngles[i];
      const dist = this.orbitDistances[i];
      this.positions[i * 3]     = cx + Math.cos(angle) * dist;
      this.positions[i * 3 + 1] = cy + this.yOffsets[i];
      this.positions[i * 3 + 2] = cz + Math.sin(angle) * dist;
    }

    // Update each variant's instance matrices
    for (const { mesh, startIdx, count: n } of this._variants) {
      for (let j = 0; j < n; j++) {
        const i = startIdx + j;
        const i3 = i * 3;

        this._dummy.position.set(
          this.positions[i3],
          this.positions[i3 + 1],
          this.positions[i3 + 2]
        );

        const r = this.radii[i];
        this._dummy.scale.set(
          r * this.scaleFactorsX[i],
          r * this.scaleFactorsY[i],
          r * this.scaleFactorsZ[i]
        );

        this._axis.set(
          this.tumbleAxes[i3],
          this.tumbleAxes[i3 + 1],
          this.tumbleAxes[i3 + 2]
        );
        this._dummy.quaternion.setFromAxisAngle(this._axis, this.tumbleAngles[i]);

        this._dummy.updateMatrix();
        mesh.setMatrixAt(j, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      this.orbitAngles[i] += this.speedFactors[i] * dt;
      this.tumbleAngles[i] += this.tumbleSpeeds[i] * dt;
    }
    this._updatePositionsAndMatrices();
  }

  getMinimapInfo() {
    return {
      type: 'asteroidBelt',
      innerRadius: this.innerRadius,
      outerRadius: this.outerRadius,
      systemCenter: this.systemCenter,
    };
  }
}
