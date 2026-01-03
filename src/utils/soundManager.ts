// Enhanced Sound Manager with softer, more pleasant UI sounds

class SoundManager {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("AudioContext not supported");
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private async ensureContext() {
    if (!this.context) return false;
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    return true;
  }

  // Helper to play a sound with envelope
  private playOscillator(
    freq: number, 
    type: OscillatorType, 
    startTime: number, 
    duration: number, 
    vol: number
  ) {
    if (!this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Envelope for smoother sound (Avoid clicks)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  async playClick() {
    if (!this.enabled || !await this.ensureContext()) return;
    const t = this.context!.currentTime;
    
    // Soft "Pop" sound (Sine wave with quick pitch drop)
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();
    
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.context!.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  async playSuccess() {
    if (!this.enabled || !await this.ensureContext()) return;
    const t = this.context!.currentTime;

    // Pleasant "Ding" (Two sine waves harmonizing)
    this.playOscillator(880, 'sine', t, 0.4, 0.1); // A5
    this.playOscillator(1760, 'sine', t, 0.4, 0.05); // A6 (Harmonic)
  }

  async playError() {
    if (!this.enabled || !await this.ensureContext()) return;
    const t = this.context!.currentTime;

    // Soft Error (Low triangle wave)
    this.playOscillator(150, 'triangle', t, 0.3, 0.15);
    this.playOscillator(140, 'triangle', t + 0.05, 0.3, 0.15); // Dissonance
  }

  async playWin() {
     if (!this.enabled || !await this.ensureContext()) return;
     const t = this.context!.currentTime;

     // Victory Arpeggio (C Major 7)
     const speed = 0.08;
     this.playOscillator(523.25, 'sine', t, 0.6, 0.1); // C5
     this.playOscillator(659.25, 'sine', t + speed, 0.6, 0.1); // E5
     this.playOscillator(783.99, 'sine', t + speed*2, 0.6, 0.1); // G5
     this.playOscillator(987.77, 'sine', t + speed*3, 0.8, 0.1); // B5
     this.playOscillator(1046.50, 'sine', t + speed*4, 1.0, 0.15); // C6
  }
}

export const soundManager = new SoundManager();
