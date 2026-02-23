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
import { PROJECTILE_DAMAGE } from '@/utils/Constants.js';
import { isMobileDevice } from '@/utils/DeviceDetect.js';

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
    this.solarSystem = new SolarSystem(this.scene);

    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.scene.add(this.player.trail);

    this.projectileManager = new ProjectileManager(this.scene);
    this.enemyManager = new EnemyManager(this.scene);

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
  }

  endGame() {
    this.state = 'gameover';
    this.hud.hide();
    this.input.hideTouchControls();
    this.menuScreen.showGameOver(this.score);
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
        this.player.updateTrail();

        if (this.input.isMouseDown() && this.input.pointerLocked) {
          this.player.fire(this.projectileManager);
        }

        this.camera.follow(this.player, dt);
        this.enemyManager.update(dt, this.player.mesh.position, this.projectileManager, this.score);
        this.projectileManager.update(dt);
        this.resolveCollisions();
        this.solarSystem.update(dt);

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
        }
      } else if (hit.type === 'player') {
        this.player.takeDamage(PROJECTILE_DAMAGE);
        this.camera.shake(2, 0.15);
      }
      this.projectileManager.releaseProjectile(hit.projectile);
    }
  }
}
