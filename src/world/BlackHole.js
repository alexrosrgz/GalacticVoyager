import * as THREE from 'three';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { BLACK_HOLE } from '@/utils/Constants.js';

const fontPromise = new Promise((resolve) => {
  new TTFLoader().load('/fonts/Audiowide-Regular.ttf', (json) => {
    resolve(new Font(json));
  });
});

// ── Shader source ──────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(worldPos.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uBHCenter;
uniform float uEventHorizonRadius;
uniform float uDiskInnerRadius;
uniform float uDiskOuterRadius;
uniform vec3 uDiskNormal;  // tilted disk plane normal
uniform vec3 uDiskTangent; // basis vector in disk plane
uniform vec3 uDiskBitangent; // second basis vector in disk plane

varying vec3 vWorldPos;
varying vec3 vViewDir;

// Simple hash-based noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Accretion disk color: white-blue center → orange → red edges
vec3 diskColor(float t, float angle) {
  vec3 innerColor = vec3(1.5, 1.4, 1.8);
  vec3 midColor = vec3(1.2, 0.6, 0.1);
  vec3 outerColor = vec3(0.6, 0.1, 0.02);

  vec3 col;
  if (t < 0.3) {
    col = mix(innerColor, midColor, t / 0.3);
  } else {
    col = mix(midColor, outerColor, (t - 0.3) / 0.7);
  }

  float spiral = noise2D(vec2(angle * 2.0 + t * 5.0, t * 8.0 - uTime * 0.5));
  col *= 0.7 + spiral * 0.6;

  return col;
}

// Intersect ray with arbitrary plane defined by point + normal
float intersectPlane(vec3 ro, vec3 rd, vec3 planePoint, vec3 planeNormal) {
  float denom = dot(rd, planeNormal);
  if (abs(denom) < 0.0001) return -1.0;
  return dot(planePoint - ro, planeNormal) / denom;
}

// Project a point onto the disk plane and get 2D coordinates
vec2 diskCoords(vec3 point, vec3 center) {
  vec3 diff = point - center;
  return vec2(dot(diff, uDiskTangent), dot(diff, uDiskBitangent));
}

void main() {
  vec3 ro = vWorldPos;
  vec3 rd = normalize(vViewDir);

  vec3 oc = ro - uBHCenter;

  // Ray-sphere intersection with event horizon
  float a = dot(rd, rd);
  float b = 2.0 * dot(oc, rd);
  float c = dot(oc, oc) - uEventHorizonRadius * uEventHorizonRadius;
  float discriminant = b * b - 4.0 * a * c;

  bool hitsHorizon = false;
  float tHorizon = 1e10;
  if (discriminant >= 0.0) {
    float sqrtD = sqrt(discriminant);
    float t1 = (-b - sqrtD) / (2.0 * a);
    float t2 = (-b + sqrtD) / (2.0 * a);
    if (t1 > 0.0) { tHorizon = t1; hitsHorizon = true; }
    else if (t2 > 0.0) { tHorizon = t2; hitsHorizon = true; }
  }

  // Direct disk intersection (tilted plane)
  float tDisk = intersectPlane(ro, rd, uBHCenter, uDiskNormal);

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  // Check direct disk hit
  if (tDisk > 0.0 && (!hitsHorizon || tDisk < tHorizon)) {
    vec3 hitPos = ro + rd * tDisk;
    vec2 dc = diskCoords(hitPos, uBHCenter);
    float dist = length(dc);

    if (dist > uDiskInnerRadius && dist < uDiskOuterRadius) {
      float t = (dist - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius);
      float angle = atan(dc.y, dc.x);

      // Doppler shift: approaching side brighter
      vec3 radial = normalize(hitPos - uBHCenter - uDiskNormal * dot(hitPos - uBHCenter, uDiskNormal));
      vec3 diskTangent = cross(uDiskNormal, radial);
      float doppler = 1.0 + 0.3 * dot(rd, diskTangent);

      color += diskColor(t, angle) * doppler * (1.0 - t * 0.5);
      alpha = max(alpha, (1.0 - t * 0.6) * 0.95);
    }
  }

  // Gravitational lensing — deflected ray for wrapped appearance
  vec3 toCenter = uBHCenter - ro;
  float projLen = dot(toCenter, rd);
  vec3 closest = ro + rd * projLen - uBHCenter;
  float impactParam = length(closest);

  float lensRadius = uDiskOuterRadius * 1.5;
  if (impactParam < lensRadius && impactParam > uEventHorizonRadius * 0.5) {
    float schwarzschild = uEventHorizonRadius * 0.5;
    float deflection = 2.0 * schwarzschild / max(impactParam, schwarzschild);
    deflection = min(deflection, 1.2);

    vec3 bendDir = normalize(uBHCenter - (ro + rd * max(projLen, 0.0)));
    vec3 perpBend = bendDir - rd * dot(bendDir, rd);
    float perpLen = length(perpBend);
    if (perpLen > 0.001) {
      perpBend /= perpLen;
    }

    vec3 deflectedRd = normalize(rd + perpBend * deflection);

    // Second disk plane intersection with deflected ray
    float tDisk2 = intersectPlane(ro, deflectedRd, uBHCenter, uDiskNormal);
    if (tDisk2 > 0.0) {
      vec3 hitPos2 = ro + deflectedRd * tDisk2;
      vec2 dc2 = diskCoords(hitPos2, uBHCenter);
      float dist2 = length(dc2);

      if (dist2 > uDiskInnerRadius && dist2 < uDiskOuterRadius) {
        float t2 = (dist2 - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius);
        float angle2 = atan(dc2.y, dc2.x);

        vec3 radial2 = normalize(hitPos2 - uBHCenter - uDiskNormal * dot(hitPos2 - uBHCenter, uDiskNormal));
        vec3 diskTangent2 = cross(uDiskNormal, radial2);
        float doppler2 = 1.0 + 0.3 * dot(deflectedRd, diskTangent2);

        float lensedIntensity = (1.0 - deflection * 0.4) * 0.7;
        color += diskColor(t2, angle2) * doppler2 * lensedIntensity;
        alpha = max(alpha, lensedIntensity * 0.8);
      }
    }
  }

  // Event horizon: pure black
  if (hitsHorizon) {
    if (tDisk < 0.0 || tDisk > tHorizon) {
      color = vec3(0.0);
      alpha = 1.0;
    }
  }

  // Photon ring glow near event horizon
  float distToCenter = length(oc - rd * dot(oc, rd));
  float photonRingDist = abs(distToCenter - uEventHorizonRadius * 1.5);
  float photonGlow = exp(-photonRingDist * 0.05) * 0.4;
  color += vec3(1.0, 0.8, 0.5) * photonGlow;
  alpha = max(alpha, photonGlow);

  gl_FragColor = vec4(color, alpha);
}
`;

// ── BlackHole class ────────────────────────────────────────────────────

export class BlackHole {
  constructor({ isMobile = false } = {}) {
    const cfg = BLACK_HOLE;
    this.config = cfg;
    this.isMobile = isMobile;
    this.time = 0;

    // Root group
    this.mesh = new THREE.Group();
    this.mesh.position.set(cfg.position.x, cfg.position.y, cfg.position.z);

    // Tilt the disk plane for a more dramatic viewing angle
    this.mesh.rotation.x = 0.3;
    this.mesh.rotation.z = -0.25;

    // ── Main black hole visual ──
    if (isMobile) {
      this._createMobileFallback(cfg);
    } else {
      this._createShaderSphere(cfg);
    }

    // ── 3D label ──
    this._createLabel(cfg);
  }

  _createShaderSphere(cfg) {
    // Compute tilted disk basis vectors
    const normal = new THREE.Vector3(0, 1, 0);
    const euler = new THREE.Euler(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z);
    normal.applyEuler(euler).normalize();

    const tangent = new THREE.Vector3(1, 0, 0).applyEuler(euler).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const geometry = new THREE.SphereGeometry(cfg.shaderSphereRadius, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBHCenter: { value: new THREE.Vector3(cfg.position.x, cfg.position.y, cfg.position.z) },
        uEventHorizonRadius: { value: cfg.eventHorizonRadius },
        uDiskInnerRadius: { value: cfg.eventHorizonRadius * 1.5 },
        uDiskOuterRadius: { value: cfg.accretionDiskRadius },
        uDiskNormal: { value: normal },
        uDiskTangent: { value: tangent },
        uDiskBitangent: { value: bitangent },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    this.shaderMaterial = material;
    const sphere = new THREE.Mesh(geometry, material);
    this.mesh.add(sphere);
  }

  _createMobileFallback(cfg) {
    // Simple black sphere for event horizon
    const horizonGeo = new THREE.SphereGeometry(cfg.eventHorizonRadius, 32, 32);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    this.mesh.add(horizon);

    // Flat ring for accretion disk
    const ringGeo = new THREE.RingGeometry(cfg.eventHorizonRadius * 1.5, cfg.accretionDiskRadius, 64);
    const ringCanvas = this._createDiskTexture();
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.5;
    this.mesh.add(ring);
  }

  _createDiskTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0.0, 'rgba(200, 220, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 200, 100, 1)');
    grad.addColorStop(0.5, 'rgba(255, 120, 30, 0.8)');
    grad.addColorStop(1.0, 'rgba(150, 30, 5, 0.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, 1);
    return canvas;
  }

  async _createLabel(cfg) {
    const font = await fontPromise;
    const fontSize = 100;
    const depth = fontSize * 0.25;

    const textGeo = new TextGeometry(cfg.name, {
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
      color: cfg.labelColor,
      transparent: true,
      opacity: 0.9,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      color: cfg.labelColor,
      transparent: true,
      opacity: 0.45,
    });

    const textMesh = new THREE.Mesh(textGeo, [faceMat, sideMat]);
    textMesh.position.set(centerOffsetX, cfg.eventHorizonRadius * 1.6, 0);

    this.labelPivot = new THREE.Object3D();
    this.labelPivot.add(textMesh);
    this.mesh.add(this.labelPivot);
  }

  update(dt) {
    this.time += dt;

    // Update shader uniforms
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uTime.value = this.time;
    }
    // Rotate label
    if (this.labelPivot) {
      this.labelPivot.rotation.y += 0.4 * dt;
    }
  }

  getDistanceTo(pos) {
    return pos.distanceTo(this.mesh.position);
  }

  isInsideEventHorizon(pos) {
    return this.getDistanceTo(pos) < this.config.eventHorizonRadius;
  }

  getInfo() {
    return {
      name: this.config.name,
      position: this.mesh.position.clone(),
      radius: this.config.eventHorizonRadius,
      color: 0x000000,
      isStar: false,
      type: 'blackHole',
      warningRadius: this.config.warningRadius,
      accretionDiskRadius: this.config.accretionDiskRadius,
    };
  }
}
