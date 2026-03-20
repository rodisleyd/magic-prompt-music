import { VocalSettings } from "../types";

class AudioEngine {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private tensionFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private async init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private makeDistortionCurve(amount: number) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

  private createNoiseBuffer() {
    if (!this.context) return null;
    const bufferSize = 2 * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public async playPreview(gender: 'male' | 'female', settings: VocalSettings) {
    await this.init();
    if (!this.context) return;

    // Stop previous
    this.stop();

    const ctx = this.context;
    
    // Create Nodes
    this.gainNode = ctx.createGain();
    this.distortion = ctx.createWaveShaper();
    this.noiseGain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.tensionFilter = ctx.createBiquadFilter();
    this.compressor = ctx.createDynamicsCompressor();

    // 1. Generate Synthetic "Ahhh" Voice (Simplified Formant Synthesis)
    // For a real app, we'd load a 2-sec sample, but here we'll use a Saw wave + Formant Filter
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(gender === 'male' ? 110 : 220, ctx.currentTime);
    
    // Vocal Fold Vibrato (Expressiveness)
    const vibrato = ctx.createOscillator();
    vibrato.frequency.setValueAtTime(5 + (settings.expressiveness / 50), ctx.currentTime);
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(settings.expressiveness / 20, ctx.currentTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start();

    // 2. DNA: Raspy (Distortion)
    const raspyVal = settings.raspy;
    this.distortion.curve = this.makeDistortionCurve(raspyVal * 2);
    this.distortion.oversample = '4x';

    // 3. DNA: Breathiness (Noise Layer)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
        this.noiseSource = ctx.createBufferSource();
        this.noiseSource.buffer = noiseBuffer;
        this.noiseSource.loop = true;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2500, ctx.currentTime);
        noiseFilter.Q.setValueAtTime(0.5, ctx.currentTime);
        
        this.noiseSource.connect(noiseFilter);
        noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.gainNode);
        this.noiseGain.gain.setValueAtTime((settings.breathiness / 100) * 0.15, ctx.currentTime);
        this.noiseSource.start();
    }

    // 4. DNA: Brightness (High Shelf)
    this.filter.type = 'highshelf';
    this.filter.frequency.setValueAtTime(3000, ctx.currentTime);
    this.filter.gain.setValueAtTime((settings.brightness - 50) / 2, ctx.currentTime);

    // 5. DNA: Tension (Mid Boost + Compression)
    this.tensionFilter.type = 'peaking';
    this.tensionFilter.frequency.setValueAtTime(2500, ctx.currentTime);
    this.tensionFilter.gain.setValueAtTime(settings.tension / 10, ctx.currentTime);
    this.tensionFilter.Q.setValueAtTime(1, ctx.currentTime);

    this.compressor.threshold.setValueAtTime(-20 - (settings.tension / 2), ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4 + (settings.tension / 10), ctx.currentTime);

    // 6. Polish (Master Compression)
    const masterComp = ctx.createDynamicsCompressor();
    masterComp.threshold.setValueAtTime(-10, ctx.currentTime);
    masterComp.ratio.setValueAtTime(settings.polish / 10 || 2, ctx.currentTime);

    // Routing: OSC -> Tension -> Filter -> Distortion -> MasterComp -> Gain -> Dest
    osc.connect(this.tensionFilter);
    this.tensionFilter.connect(this.filter);
    
    // Apply distortion only if raspy > 10
    if (raspyVal > 10) {
        this.filter.connect(this.distortion);
        this.distortion.connect(masterComp);
    } else {
        this.filter.connect(masterComp);
    }

    masterComp.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    // ADSR Envelope
    this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    this.gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.5);
    this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

    osc.start();
    osc.stop(ctx.currentTime + 2.0);
    
    this.source = null; // Store if needed
  }

  public stop() {
    if (this.source) {
        try { this.source.stop(); } catch(e) {}
    }
    if (this.noiseSource) {
        try { this.noiseSource.stop(); } catch(e) {}
    }
  }
}

export const audioEngine = new AudioEngine();
