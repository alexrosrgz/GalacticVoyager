export class MenuScreen {
  constructor() {
    this.onStart = null;
    this.onRestart = null;

    this._createElements();
    this._injectStyles();
  }

  _createElements() {
    // Start screen
    this.startScreen = document.createElement('div');
    this.startScreen.id = 'start-screen';
    this.startScreen.innerHTML = `
      <h1>GALACTIC VOYAGER</h1>
      <p class="subtitle">Defend the Solar System</p>
      <button id="start-btn">START MISSION</button>
      <p class="controls-info">
        WASD - Fly &nbsp;|&nbsp; Mouse - Aim &nbsp;|&nbsp; Click - Fire &nbsp;|&nbsp; Shift - Boost
      </p>
    `;
    document.body.appendChild(this.startScreen);

    // Game over screen
    this.gameOverScreen = document.createElement('div');
    this.gameOverScreen.id = 'gameover-screen';
    this.gameOverScreen.style.display = 'none';
    this.gameOverScreen.innerHTML = `
      <h1>MISSION FAILED</h1>
      <p id="final-score">SCORE: 0</p>
      <button id="restart-btn">TRY AGAIN</button>
    `;
    document.body.appendChild(this.gameOverScreen);

    document.getElementById('start-btn').addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    document.getElementById('restart-btn').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
  }

  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #start-screen, #gameover-screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-family: monospace;
      }
      #start-screen h1, #gameover-screen h1 {
        font-size: 48px;
        margin-bottom: 10px;
        text-shadow: 0 0 20px rgba(68, 136, 255, 0.8);
        letter-spacing: 4px;
      }
      .subtitle {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 40px;
      }
      #start-btn, #restart-btn {
        padding: 12px 40px;
        font-size: 18px;
        font-family: monospace;
        background: transparent;
        color: #4488ff;
        border: 2px solid #4488ff;
        cursor: pointer;
        letter-spacing: 2px;
        transition: all 0.2s;
        pointer-events: auto;
      }
      #start-btn:hover, #restart-btn:hover {
        background: #4488ff;
        color: #000;
      }
      .controls-info {
        margin-top: 30px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
      }
      #final-score {
        font-size: 24px;
        color: #ffaa44;
        margin-bottom: 30px;
      }
    `;
    document.head.appendChild(style);
  }

  showStart() {
    this.startScreen.style.display = 'flex';
    this.gameOverScreen.style.display = 'none';
  }

  showGameOver(score) {
    this.startScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'flex';
    document.getElementById('final-score').textContent = 'SCORE: ' + score;
  }

  hideAll() {
    this.startScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
  }
}
