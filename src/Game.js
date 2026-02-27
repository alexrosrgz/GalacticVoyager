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
import { PROJECTILE_DAMAGE, PLAYER_BOUNCE_RESTITUTION, COLLISION_SEPARATION_BUFFER } from '@/utils/Constants.js';
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

  endGame() {
    this.state = 'gameover';
    this.hud.hide();
    this.input.hideTouchControls();
    this.menuScreen.showGameOver(this.score);
    this.audio.stopEngine();
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
