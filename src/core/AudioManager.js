export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;

    // Engine state
    this.engineOsc = null;
    this.engineGain = null;
    this.engineLfo = null;
    this.engineLfoGain = null;
    this.engineTargetVolume = 0;
    this.engineTargetFreq = 0;
  }

  /**
   * Must be called from a user gesture (click / touch).
   */
  init() {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this._initEngine();
    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ── Engine (continuous) ────────────────────────────────────────────

  _initEngine() {
    const now = this.ctx.currentTime;

    // Smooth sine base tone for a gentle sci-fi hum
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sine';
    this.engineOsc.frequency.setValueAtTime(65, now);

    // Second harmonic (octave up) for warmth
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sine';
    this.engineOsc2.frequency.setValueAtTime(130, now);

    this.engineOsc2Gain = this.ctx.createGain();
    this.engineOsc2Gain.gain.setValueAtTime(0, now);

    // Subtle triangle layer that only comes in during thrust
    this.engineOsc3 = this.ctx.createOscillator();
    this.engineOsc3.type = 'triangle';
    this.engineOsc3.frequency.setValueAtTime(65, now);

    this.engineOsc3Gain = this.ctx.createGain();
    this.engineOsc3Gain.gain.setValueAtTime(0, now);

    // Gentle low-pass to keep everything smooth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.Q.setValueAtTime(0.7, now);
    this.engineFilter = filter;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, now);

    // Slow gentle LFO — subtle pulse, not aggressive wobble
    this.engineLfo = this.ctx.createOscillator();
    this.engineLfo.type = 'sine';
    this.engineLfo.frequency.setValueAtTime(2, now);
    this.engineLfoGain = this.ctx.createGain();
    this.engineLfoGain.gain.setValueAtTime(0, now);

    this.engineLfo.connect(this.engineLfoGain);
    this.engineLfoGain.connect(this.engineOsc.frequency);

    // Mix all oscillators into the filter
    this.engineOsc.connect(filter);
    this.engineOsc2.connect(this.engineOsc2Gain);
    this.engineOsc2Gain.connect(filter);
    this.engineOsc3.connect(this.engineOsc3Gain);
    this.engineOsc3Gain.connect(filter);

    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineOsc2.start();
    this.engineOsc3.start();
    this.engineLfo.start();
  }

  /**
   * Call every frame with current thrust state.
   * @param {boolean} thrusting  - W key held
   * @param {boolean} boosting   - Shift held while thrusting
   * @param {number}  speed      - current velocity magnitude
   */
  updateEngine(thrusting, boosting, speed) {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;
    const ramp = 0.15;

    let vol, freq, filterFreq, lfoAmount, harm2Vol, triVol;

    if (boosting && thrusting) {
      vol = 0.22;
      freq = 90;
      filterFreq = 600;
      lfoAmount = 1.5;
      harm2Vol = 0.12;
      triVol = 0.08;
    } else if (thrusting) {
      vol = 0.15;
      freq = 75;
      filterFreq = 350;
      lfoAmount = 1;
      harm2Vol = 0.06;
      triVol = 0.04;
    } else {
      // Smooth idle hum proportional to residual speed
      const t = Math.min(speed / 150, 1);
      vol = 0.04 + t * 0.04;
      freq = 55 + t * 10;
      filterFreq = 150 + t * 60;
      lfoAmount = 0.3 + t * 0.3;
      harm2Vol = 0.01 + t * 0.02;
      triVol = 0;
    }

    this.engineGain.gain.linearRampToValueAtTime(vol, now + ramp);
    this.engineOsc.frequency.linearRampToValueAtTime(freq, now + ramp);
    this.engineOsc2.frequency.linearRampToValueAtTime(freq * 2, now + ramp);
    this.engineOsc2Gain.gain.linearRampToValueAtTime(harm2Vol, now + ramp);
    this.engineOsc3.frequency.linearRampToValueAtTime(freq, now + ramp);
    this.engineOsc3Gain.gain.linearRampToValueAtTime(triVol, now + ramp);
    this.engineFilter.frequency.linearRampToValueAtTime(filterFreq, now + ramp);
    this.engineLfoGain.gain.linearRampToValueAtTime(lfoAmount, now + ramp);
  }

  // ── Laser fire ─────────────────────────────────────────────────────

  playLaser() {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(3, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // ── Damage hit ─────────────────────────────────────────────────────

  playDamage() {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;

    // Noise burst via buffer
    const duration = 0.2;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Low thump alongside noise
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(80, now);
    thump.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.3, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
    thump.start(now);
    thump.stop(now + 0.16);
  }

  // ── Boost engage ───────────────────────────────────────────────────

  playBoost() {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;

    // Smooth sine power-up sweep (low → high, like charging up)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(320, now + 0.2);
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    // Harmonic shimmer layer (octave + fifth above)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, now);
    osc2.frequency.exponentialRampToValueAtTime(480, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.5);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.06, now);
    osc2Gain.gain.linearRampToValueAtTime(0.1, now + 0.15);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(900, now + 0.2);
    filter.frequency.linearRampToValueAtTime(500, now + 0.5);
    filter.Q.setValueAtTime(1, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    // Soft filtered noise for air-rush texture
    const rushDuration = 0.45;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * rushDuration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const rush = this.ctx.createBufferSource();
    rush.buffer = buffer;

    const rushFilter = this.ctx.createBiquadFilter();
    rushFilter.type = 'bandpass';
    rushFilter.frequency.setValueAtTime(600, now);
    rushFilter.frequency.linearRampToValueAtTime(1200, now + 0.15);
    rushFilter.frequency.linearRampToValueAtTime(400, now + 0.45);
    rushFilter.Q.setValueAtTime(2, now);

    const rushGain = this.ctx.createGain();
    rushGain.gain.setValueAtTime(0.02, now);
    rushGain.gain.linearRampToValueAtTime(0.06, now + 0.12);
    rushGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    rush.connect(rushFilter);
    rushFilter.connect(rushGain);
    rushGain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.55);
    osc2.start(now);
    osc2.stop(now + 0.55);
    rush.start(now);
    rush.stop(now + rushDuration);
  }

  // ── Bounce off celestial body ─────────────────────────────────────

  playBounce() {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;

    // Low sine sweep (150 Hz → 40 Hz) for a soft thud feel
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // Soft filtered noise for impact texture
    const duration = 0.15;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    filter.Q.setValueAtTime(1, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.21);
    noise.start(now);
    noise.stop(now + duration);
  }

  // ── Enemy explosion ────────────────────────────────────────────────

  playExplosion() {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;

    // Noise burst
    const duration = 0.5;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Deep bass boom
    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(60, now);
    boom.frequency.exponentialRampToValueAtTime(15, now + 0.4);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.4, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Mid crackle
    const crackle = this.ctx.createOscillator();
    crackle.type = 'square';
    crackle.frequency.setValueAtTime(200, now);
    crackle.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    const crackleGain = this.ctx.createGain();
    crackleGain.gain.setValueAtTime(0.1, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);

    crackle.connect(crackleGain);
    crackleGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
    boom.start(now);
    boom.stop(now + 0.46);
    crackle.start(now);
    crackle.stop(now + 0.31);
  }

  // ── Cleanup ────────────────────────────────────────────────────────

  stopEngine() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.linearRampToValueAtTime(0, now + 0.3);
  }
}
