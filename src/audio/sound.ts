export class Sound {
  private context: AudioContext | null = null;
  private isMuted = false;
  private voiceBuffers = new Map<string, AudioBuffer>();
  private voiceLoading: Promise<void> | null = null;
  private currentVoice: AudioBufferSourceNode | null = null;

  get muted(): boolean { return this.isMuted; }
  set muted(value: boolean) {
    this.isMuted = value;
    if (value) this.resetVoice();
  }

  resetVoice(): void {
    const source = this.currentVoice;
    this.currentVoice = null;
    source?.stop();
  }

  async unlock(): Promise<void> {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      const context = this.context;
      this.voiceLoading ??= Promise.all(['high-beam', 'sorry'].map(async name => {
        const response = await fetch(new URL(`audio/${name}.wav`, document.baseURI));
        if (!response.ok) throw new Error(`Voice unavailable: ${name}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.voiceBuffers.set(name, buffer);
      })).then(() => undefined).catch(() => undefined);
      await this.voiceLoading;
    } catch { this.context = null; }
  }

  private voice(correct: boolean): void {
    const c = this.context;
    const buffer = this.voiceBuffers.get(correct ? 'high-beam' : 'sorry');
    if (!c || this.muted || c.state !== 'running' || !buffer) return;
    // Keep the latest reaction; dense traffic must never build a speech queue.
    this.resetVoice();
    const source = c.createBufferSource(), gain = c.createGain();
    source.buffer = buffer;
    gain.gain.value = correct ? 1.05 : 0.9;
    const grit = correct ? c.createWaveShaper() : null;
    if (grit) {
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 1.7) * 0.85;
      grit.curve = curve;
      source.playbackRate.value = 0.94;
      source.connect(grit); grit.connect(gain);
    } else source.connect(gain);
    gain.connect(c.destination);
    this.currentVoice = source;
    source.onended = () => {
      if (this.currentVoice === source) this.currentVoice = null;
      source.disconnect(); grit?.disconnect(); gain.disconnect();
    };
    source.start();
  }

  private tone(frequency: number, endFrequency: number, duration: number, volume: number, type: OscillatorType): void {
    const c = this.context;
    if (!c || this.muted || c.state !== 'running') return;
    const oscillator = c.createOscillator(), gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, c.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, c.currentTime + duration);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    oscillator.connect(gain); gain.connect(c.destination);
    oscillator.start(); oscillator.stop(c.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private noise(duration: number, volume: number, highpass: number): void {
    const c = this.context;
    if (!c || this.muted || c.state !== 'running') return;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 2;
    const source = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = highpass;
    gain.gain.value = volume;
    source.connect(filter); filter.connect(gain); gain.connect(c.destination);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  swing(): void { this.noise(0.15, 0.07, 650); }
  hit(correct: boolean): void {
    this.tone(110, 34, 0.2, 0.24, 'triangle');
    this.noise(0.26, 0.17, 1800);
    this.tone(correct ? 660 : 150, correct ? 990 : 70, 0.12, 0.045, 'square');
    this.voice(correct);
  }
  tick(): void { this.tone(540, 350, 0.055, 0.035, 'square'); }
  finish(): void { this.tone(330, 82, 0.5, 0.08, 'triangle'); }
}
