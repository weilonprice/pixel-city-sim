import { WeatherType } from './Constants.ts';

/**
 * Web Audio API synthesizer for retro 16-bit sound effects and dynamic procedural soundscape.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Ambient soundscape nodes
  private ambientStarted: boolean = false;
  private breezeGain: GainNode | null = null;
  private trafficGain: GainNode | null = null;
  private industryGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  // Last event timestamps for procedural ambiance
  private lastHornTime: number = 0;
  private lastCricketTime: number = 0;
  private lastSirenTime: number = 0;
  private lastThunderTime: number = 0;

  constructor() {
    // Check saved mute state from LocalStorage
    try {
      const savedMute = localStorage.getItem('pixel_city_sim_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch {
      // LocalStorage access fallback
    }
  }

  public initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    try {
      localStorage.setItem('pixel_city_sim_audio_muted', this.isMuted.toString());
    } catch {
      // Fallback
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.initCtx();
    return this.setMuted(!this.isMuted);
  }

  // --- ONE-SHOT PROCEDURAL SFX ---

  // Click / Select sound
  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Build / Placement sound (crisp retro wooden/thud click)
  public playBuild() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Demolish / Bulldoze sound (crunchy low rumble)
  public playDemolish() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // Error / Cannot build sound (low buzz)
  public playError() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Cash / Coin collect chime (high two-tone chime)
  public playCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Camera Snapshot shutter click ("ka-click")
  public playCameraShutter() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // First click: high tick
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);
    gain1.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.03);

    // Second click: metallic shutter release 40ms later
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(750, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.06);
      gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.06);
    }, 40);
  }

  // Car Horn ("beep-beep")
  public playCarHorn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t); // A4
    osc.frequency.setValueAtTime(554.37, t); // C#5

    gain.gain.setValueAtTime(0.03, t);
    gain.gain.setValueAtTime(0.001, t + 0.08);
    gain.gain.setValueAtTime(0.03, t + 0.12);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Transit Bus Pneumatic Air Brake hiss & passenger bell
  public playBusAirBrake() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Soft transit chime bell (F#5)
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(740, t);
    bellGain.gain.setValueAtTime(0.06, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain);
    bellOsc.start(t);
    bellOsc.stop(t + 0.35);

    // Air release hiss using noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.22);
    filter.Q.setValueAtTime(1.5, t);

    const hissGain = this.ctx.createGain();
    hissGain.gain.setValueAtTime(0.05, t);
    hissGain.gain.linearRampToValueAtTime(0.001, t + 0.25);

    whiteNoise.connect(filter);
    filter.connect(hissGain);
    hissGain.connect(this.masterGain);

    whiteNoise.start(t);
  }

  // Triumphant Population Milestone Fanfare
  public playMilestoneFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const notes = [
      { f: 261.63, delay: 0.00, dur: 0.12 }, // C4
      { f: 329.63, delay: 0.12, dur: 0.12 }, // E4
      { f: 392.00, delay: 0.24, dur: 0.12 }, // G4
      { f: 523.25, delay: 0.36, dur: 0.20 }, // C5
      { f: 392.00, delay: 0.56, dur: 0.12 }, // G4
      { f: 523.25, delay: 0.68, dur: 0.45 }  // C5 (Hold)
    ];

    notes.forEach(n => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t + n.delay);

      gain.gain.setValueAtTime(0.08, t + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.delay + n.dur);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + n.delay);
      osc.stop(t + n.delay + n.dur);
    });

    // Sustained high chord accompaniment at 0.68s
    [659.25, 783.99, 1046.50].forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + 0.68);
      gain.gain.setValueAtTime(0.05, t + 0.68);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + 0.68);
      osc.stop(t + 1.2);
    });
  }

  // Civic Celebration Cheer (Applause + crowd cheer)
  public playCivicCheer() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const dur = 0.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(1400, t + 0.4);
    filter.Q.setValueAtTime(1.0, t);

    const cheerGain = this.ctx.createGain();
    cheerGain.gain.setValueAtTime(0.06, t);
    cheerGain.gain.linearRampToValueAtTime(0.001, t + dur);

    whiteNoise.connect(filter);
    filter.connect(cheerGain);
    cheerGain.connect(this.masterGain);

    whiteNoise.start(t);
  }

  // Locomotive Train Horn (Classic twin-tone brass chime)
  public playTrainHorn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const dur = 0.55;
    // Classic diesel/passenger train chime: Eb4 (311Hz), G4 (392Hz), Bb4 (466Hz)
    const freqs = [311.13, 392.00, 466.16];

    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      // Slight pitch droop characteristic of pneumatic air horns
      osc.frequency.linearRampToValueAtTime(f * 0.98, t + dur);

      // Lowpass filter to give warm brass body
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.04); // quick attack
      gain.gain.setValueAtTime(0.045, t + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0.0001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // Rhythmic Steam / Steel Rail Wheel Click
  public playTrainChug() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const dur = 0.08;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(t);
  }

  // Emergency Siren wail
  public playSiren() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.4);
    osc.frequency.linearRampToValueAtTime(600, t + 0.8);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.85);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.85);
  }

  // Nighttime Cricket Chirp
  public playNightCricket() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4500, t);

    // Rapid double pulse
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.setValueAtTime(0.001, t + 0.03);
    gain.gain.setValueAtTime(0.02, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Thunderstorm clap & rumble
  public playThunder() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 2.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(65, t + 2.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.08); // sharp crack
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // --- DYNAMIC AMBIENT SOUNDSCAPE ENGINE ---

  public startAmbientLoop() {
    if (this.ambientStarted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    this.ambientStarted = true;

    // 1. Nature / Breeze Loop (filtered noise)
    const breezeBufferSize = this.ctx.sampleRate * 2;
    const breezeBuffer = this.ctx.createBuffer(1, breezeBufferSize, this.ctx.sampleRate);
    const breezeData = breezeBuffer.getChannelData(0);
    for (let i = 0; i < breezeBufferSize; i++) {
      breezeData[i] = Math.random() * 2 - 1;
    }

    const breezeSource = this.ctx.createBufferSource();
    breezeSource.buffer = breezeBuffer;
    breezeSource.loop = true;

    const breezeFilter = this.ctx.createBiquadFilter();
    breezeFilter.type = 'lowpass';
    breezeFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

    breezeSource.connect(breezeFilter);
    breezeFilter.connect(this.breezeGain);
    this.breezeGain.connect(this.masterGain);
    breezeSource.start();

    // 2. City Traffic Hum (lower frequency rumble)
    const trafficSource = this.ctx.createBufferSource();
    trafficSource.buffer = breezeBuffer;
    trafficSource.loop = true;

    const trafficFilter = this.ctx.createBiquadFilter();
    trafficFilter.type = 'bandpass';
    trafficFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    trafficFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.trafficGain = this.ctx.createGain();
    this.trafficGain.gain.setValueAtTime(0, this.ctx.currentTime);

    trafficSource.connect(trafficFilter);
    trafficFilter.connect(this.trafficGain);
    this.trafficGain.connect(this.masterGain);
    trafficSource.start();

    // 3. Industrial Hum (low harmonic hum)
    const indOsc = this.ctx.createOscillator();
    indOsc.type = 'triangle';
    indOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    this.industryGain = this.ctx.createGain();
    this.industryGain.gain.setValueAtTime(0, this.ctx.currentTime);

    indOsc.connect(this.industryGain);
    this.industryGain.connect(this.masterGain);
    indOsc.start();

    // 4. Rain Loop (patter/hiss)
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = breezeBuffer;
    rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.setValueAtTime(1300, this.ctx.currentTime);
    rainFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSource.start();
  }

  /**
   * Updates ambient volumes based on real-time city state, weather, and time of day.
   */
  public updateAmbient(population: number, industrialJobs: number, gameHour: number, activeFires: number, weather: WeatherType = WeatherType.CLEAR) {
    if (!this.ambientStarted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Traffic volume scales with population (max 0.035)
    const targetTraffic = Math.min(0.035, (population / 500) * 0.035);
    if (this.trafficGain) {
      this.trafficGain.gain.linearRampToValueAtTime(targetTraffic, now + 1.0);
    }

    // Industrial hum scales with factories
    const targetIndustry = Math.min(0.025, (industrialJobs / 200) * 0.025);
    if (this.industryGain) {
      this.industryGain.gain.linearRampToValueAtTime(targetIndustry, now + 1.0);
    }

    // Breeze volume is slightly higher when city is small
    const targetBreeze = population > 100 ? 0.008 : 0.016;
    if (this.breezeGain) {
      this.breezeGain.gain.linearRampToValueAtTime(targetBreeze, now + 1.0);
    }

    // Rain soundscape volume
    const isRaining = weather === WeatherType.RAIN || weather === WeatherType.THUNDERSTORM;
    const targetRain = isRaining ? (weather === WeatherType.THUNDERSTORM ? 0.035 : 0.02) : 0;
    if (this.rainGain) {
      this.rainGain.gain.linearRampToValueAtTime(targetRain, now + 1.2);
    }

    // Procedural Thunder during thunderstorms (every ~10-18 seconds)
    if (weather === WeatherType.THUNDERSTORM && now - this.lastThunderTime > 12 && Math.random() < 0.35) {
      this.lastThunderTime = now;
      this.playThunder();
    }

    // Procedural Car Horn in populated cities (every ~12-18 seconds)
    if (population >= 40 && now - this.lastHornTime > 14 && Math.random() < 0.25) {
      this.lastHornTime = now;
      this.playCarHorn();
    }

    // Procedural Siren when fires are active
    if (activeFires > 0 && now - this.lastSirenTime > 10) {
      this.lastSirenTime = now;
      this.playSiren();
    }

    // Procedural Crickets at night when not raining (hours 21:00 to 05:00)
    const isNight = gameHour >= 21 || gameHour <= 5;
    if (isNight && !isRaining && now - this.lastCricketTime > 8 && Math.random() < 0.35) {
      this.lastCricketTime = now;
      this.playNightCricket();
    }
  }
}

export const sounds = new SoundManager();
