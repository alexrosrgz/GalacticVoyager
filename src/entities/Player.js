import * as THREE from 'three';
import {
  PLAYER_SPEED,
  PLAYER_BOOST_MULTIPLIER,
  PLAYER_MAX_HEALTH,
  PLAYER_DRAG,
  PLAYER_ROTATION_SPEED,
  PLAYER_ROLL_SPEED,
  PLAYER_FIRE_RATE,
} from '@/utils/Constants.js';
import { loadModel } from '@/utils/ModelLoader.js';

export class Player {
  constructor() {
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.boundingRadius = 5;
    this.modelLoaded = false;

    this._buildPlaceholder();
    this._buildEngineCone();
    this._loadModel();

    // Start near Earth
    this.mesh.position.set(350, 20, 0);
    this.isThrusting = false;
    this.isBoosting = false;
  }

  _buildPlaceholder() {
    // Simple placeholder visible until OBJ model loads
    const mat = new THREE.MeshBasicMaterial({ color: 0x4488cc });
    this.placeholder = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 8), mat);
    this.placeholder.rotation.x = Math.PI / 2;
    this.mesh.add(this.placeholder);
  }

  async _loadModel() {
    try {
      const model = await loadModel(
        '/models/striker/Striker.obj',
        '/models/striker/Striker_Blue.png',
        1.8
      );
      // OBJ model faces +Z, we need it to face -Z (our forward direction)
      model.rotation.y = Math.PI;
      this.mesh.remove(this.placeholder);
      this.mesh.add(model);
      this.modelLoaded = true;
    } catch (e) {
      console.warn('Failed to load player model, keeping placeholder:', e);
    }
  }

  _buildEngineCone() {
    this._engineTime = 0;

    // Shared shaders — gradient fade, vertex wobble, flicker
    const vertShader = `
      uniform float uTime;
      uniform float uDisplace;
      varying float vGradient;
      void main() {
        vGradient = uv.y;
        float wobble = sin(position.y * 4.0 + uTime * 12.0)
                     * cos(position.x * 5.0 + uTime * 8.0);
        vec3 pos = position + normal * wobble * uDisplace * (1.0 - uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
    const fragShader = `
      uniform vec3 uColorHot;
      uniform vec3 uColorCool;
      uniform float uOpacity;
      uniform float uTime;
      varying float vGradient;
      void main() {
        float alpha = pow(1.0 - vGradient, 0.7) * uOpacity;
        vec3 col = mix(uColorHot, uColorCool, pow(vGradient, 0.5));
        float flicker = 1.0 + sin(uTime * 30.0) * 0.06 + sin(uTime * 47.0) * 0.04;
        alpha *= flicker;
        gl_FragColor = vec4(col, alpha);
      }
    `;

    // Outer cone — glow envelope (4 height segments for displacement)
    this.outerConeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.15 },
        uColorHot: { value: new THREE.Color(0xffeedd) },
        uColorCool: { value: new THREE.Color(0xff4400) },
        uDisplace: { value: 0.05 },
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.outerCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.25, 5, 16, 12, true),
      this.outerConeMat
    );
    this.outerCone.rotation.x = Math.PI / 2;
    this.outerCone.position.z = 6 + 2.5;
    this.mesh.add(this.outerCone);

    // Inner cone — hot core
    this.innerConeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.12 },
        uColorHot: { value: new THREE.Color(0xffffff) },
        uColorCool: { value: new THREE.Color(0xffaa44) },
        uDisplace: { value: 0.03 },
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.innerCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 4, 12, 12, true),
      this.innerConeMat
    );
    this.innerCone.rotation.x = Math.PI / 2;
    this.innerCone.position.z = 6 + 2;
    this.mesh.add(this.innerCone);

    this._outerConeBaseLen = 5;
    this._innerConeBaseLen = 4;

    // Nozzle glow sprite (procedural soft circle)
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,200,100,1)');
    g.addColorStop(0.3, 'rgba(255,120,40,0.5)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    this.nozzleGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }));
    this.nozzleGlow.scale.set(0.5, 0.5, 1);
    this.nozzleGlow.position.z = 6;
    this.mesh.add(this.nozzleGlow);

    // Exhaust particles — 6 soft sparks drifting in local space
    const pCount = 6;
    this._exhaustData = [];
    for (let i = 0; i < pCount; i++) {
      this._exhaustData.push({ life: 0, maxLife: 0.8 + Math.random() * 0.7 });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pCount * 3), 3));
    pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(pCount), 1));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(pCount), 1));
    this._exhaustMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xff8844) } },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 200.0 / length(mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float falloff = 1.0 - smoothstep(0.0, 1.0, d);
          gl_FragColor = vec4(uColor, vAlpha * falloff);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this._exhaustPoints = new THREE.Points(pGeo, this._exhaustMat);
    this._exhaustPoints.frustumCulled = false;
    this.mesh.add(this._exhaustPoints);

    // Store original cone vertex positions for curve deformation
    this._outerOrigPos = new Float32Array(this.outerCone.geometry.getAttribute('position').array);
    this._innerOrigPos = new Float32Array(this.innerCone.geometry.getAttribute('position').array);
    this._dirHistory = [];
    this._dirHistoryMax = 30;

    // Initial idle state
    this._coneScaleY = 0.1;
    this._coneScaleXZ = 0.1;
    this._outerOpacity = 0;
    this._innerOpacity = 0;
    this._nozzleOpacity = 0;
    this._applyConeState();
  }

  _applyConeState() {
    this.outerCone.scale.set(this._coneScaleXZ, this._coneScaleY, this._coneScaleXZ);
    this.innerCone.scale.set(this._coneScaleXZ, this._coneScaleY, this._coneScaleXZ);
    this.outerConeMat.uniforms.uOpacity.value = this._outerOpacity;
    this.innerConeMat.uniforms.uOpacity.value = this._innerOpacity;
    this.outerCone.position.z = 6 + (this._outerConeBaseLen * this._coneScaleY) / 2;
    this.innerCone.position.z = 6 + (this._innerConeBaseLen * this._coneScaleY) / 2;
    this.nozzleGlow.material.opacity = this._nozzleOpacity;
  }

  _updateDirHistory() {
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    this._dirHistory.unshift(backward);
    if (this._dirHistory.length > this._dirHistoryMax) this._dirHistory.pop();
  }

  _curveCones() {
    if (this._dirHistory.length < 2) {
      this._restoreOriginalPositions(this.outerCone, this._outerOrigPos);
      this._restoreOriginalPositions(this.innerCone, this._innerOrigPos);
      return;
    }
    this._applyCurveToMesh(this.outerCone, this._outerOrigPos, this._outerConeBaseLen, 17, 13);
    this._applyCurveToMesh(this.innerCone, this._innerOrigPos, this._innerConeBaseLen, 13, 13);
  }

  _applyCurveToMesh(coneMesh, origPosArray, baseHeight, vertsPerRing, numRings) {
    const posAttr = coneMesh.geometry.getAttribute('position');
    const sY = this._coneScaleY;
    const sXZ = this._coneScaleXZ;
    const worldLength = baseHeight * sY;

    const hist = this._dirHistory;
    const numSteps = hist.length;
    const stepLen = worldLength / numSteps;

    // Inverse quaternion: world → mesh-local
    const invQuat = this.mesh.quaternion.clone().conjugate();
    const qx = invQuat.x, qy = invQuat.y, qz = invQuat.z, qw = invQuat.w;

    for (let ring = 0; ring < numRings; ring++) {
      const t = 1 - ring / (numRings - 1); // 1 at tip (ring 0), 0 at base

      if (t < 0.001) {
        // Base ring — no offset, restore original
        const start = ring * vertsPerRing * 3;
        for (let v = 0; v < vertsPerRing; v++) {
          const idx = start + v * 3;
          posAttr.array[idx]     = origPosArray[idx];
          posAttr.array[idx + 1] = origPosArray[idx + 1];
          posAttr.array[idx + 2] = origPosArray[idx + 2];
        }
        continue;
      }

      // Integrate curved spine through direction history
      const stepsToTake = t * numSteps;
      const fullSteps = Math.min(Math.floor(stepsToTake), numSteps);
      let cx = 0, cy = 0, cz = 0;

      for (let s = 0; s < fullSteps; s++) {
        cx += hist[s].x * stepLen;
        cy += hist[s].y * stepLen;
        cz += hist[s].z * stepLen;
      }

      // Fractional last step
      const frac = stepsToTake - fullSteps;
      if (fullSteps < numSteps && frac > 0) {
        cx += hist[fullSteps].x * stepLen * frac;
        cy += hist[fullSteps].y * stepLen * frac;
        cz += hist[fullSteps].z * stepLen * frac;
      }

      // Straight position along current backward direction
      const straightDist = t * worldLength;
      const sx = hist[0].x * straightDist;
      const sy = hist[0].y * straightDist;
      const sz = hist[0].z * straightDist;

      // World offset
      let dx = cx - sx;
      let dy = cy - sy;
      let dz = cz - sz;

      // World → parent-local (apply inverse quaternion manually)
      const ix = qw * dx + qy * dz - qz * dy;
      const iy = qw * dy + qz * dx - qx * dz;
      const iz = qw * dz + qx * dy - qy * dx;
      const iw = -qx * dx - qy * dy - qz * dz;
      const lx = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      const ly = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      const lz = iz * qw + iw * -qz + ix * -qy - iy * -qx;

      // Parent-local → geometry space (accounts for cone rotation.x = PI/2 and scale)
      const gx = lx / sXZ;
      const gy = lz / sY;
      const gz = -ly / sXZ;

      // Apply offset to each vertex in this ring
      const start = ring * vertsPerRing * 3;
      for (let v = 0; v < vertsPerRing; v++) {
        const idx = start + v * 3;
        posAttr.array[idx]     = origPosArray[idx]     + gx;
        posAttr.array[idx + 1] = origPosArray[idx + 1] + gy;
        posAttr.array[idx + 2] = origPosArray[idx + 2] + gz;
      }
    }

    posAttr.needsUpdate = true;
  }

  _restoreOriginalPositions(coneMesh, origArray) {
    const posAttr = coneMesh.geometry.getAttribute('position');
    posAttr.array.set(origArray);
    posAttr.needsUpdate = true;
  }

  update(dt, input) {
    // Rotation from mouse
    const mouseDelta = input.getMouseDelta();
    const yaw = -mouseDelta.x * PLAYER_ROTATION_SPEED;
    const pitch = -mouseDelta.y * PLAYER_ROTATION_SPEED;

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion).normalize(),
      yaw
    );
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize(),
      pitch
    );

    this.mesh.quaternion.premultiply(yawQuat);
    this.mesh.quaternion.premultiply(pitchQuat);

    // Roll with A/D
    if (input.isKeyDown('KeyA')) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        this.getForward(),
        PLAYER_ROLL_SPEED * dt
      );
      this.mesh.quaternion.premultiply(rollQuat);
    }
    if (input.isKeyDown('KeyD')) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        this.getForward(),
        -PLAYER_ROLL_SPEED * dt
      );
      this.mesh.quaternion.premultiply(rollQuat);
    }

    // Record direction history for cone curving
    this._updateDirHistory();

    // Thrust
    const forward = this.getForward();
    let thrustPower = 0;

    if (input.isKeyDown('KeyW')) {
      thrustPower = PLAYER_SPEED;
      if (input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight')) {
        thrustPower *= PLAYER_BOOST_MULTIPLIER;
      }
    }
    if (input.isKeyDown('KeyS')) {
      thrustPower = -PLAYER_SPEED * 0.5;
    }

    this.isThrusting = thrustPower > 0;
    this.isBoosting = this.isThrusting &&
      (input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight'));

    if (thrustPower !== 0) {
      this.velocity.add(forward.multiplyScalar(thrustPower * dt));
    }

    // Drag
    this.velocity.multiplyScalar(PLAYER_DRAG);

    // Update position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

    // Fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    // Animate engine effects
    this._engineTime += dt;

    let targetOuterOp, targetInnerOp, targetScaleY, targetScaleXZ;
    let targetGlowOp, targetGlowScale, targetDispOuter, targetDispInner;
    if (this.isBoosting) {
      targetOuterOp = 0.45; targetInnerOp = 0.4;
      targetScaleY = 6.0; targetScaleXZ = 0.8;
      targetGlowOp = 0.5; targetGlowScale = 4.5;
      targetDispOuter = 0.25; targetDispInner = 0.15;
    } else if (this.isThrusting) {
      targetOuterOp = 0.3; targetInnerOp = 0.25;
      targetScaleY = 1.0; targetScaleXZ = 1.0;
      targetGlowOp = 0.35; targetGlowScale = 3.5;
      targetDispOuter = 0.15; targetDispInner = 0.08;
    } else {
      targetOuterOp = 0; targetInnerOp = 0;
      targetScaleY = 0.1; targetScaleXZ = 0.1;
      targetGlowOp = 0; targetGlowScale = 0.5;
      targetDispOuter = 0; targetDispInner = 0;
    }

    const rate = 1 - Math.pow(0.001, dt);
    this._outerOpacity = THREE.MathUtils.lerp(this._outerOpacity, targetOuterOp, rate);
    this._innerOpacity = THREE.MathUtils.lerp(this._innerOpacity, targetInnerOp, rate);
    this._coneScaleY = THREE.MathUtils.lerp(this._coneScaleY, targetScaleY, rate);
    this._coneScaleXZ = THREE.MathUtils.lerp(this._coneScaleXZ, targetScaleXZ, rate);
    this._nozzleOpacity = THREE.MathUtils.lerp(this._nozzleOpacity, targetGlowOp, rate);
    const gs = THREE.MathUtils.lerp(this.nozzleGlow.scale.x, targetGlowScale, rate);
    this.nozzleGlow.scale.set(gs, gs, 1);

    // Shader uniforms — time, displacement
    this.outerConeMat.uniforms.uTime.value = this._engineTime;
    this.innerConeMat.uniforms.uTime.value = this._engineTime;
    this.outerConeMat.uniforms.uDisplace.value = THREE.MathUtils.lerp(
      this.outerConeMat.uniforms.uDisplace.value, targetDispOuter, rate);
    this.innerConeMat.uniforms.uDisplace.value = THREE.MathUtils.lerp(
      this.innerConeMat.uniforms.uDisplace.value, targetDispInner, rate);

    this._applyConeState();
    this._curveCones();

    // Exhaust particles — drift backward in local space, fade, respawn
    const posAttr = this._exhaustPoints.geometry.getAttribute('position');
    const alphaAttr = this._exhaustPoints.geometry.getAttribute('aAlpha');
    const sizeAttr = this._exhaustPoints.geometry.getAttribute('aSize');
    const coneEndZ = 6 + this._outerConeBaseLen * this._coneScaleY;
    const spawnChance = this.isBoosting ? 0.9 : this.isThrusting ? 0.6 : 0.15;

    for (let i = 0; i < this._exhaustData.length; i++) {
      const p = this._exhaustData[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        if (Math.random() < spawnChance) {
          p.life = 0;
          p.maxLife = 0.8 + Math.random() * 0.7;
          posAttr.array[i * 3]     = (Math.random() - 0.5) * 1.5;
          posAttr.array[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
          posAttr.array[i * 3 + 2] = coneEndZ;
        } else {
          alphaAttr.array[i] = 0;
          sizeAttr.array[i] = 0;
        }
      } else {
        const t = p.life / p.maxLife;
        posAttr.array[i * 3 + 2] += 8 * dt;
        alphaAttr.array[i] = (1 - t) * 0.35;
        sizeAttr.array[i] = (1 - t * 0.5) * 2.5;
      }
    }
    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    input.resetMouseDelta();
  }

  canFire() {
    return this.fireCooldown <= 0;
  }

  fire(projectileManager) {
    if (!this.canFire()) return false;

    this.fireCooldown = PLAYER_FIRE_RATE;

    const forward = this.getForward();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize();

    // Dual lasers offset left and right
    const leftOrigin = this.mesh.position.clone()
      .add(right.clone().multiplyScalar(-3))
      .add(forward.clone().multiplyScalar(8));
    const rightOrigin = this.mesh.position.clone()
      .add(right.clone().multiplyScalar(3))
      .add(forward.clone().multiplyScalar(8));

    projectileManager.fire(leftOrigin, forward.clone(), 'player');
    projectileManager.fire(rightOrigin, forward.clone(), 'player');
    return true;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize();
  }

  getSpeed() {
    return this.velocity.length();
  }

  reset() {
    this.mesh.position.set(350, 20, 0);
    this.mesh.quaternion.identity();
    this.velocity.set(0, 0, 0);
    this.health = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;

    // Reset engine effects to idle state
    this._coneScaleY = 0.1;
    this._coneScaleXZ = 0.1;
    this._outerOpacity = 0;
    this._innerOpacity = 0;
    this._nozzleOpacity = 0;
    this._engineTime = 0;
    this.nozzleGlow.scale.set(0.5, 0.5, 1);
    this._applyConeState();
    for (let i = 0; i < this._exhaustData.length; i++) {
      this._exhaustData[i].life = this._exhaustData[i].maxLife;
    }

    // Clear direction history and restore cone geometry
    this._dirHistory.length = 0;
    this._restoreOriginalPositions(this.outerCone, this._outerOrigPos);
    this._restoreOriginalPositions(this.innerCone, this._innerOrigPos);
  }
}
