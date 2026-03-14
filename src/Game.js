import * as THREE from 'three';
import { Renderer } from '@/core/Renderer.js';
import { Camera } from '@/core/Camera.js';
import { InputManager } from '@/core/InputManager.js';
import { SolarSystem } from '@/world/SolarSystem.js';
import { Starfield } from '@/world/Starfield.js';
import { Lighting } from '@/world/Lighting.js';
import { Player } from '@/entities/Player.js';
import { ProjectileManager } from '@/entities/ProjectileManager.js';
import { EnemyManager } from '@/entities/EnemyManager.js';
import { HUD } from '@/ui/HUD.js';
import { Minimap } from '@/ui/Minimap.js';
import { MenuScreen } from '@/ui/MenuScreen.js';
import { PROJECTILE_DAMAGE, PLAYER_BOUNCE_RESTITUTION, COLLISION_SEPARATION_BUFFER, ASTEROID_BELT_COLLISION_MARGIN, BLACK_HOLE } from '@/utils/Constants.js';
import { isMobileDevice } from '@/utils/DeviceDetect.js';
import { AudioManager } from '@/core/AudioManager.js';

export class Game {
  constructor() {
    this.state = 'menu';
    this.score = 0;
    this.menuAngle = 0;
    this.isMobile = isMobileDevice();
    this.loop = this.loop.bind(this);
  }

  init() {
    const canvas = document.getElementById('game-canvas');

    this.renderer = new Renderer(canvas, this.isMobile);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new Camera();
    this.clock = new THREE.Clock();
    this.input = new InputManager(canvas, this.isMobile);

    this.starfield = new Starfield(this.scene);
    this.lighting = new Lighting(this.scene);
    this.solarSystem = new SolarSystem(this.scene, { isMobile: this.isMobile });

    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.projectileManager = new ProjectileManager(this.scene);
    this.enemyManager = new EnemyManager(this.scene);

    this.audio = new AudioManager();
    this._tempVec3 = new THREE.Vector3();

    this.hud = new HUD(this.isMobile);
    this.minimap = new Minimap(this.isMobile);
    this.menuScreen = new MenuScreen(this.isMobile);

    this.menuScreen.onStart = () => this.startGame();
    this.menuScreen.onRestart = () => this.restart();

    // Setup bloom post-processing (skipped on mobile for performance)
    if (!this.isMobile) {
      this.renderer.setupComposer(this.scene, this.camera.getCamera());
    }

    // Start in menu state
    this.hud.hide();
    this.menuScreen.showStart();
  }

  start() {
    this.clock.start();
    requestAnimationFrame(this.loop);
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.menuScreen.hideAll();
    this.hud.show();
    this.input.showTouchControls();
    this.audio.init();
    this.audio.resume();
    this.wasBoosting = false;
    this.lastBounceTime = 0;
  }

  endGame(blackHole = false) {
    this.state = 'gameover';
    this.hud.hide();
    this.input.hideTouchControls();
    this.menuScreen.showGameOver(this.score, blackHole);
    this.audio.stopEngine();
    this.hud.hideBlackHoleWarning();
    if (!this.isMobile) {
      document.exitPointerLock();
    }
  }

  restart() {
    // Clear all enemies
    for (const enemy of this.enemyManager.getActiveEnemies()) {
      enemy.active = false;
      this.enemyManager.pool.release(enemy);
    }

    // Clear all projectiles
    this.projectileManager.pool.forEach(p => {
      p.active = false;
      this.projectileManager.pool.release(p);
    });

    this.enemyManager.spawnTimer = 3;
    this.player.reset();
    this.player.mesh.visible = true;
    this.blackHoleCaptured = false;
    this.bhCaptureTimer = 0;
    this.camera.getCamera().fov = 60;
    this.camera.getCamera().updateProjectionMatrix();
    this.score = 0;
    this.startGame();
  }

  loop() {
    const dt = this.clock.getDelta();

    switch (this.state) {
      case 'menu':
        // Cinematic orbit camera
        this.menuAngle += dt * 0.1;
        this.camera.getCamera().position.set(
          Math.cos(this.menuAngle) * 600,
          200,
          Math.sin(this.menuAngle) * 600
        );
        this.camera.getCamera().lookAt(0, 0, 0);
        this.solarSystem.update(dt);
        break;

      case 'playing':
        this.player.update(dt, this.input);

        if (this.input.isMouseDown() && this.input.pointerLocked) {
          const fired = this.player.fire(this.projectileManager);
          if (fired) this.audio.playLaser();
        }

        // Boost sound on engage
        if (this.player.isBoosting && !this.wasBoosting) {
          this.audio.playBoost();
        }
        this.wasBoosting = this.player.isBoosting;

        // Engine audio
        this.audio.updateEngine(
          this.player.isThrusting,
          this.player.isBoosting,
          this.player.getSpeed()
        );

        this.camera.follow(this.player, dt);
        this.enemyManager.update(dt, this.player.mesh.position, this.projectileManager, this.score);
        this.projectileManager.update(dt);
        this.resolveCollisions();
        this.solarSystem.update(dt);

        // Switch system label based on which system's extent the player is within
        this.hud.showSystemName(
          this.solarSystem.getSystemAt(this.player.mesh.position)
        );

        this.hud.update(
          this.player.health,
          this.player.maxHealth,
          this.score,
          this.player.getSpeed()
        );
        this.minimap.update(
          this.player.mesh.position,
          this.player.mesh.quaternion,
          this.enemyManager.getActiveEnemies(),
          this.solarSystem.getBodies()
        );

        // ── Black hole interaction ──
        {
          const bh = this.solarSystem.blackHole;
          const dist = bh.getDistanceTo(this.player.mesh.position);

          if (this.blackHoleCaptured) {
            // Spaghettification sequence — pull toward singularity
            this.bhCaptureTimer += dt;
            const t = this.bhCaptureTimer;
            const dir = bh.mesh.position.clone().sub(this.player.mesh.position).normalize();
            const pullStrength = 50 + t * t * 30;
            this.player.velocity.copy(dir.multiplyScalar(pullStrength));

            // Stretch FOV for distortion effect
            const fovTarget = 60 + t * 15;
            this.camera.getCamera().fov = Math.min(fovTarget, 140);
            this.camera.getCamera().updateProjectionMatrix();

            // Camera shake intensifies gradually
            this.camera.shake(t * 3, 0.1);

            // After ~6 seconds or reaching center, end game
            const distToCenter = bh.getDistanceTo(this.player.mesh.position);
            if (t > 6 || distToCenter < 20) {
              this.player.mesh.visible = false;
              this.endGame(true);
            }
          } else if (dist < BLACK_HOLE.shaderSphereRadius) {
            // Crossed into the black hole's gravitational capture zone
            this.blackHoleCaptured = true;
            this.bhCaptureTimer = 0;
            this.player.velocity.set(0, 0, 0);
          }

          // HUD warning
          if (dist < BLACK_HOLE.hudWarningRadius) {
            const intensity = 1 - (dist - BLACK_HOLE.eventHorizonRadius) / (BLACK_HOLE.hudWarningRadius - BLACK_HOLE.eventHorizonRadius);
            this.hud.showBlackHoleWarning(Math.max(0, Math.min(1, intensity)));
          } else if (!this.blackHoleCaptured) {
            this.hud.hideBlackHoleWarning();
          }

        }

        if (this.player.health <= 0) {
          this.endGame();
        }
        break;

      case 'gameover':
        // Scene still renders but frozen
        this.solarSystem.update(dt);
        break;
    }

    this.renderer.render(this.scene, this.camera.getCamera());
    requestAnimationFrame(this.loop);
  }

  resolveCollisions() {
    const enemies = this.enemyManager.getActiveEnemies();
    const hits = this.projectileManager.checkCollisions(enemies, this.player);

    for (const hit of hits) {
      if (hit.type === 'enemy') {
        hit.enemy.takeDamage(PROJECTILE_DAMAGE);
        if (hit.enemy.health <= 0) {
          this.score += 100;
          this.player.health = this.player.maxHealth;
          this.enemyManager.handleEnemyDeath(hit.enemy);
          this.audio.playExplosion();
        }
      } else if (hit.type === 'player') {
        this.player.takeDamage(PROJECTILE_DAMAGE);
        this.camera.shake(2, 0.15);
        this.audio.playDamage();
      }
      this.projectileManager.releaseProjectile(hit.projectile);
    }

    // Celestial body + moon bounce collision
    const playerPos = this.player.mesh.position;
    const playerRadius = this.player.boundingRadius;
    const vel = this.player.velocity;
    const bodies = this.solarSystem.bodies;
    let bounced = false;

    for (let i = 0; i < bodies.length && !bounced; i++) {
      const body = bodies[i];
      const bodyPos = body.mesh.position;

      // Check body itself
      bounced = this._bounceAgainst(playerPos, playerRadius, vel, bodyPos, body.radius);

      // Check moons
      for (let m = 0; m < body.moons.length && !bounced; m++) {
        const moon = body.moons[m];
        const moonPos = moon.mesh.getWorldPosition(this._tempVec3);
        bounced = this._bounceAgainst(playerPos, playerRadius, vel, moonPos, moon.mesh.geometry.parameters.radius);
      }
    }

    // Asteroid belt collision
    for (let b = 0; b < this.solarSystem.asteroidBelts.length && !bounced; b++) {
      const belt = this.solarSystem.asteroidBelts[b];
      const margin = playerRadius + belt.maxRadius + ASTEROID_BELT_COLLISION_MARGIN;

      // Broad-phase: check XZ distance from belt center
      const bx = playerPos.x - belt.systemCenter.x;
      const bz = playerPos.z - belt.systemCenter.z;
      const distFromCenter = Math.sqrt(bx * bx + bz * bz);

      if (distFromCenter < belt.innerRadius - margin || distFromCenter > belt.outerRadius + margin) {
        continue;
      }

      // Narrow-phase: check individual asteroids
      const positions = belt.positions;
      const radii = belt.radii;
      for (let a = 0; a < belt.count && !bounced; a++) {
        const ax = positions[a * 3];
        const ay = positions[a * 3 + 1];
        const az = positions[a * 3 + 2];
        bounced = this._bounceAgainst(playerPos, playerRadius, vel, this._tempVec3.set(ax, ay, az), radii[a]);
      }
    }
  }

  _bounceAgainst(playerPos, playerRadius, vel, objPos, objRadius) {
    const combinedRadius = playerRadius + objRadius;
    const dx = playerPos.x - objPos.x;
    const dy = playerPos.y - objPos.y;
    const dz = playerPos.z - objPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq >= combinedRadius * combinedRadius) return false;

    const dist = Math.sqrt(distSq);

    // Surface normal: object center → player
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    // Push player out to surface + buffer
    const pushDist = combinedRadius + COLLISION_SEPARATION_BUFFER - dist;
    playerPos.x += nx * pushDist;
    playerPos.y += ny * pushDist;
    playerPos.z += nz * pushDist;

    // Only reflect if moving into the body (dot < 0)
    const dot = vel.x * nx + vel.y * ny + vel.z * nz;
    if (dot < 0) {
      const factor = (1 + PLAYER_BOUNCE_RESTITUTION) * dot;
      vel.x -= factor * nx;
      vel.y -= factor * ny;
      vel.z -= factor * nz;
    }

    // Camera shake + bounce sound with 200ms cooldown
    const now = performance.now();
    if (now - this.lastBounceTime > 200) {
      this.camera.shake(3, 0.2);
      this.audio.playBounce();
      this.lastBounceTime = now;
    }

    return true;
  }
}
