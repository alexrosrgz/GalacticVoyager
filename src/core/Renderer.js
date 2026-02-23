import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class Renderer {
  constructor(canvas, isMobile = false) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile
    });
    const maxRatio = isMobile ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.composer = null;

    window.addEventListener('resize', () => this.onResize());
  }

  setupComposer(scene, camera) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  render(scene, camera) {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  getRenderer() {
    return this.renderer;
  }
}
