export class TouchController {
  constructor(inputManager) {
    this.input = inputManager;
    this.overlay = null;

    // Touch tracking by identifier
    this.joystickTouch = null;
    this.aimTouch = null;
    this.fireTouch = null;
    this.boostTouch = null;

    // Joystick state
    this.joystickOrigin = { x: 0, y: 0 };
    this.joystickRadius = 55;
    this.deadZone = 0.15;

    // Aim state
    this.lastAimPos = { x: 0, y: 0 };

    // Layout constants
    this.joystickSize = 140;
    this.fireSize = 70;
    this.boostSize = 60;

    this._createOverlay();
    this._bindEvents();
  }

  _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'touch-controls';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 50;
      pointer-events: auto;
      display: none;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Joystick base (bottom-left)
    this.joystickBase = document.createElement('div');
    this.joystickBase.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 20px;
      width: ${this.joystickSize}px;
      height: ${this.joystickSize}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;

    // Joystick knob
    this.joystickKnob = document.createElement('div');
    this.joystickKnob.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.5);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: none;
    `;
    this.joystickBase.appendChild(this.joystickKnob);
    this.overlay.appendChild(this.joystickBase);

    // Fire button (bottom-right)
    this.fireBtn = document.createElement('div');
    this.fireBtn.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 20px;
      width: ${this.fireSize}px;
      height: ${this.fireSize}px;
      border-radius: 50%;
      background: rgba(255, 68, 68, 0.15);
      border: 2px solid rgba(255, 68, 68, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 11px;
      color: rgba(255, 68, 68, 0.8);
      letter-spacing: 1px;
    `;
    this.fireBtn.textContent = 'FIRE';
    this.overlay.appendChild(this.fireBtn);

    // Boost button (above fire)
    this.boostBtn = document.createElement('div');
    this.boostBtn.style.cssText = `
      position: absolute;
      bottom: ${30 + this.fireSize + 15}px;
      right: ${20 + (this.fireSize - this.boostSize) / 2}px;
      width: ${this.boostSize}px;
      height: ${this.boostSize}px;
      border-radius: 50%;
      background: rgba(68, 136, 255, 0.15);
      border: 2px solid rgba(68, 136, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 10px;
      color: rgba(68, 136, 255, 0.8);
      letter-spacing: 1px;
    `;
    this.boostBtn.textContent = 'BOOST';
    this.overlay.appendChild(this.boostBtn);

    document.body.appendChild(this.overlay);
  }

  _bindEvents() {
    const opts = { passive: false };

    this._onTouchStart = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        this._handleTouchStart(touch);
      }
    };

    this._onTouchMove = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        this._handleTouchMove(touch);
      }
    };

    this._onTouchEnd = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        this._handleTouchEnd(touch);
      }
    };

    this.overlay.addEventListener('touchstart', this._onTouchStart, opts);
    this.overlay.addEventListener('touchmove', this._onTouchMove, opts);
    this.overlay.addEventListener('touchend', this._onTouchEnd, opts);
    this.overlay.addEventListener('touchcancel', this._onTouchEnd, opts);
  }

  _getZone(x, y) {
    const rect = this.joystickBase.getBoundingClientRect();
    // Expand joystick hit area slightly
    const jPad = 20;
    if (
      x >= rect.left - jPad && x <= rect.right + jPad &&
      y >= rect.top - jPad && y <= rect.bottom + jPad
    ) {
      return 'joystick';
    }

    const fireRect = this.fireBtn.getBoundingClientRect();
    const fPad = 15;
    if (
      x >= fireRect.left - fPad && x <= fireRect.right + fPad &&
      y >= fireRect.top - fPad && y <= fireRect.bottom + fPad
    ) {
      return 'fire';
    }

    const boostRect = this.boostBtn.getBoundingClientRect();
    const bPad = 15;
    if (
      x >= boostRect.left - bPad && x <= boostRect.right + bPad &&
      y >= boostRect.top - bPad && y <= boostRect.bottom + bPad
    ) {
      return 'boost';
    }

    return 'aim';
  }

  _handleTouchStart(touch) {
    const zone = this._getZone(touch.clientX, touch.clientY);

    switch (zone) {
      case 'joystick':
        this.joystickTouch = touch.identifier;
        this.joystickOrigin.x = this.joystickBase.getBoundingClientRect().left + this.joystickSize / 2;
        this.joystickOrigin.y = this.joystickBase.getBoundingClientRect().top + this.joystickSize / 2;
        this._updateJoystick(touch.clientX, touch.clientY);
        break;

      case 'fire':
        this.fireTouch = touch.identifier;
        this.input.mouseDown = true;
        this.fireBtn.style.background = 'rgba(255, 68, 68, 0.4)';
        break;

      case 'boost':
        this.boostTouch = touch.identifier;
        this.input.keys['ShiftLeft'] = true;
        this.boostBtn.style.background = 'rgba(68, 136, 255, 0.4)';
        break;

      case 'aim':
        this.aimTouch = touch.identifier;
        this.lastAimPos.x = touch.clientX;
        this.lastAimPos.y = touch.clientY;
        break;
    }
  }

  _handleTouchMove(touch) {
    if (touch.identifier === this.joystickTouch) {
      this._updateJoystick(touch.clientX, touch.clientY);
    } else if (touch.identifier === this.aimTouch) {
      const dx = touch.clientX - this.lastAimPos.x;
      const dy = touch.clientY - this.lastAimPos.y;
      this.input.mouseDeltaX += dx * 1.5;
      this.input.mouseDeltaY += dy * 1.5;
      this.lastAimPos.x = touch.clientX;
      this.lastAimPos.y = touch.clientY;
    }
  }

  _handleTouchEnd(touch) {
    if (touch.identifier === this.joystickTouch) {
      this.joystickTouch = null;
      this._resetJoystick();
    } else if (touch.identifier === this.fireTouch) {
      this.fireTouch = null;
      this.input.mouseDown = false;
      this.fireBtn.style.background = 'rgba(255, 68, 68, 0.15)';
    } else if (touch.identifier === this.boostTouch) {
      this.boostTouch = null;
      this.input.keys['ShiftLeft'] = false;
      this.boostBtn.style.background = 'rgba(68, 136, 255, 0.15)';
    } else if (touch.identifier === this.aimTouch) {
      this.aimTouch = null;
    }
  }

  _updateJoystick(x, y) {
    let dx = x - this.joystickOrigin.x;
    let dy = y - this.joystickOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.joystickRadius;

    // Clamp to radius
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    // Update knob visual
    this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    // Normalize to -1..1
    const nx = dx / maxDist;
    const ny = dy / maxDist;

    // Apply dead zone
    const applyDeadZone = (val) => {
      const abs = Math.abs(val);
      if (abs < this.deadZone) return 0;
      return Math.sign(val) * (abs - this.deadZone) / (1 - this.deadZone);
    };

    const jx = applyDeadZone(nx);
    const jy = applyDeadZone(ny);

    // Y-axis: up = forward (KeyW), down = reverse (KeyS)
    this.input.keys['KeyW'] = jy < -0.1;
    this.input.keys['KeyS'] = jy > 0.1;

    // X-axis: left = roll left (KeyA), right = roll right (KeyD)
    this.input.keys['KeyA'] = jx < -0.1;
    this.input.keys['KeyD'] = jx > 0.1;
  }

  _resetJoystick() {
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.input.keys['KeyW'] = false;
    this.input.keys['KeyS'] = false;
    this.input.keys['KeyA'] = false;
    this.input.keys['KeyD'] = false;
  }

  show() {
    if (this.overlay) this.overlay.style.display = 'block';
  }

  hide() {
    if (this.overlay) this.overlay.style.display = 'none';
    // Reset all inputs when hiding
    this._resetJoystick();
    this.input.mouseDown = false;
    this.input.keys['ShiftLeft'] = false;
  }

  dispose() {
    if (this.overlay) {
      this.overlay.removeEventListener('touchstart', this._onTouchStart);
      this.overlay.removeEventListener('touchmove', this._onTouchMove);
      this.overlay.removeEventListener('touchend', this._onTouchEnd);
      this.overlay.removeEventListener('touchcancel', this._onTouchEnd);
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
