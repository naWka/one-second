// All sound is synthesised with Web Audio — no files. Off by default; the
// AudioContext is created only after the user turns sound on.

export type SoundName = 'chirp' | 'whoosh' | 'beep' | 'double' | 'tick';

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  enabled = false;
  private drone = 0;

  async setEnabled(on: boolean) {
    this.enabled = on;
    if (on && !this.ctx) this.init();
    if (!this.ctx || !this.master) return;
    if (on && this.ctx.state === 'suspended') await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.15);
  }

  private init() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // "frozen time" drone: detuned low saws through a slow-moving low-pass
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 4;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneFilter.connect(this.droneGain).connect(this.master);
    for (const [f, type, g] of [
      [55, 'sawtooth', 0.22],
      [55.4, 'sawtooth', 0.22],
      [82.4, 'sine', 0.35],
      [110.3, 'triangle', 0.08],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(this.droneFilter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(this.droneFilter.frequency);
    lfo.start();
  }

  /** 0..1 — how "frozen" time is. Drives drone loudness. */
  setDrone(v: number) {
    if (!this.ctx || !this.droneGain || Math.abs(v - this.drone) < 0.01) return;
    this.drone = v;
    this.droneGain.gain.setTargetAtTime(v * 0.32, this.ctx.currentTime, 0.4);
  }

  play(name: SoundName) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const out = this.master;
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, to?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.006);
      g.gain.setValueAtTime(vol, start + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(out);
      o.start(start);
      o.stop(start + dur + 0.02);
    };
    switch (name) {
      case 'chirp':
        tone(1800, t, 0.09, 'sine', 0.12, 4200);
        tone(2400, t + 0.07, 0.12, 'sine', 0.08, 5200);
        break;
      case 'beep':
        tone(2000, t, 0.13, 'square', 0.05);
        break;
      case 'double':
        tone(2000, t, 0.11, 'square', 0.055);
        tone(2000, t + 0.16, 0.16, 'square', 0.055);
        break;
      case 'tick':
        tone(3200, t, 0.03, 'sine', 0.05);
        break;
      case 'whoosh': {
        const len = 0.7;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 2.2;
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(2600, t + len * 0.55);
        bp.frequency.exponentialRampToValueAtTime(700, t + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35, t + len * 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        src.connect(bp).connect(g).connect(out);
        src.start(t);
        break;
      }
    }
  }
}

export const audio = new Audio();
