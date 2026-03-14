export class HUD {
  constructor(isMobile = false) {
    this.isMobile = isMobile;
    const hud = document.getElementById('hud');

    hud.innerHTML = `
      <div id="health-container">
        <div id="health-bar"></div>
        <span id="health-text"></span>
      </div>
      <div id="score-display">SCORE: 0</div>
      <div id="speed-display">SPEED: 0</div>
      <div id="crosshair">
        <div class="ch-h"></div>
        <div class="ch-v"></div>
        <div class="ch-dot"></div>
      </div>
    `;

    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.scoreDisplay = document.getElementById('score-display');
    this.speedDisplay = document.getElementById('speed-display');

    this._injectStyles();
  }

  _injectStyles() {
    const style = document.createElement('style');

    // On mobile: stack health, score, speed in top-left (away from joystick & buttons)
    const healthPos = this.isMobile
      ? 'top: 10px; left: 10px;'
      : 'bottom: 30px; left: 30px;';
    const scorePos = this.isMobile
      ? 'top: 36px; left: 10px;'
      : 'top: 20px; right: 30px;';
    const speedPos = this.isMobile
      ? 'top: 58px; left: 10px;'
      : 'bottom: 30px; right: 30px;';

    style.textContent = `
      #health-container {
        position: absolute;
        ${healthPos}
        width: 200px;
        height: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }
      #health-bar {
        height: 100%;
        width: 100%;
        background: #22cc44;
        transition: width 0.2s, background-color 0.3s;
      }
      #health-text {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: monospace;
        font-size: 12px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      }
      #score-display {
        position: absolute;
        ${scorePos}
        color: #fff;
        font-family: monospace;
        font-size: ${this.isMobile ? '14px' : '18px'};
        text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
      }
      #speed-display {
        position: absolute;
        ${speedPos}
        color: rgba(255, 255, 255, 0.7);
        font-family: monospace;
        font-size: 14px;
        text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
      }
      #crosshair {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: 30px;
      }
      .ch-h {
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
        background: rgba(255, 255, 255, 0.6);
        transform: translateY(-50%);
      }
      .ch-v {
        position: absolute;
        top: 0;
        left: 50%;
        width: 1px;
        height: 100%;
        background: rgba(255, 255, 255, 0.6);
        transform: translateX(-50%);
      }
      .ch-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }
    `;
    document.head.appendChild(style);
  }

  showSystemName(name) {
    if (!this.systemLabel) {
      const label = document.createElement('div');
      label.id = 'system-name';
      label.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 12px;
        letter-spacing: 2px;
        text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
        pointer-events: none;
      `;
      document.getElementById('hud').appendChild(label);
      this.systemLabel = label;
    }
    this.systemLabel.textContent = name;
  }

  update(health, maxHealth, score, speed) {
    const pct = (health / maxHealth) * 100;
    this.healthBar.style.width = pct + '%';

    if (pct > 60) {
      this.healthBar.style.backgroundColor = '#22cc44';
    } else if (pct > 30) {
      this.healthBar.style.backgroundColor = '#ccaa22';
    } else {
      this.healthBar.style.backgroundColor = '#cc2222';
    }

    this.healthText.textContent = Math.ceil(health) + ' / ' + maxHealth;
    this.scoreDisplay.textContent = 'SCORE: ' + score;
    this.speedDisplay.textContent = 'SPEED: ' + Math.round(speed);
  }

  showBlackHoleWarning(intensity) {
    if (!this.bhWarning) {
      const div = document.createElement('div');
      div.id = 'bh-warning';
      div.innerHTML = 'WARNING: APPROACHING EVENT HORIZON';
      document.getElementById('hud').appendChild(div);
      this.bhWarning = div;

      const s = document.createElement('style');
      s.textContent = `
        #bh-warning {
          position: absolute;
          bottom: 50%;
          left: 50%;
          transform: translateX(-50%);
          color: #ff2222;
          font-family: monospace;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 3px;
          text-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
          white-space: nowrap;
        }
        #bh-vignette {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
      `;
      document.head.appendChild(s);

      const vignette = document.createElement('div');
      vignette.id = 'bh-vignette';
      document.body.appendChild(vignette);
      this.bhVignette = vignette;
    }

    const clamped = Math.max(0, Math.min(1, intensity));
    this.bhWarning.style.opacity = clamped;
    this.bhVignette.style.opacity = clamped;
    const spread = 80 + clamped * 120;
    this.bhVignette.style.boxShadow = `inset 0 0 ${spread}px rgba(255, 0, 0, ${clamped * 0.4})`;
  }

  hideBlackHoleWarning() {
    if (this.bhWarning) this.bhWarning.style.opacity = '0';
    if (this.bhVignette) this.bhVignette.style.opacity = '0';
  }

  show() {
    document.getElementById('hud').style.display = 'block';
  }

  hide() {
    document.getElementById('hud').style.display = 'none';
    this.hideBlackHoleWarning();
  }
}
