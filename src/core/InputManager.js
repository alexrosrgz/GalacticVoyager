import { TouchController } from '@/core/TouchController.js';

export class InputManager {
  constructor(canvas, isMobile = false) {
    this.canvas = canvas;
    this.isMobile = isMobile;
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseDown = false;
    this.pointerLocked = false;
    this.touchController = null;

    if (isMobile) {
      // Mobile: skip keyboard/mouse/pointer-lock, use touch controller
      this.pointerLocked = true;
      this.touchController = new TouchController(this);
    } else {
      // Desktop: existing keyboard + mouse + pointer lock
      this._onKeyDown = (e) => {
        this.keys[e.code] = true;
      };
      this._onKeyUp = (e) => {
        this.keys[e.code] = false;
      };
      this._onMouseMove = (e) => {
        if (this.pointerLocked) {
          this.mouseDeltaX += e.movementX;
          this.mouseDeltaY += e.movementY;
        }
      };
      this._onMouseDown = (e) => {
        if (e.button === 0) this.mouseDown = true;
      };
      this._onMouseUp = (e) => {
        if (e.button === 0) this.mouseDown = false;
      };
      this._onPointerLockChange = () => {
        this.pointerLocked = document.pointerLockElement === this.canvas;
      };

      document.addEventListener('keydown', this._onKeyDown);
      document.addEventListener('keyup', this._onKeyUp);
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mousedown', this._onMouseDown);
      document.addEventListener('mouseup', this._onMouseUp);
      document.addEventListener('pointerlockchange', this._onPointerLockChange);

      canvas.addEventListener('click', () => {
        if (!this.pointerLocked) {
          canvas.requestPointerLock();
        }
      });
    }
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  getMouseDelta() {
    return { x: this.mouseDeltaX, y: this.mouseDeltaY };
  }

  isMouseDown() {
    return this.mouseDown;
  }

  resetMouseDelta() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  showTouchControls() {
    if (this.touchController) this.touchController.show();
  }

  hideTouchControls() {
    if (this.touchController) this.touchController.hide();
  }

  dispose() {
    if (this.isMobile) {
      if (this.touchController) {
        this.touchController.dispose();
        this.touchController = null;
      }
    } else {
      document.removeEventListener('keydown', this._onKeyDown);
      document.removeEventListener('keyup', this._onKeyUp);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mousedown', this._onMouseDown);
      document.removeEventListener('mouseup', this._onMouseUp);
      document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
  }
}
