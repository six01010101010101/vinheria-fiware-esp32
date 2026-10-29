/**
 * Motor Sonoro Polifônico & Sintetizador Enológico — Vinheria Agnello & Wokwi
 * Web Audio API Nativo com Barramento Desacoplável (Zero Sobreposição de Músicas).
 */

class ArcadeAudioEngine {
  constructor() {
    this.ctx = null; this.bus = null; this.enabled = true; this.volume = 0.095; this._lastHover = 0; this.activeVoices = [];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && !this.bus) {
      this.bus = this.ctx.createGain();
      this.bus.gain.setValueAtTime(1, this.ctx.currentTime);
      this.bus.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  // Interrompe imediatamente qualquer som anterior desconectando o barramento
  stopAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.bus) {
      try {
        this.bus.gain.cancelScheduledValues(now);
        this.bus.gain.setValueAtTime(0, now);
        this.bus.disconnect();
      } catch (_) {}
    }
    try {
      this.bus = this.ctx.createGain();
      this.bus.gain.setValueAtTime(1, now);
      this.bus.connect(this.ctx.destination);
    } catch (_) {}

    if (this.activeVoices && this.activeVoices.length) {
      this.activeVoices.forEach(v => {
        try {
          v.gain.gain.cancelScheduledValues(now);
          v.gain.gain.setValueAtTime(0, now);
          v.gain.disconnect();
          const stopT = Math.max(now, v.startTime || now);
          v.osc.stop(stopT);
          v.osc.disconnect();
        } catch (_) {}
      });
      this.activeVoices = [];
    }
  }

  _cleanupVoices() {
    if (this.ctx) this.activeVoices = this.activeVoices.filter(v => v.stopTime > this.ctx.currentTime);
  }

  playTone(freq, duration, type = "square", endFreq = null, delay = 0, volScale = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.bus) return;
      this._cleanupVoices();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
      const peak = Math.min(0.25, this.volume * volScale);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.bus);
      osc.start(t0);
      osc.stop(t0 + duration);
      this.activeVoices.push({ osc, gain, startTime: t0, stopTime: t0 + duration });
    } catch (_) {}
  }

  playWineHover() {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this._lastHover < 100) return;
    this._lastHover = now;
    this.ensureContext();
    this.playTone(1046.5, 0.05, "sine", 1318.5, 0, 0.35);
  }

  // Seleção de vinho com harmonia clássica (Cancela o som anterior instantaneamente!)
  playWineSelect(stateKey = "ideal", style = "tinto") {
    this.stopAll();
    this.ensureContext();
    if (stateKey === "critico") {
      this.playCritical();
      return;
    }
    if (stateKey === "padrao") {
      [[277.18, 0.16], [329.63, 0.16], [440.0, 0.22], [554.37, 0.38]].forEach(([f, d], i) => {
        this.playTone(f, d * 0.9, "triangle", null, i * 0.075, 0.9);
      });
      return;
    }
    [[329.63, 0.14], [415.30, 0.14], [493.88, 0.14], [659.25, 0.20], [830.61, 0.36]].forEach(([f, d], i) => {
      this.playTone(f, d * 0.9, "sine", null, i * 0.062, 0.95);
    });
  }

  playWineStyle(style, stateKey) { this.playWineSelect(stateKey || window.curScadaMode || "ideal", style); }

  playCavaSelect() {
    this.stopAll();
    this.ensureContext();
    this.playTone(196.0, 0.08, "triangle", 293.66, 0, 1.2);
    this.playTone(392.0, 0.10, "triangle", 587.33, 0.06, 1.1);
    this.playTone(783.99, 0.18, "sine", null, 0.12, 0.95);
  }

  playTerroirSelect() {
    this.stopAll();
    this.ensureContext();
    this.playTone(880.0, 0.06, "sine", 1318.51, 0, 0.95);
    this.playTone(1318.51, 0.07, "sine", 1760.0, 0.055, 0.9);
    this.playTone(1760.0, 0.16, "triangle", 1975.53, 0.11, 0.85);
  }

  playScenario(sc) {
    this.stopAll();
    this.ensureContext();
    if (sc === "normal") this.playWineSelect("ideal");
    else if (sc === "padrao") this.playWineSelect("padrao");
    else this.playCritical();
  }

  playThemeSwitch(mode) {
    this.stopAll();
    this.ensureContext();
    if (mode === "light") [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.playTone(f, 0.09, "sine", null, i * 0.045));
    else if (mode === "dark") [659.25, 523.25, 392.0, 261.63].forEach((f, i) => this.playTone(f, 0.10, "triangle", null, i * 0.045));
    else [440.0, 659.25, 880.0].forEach((f, i) => this.playTone(f, 0.09, "sine", null, i * 0.05));
  }

  playCoin() { this.playTone(987.77, 0.08, "square"); this.playTone(1318.51, 0.28, "square", null, 0.075); }
  playPowerup() { this.playWineSelect("ideal"); }
  playBlip() { this.playTone(932.33, 0.04, "sine", 1174.66, 0, 0.75); }
  playAlert() { this.ensureContext(); this.playTone(520, 0.13, "sawtooth", 220); this.playTone(390, 0.20, "sawtooth", 150, 0.11); }

  // Beethoven: Sonata ao Luar (Limpa barramento anterior e inicia a Sonata solo)
  playCritical() {
    this.stopAll();
    this.ensureContext();
    const notes = [
      [208, 0.16], [277, 0.16], [330, 0.16], [208, 0.16], [277, 0.16], [330, 0.16],
      [247, 0.17], [294, 0.17], [370, 0.17], [220, 0.17], [277, 0.17], [330, 0.17],
      [415, 0.36], [415, 0.18], [415, 0.18], [440, 0.42], [415, 0.26], [392, 0.22], [415, 0.48], [330, 0.30], [277, 0.30], [208, 0.48],
      [330, 0.24], [415, 0.24], [494, 0.36], [554, 0.42], [494, 0.26], [466, 0.22], [494, 0.48], [415, 0.30], [330, 0.30], [247, 0.48],
      [370, 0.26], [440, 0.26], [587, 0.42], [554, 0.32], [494, 0.26], [440, 0.26], [415, 0.46], [277, 0.32], [330, 0.32], [139, 0.60]
    ];
    let offset = 0;
    notes.forEach(([f, d]) => {
      this.playTone(f, d * 0.82, "sine", null, offset, 0.95);
      offset += d;
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.playCoin(); else this.stopAll();
    return this.enabled;
  }
}

window.arcadeAudio = new ArcadeAudioEngine();
window.ArcadeAudio = window.arcadeAudio;
window.playBeep = (freq = 720, duration = 0.08, type = "sine") => {
  window.arcadeAudio?.ensureContext?.();
  window.arcadeAudio?.playTone?.(freq, duration, type);
};

document.addEventListener("DOMContentLoaded", () => {
  const audio = window.arcadeAudio;
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(".wine-pill-btn, .portal-wine-btn, .vineyard-card, .cava-card, .ecosystem-card")) audio.playWineHover();
  });
  document.addEventListener("click", (e) => {
    audio.ensureContext();
    if (e.target.closest(".vineyard-card, .sc-btn, .wine-pill-btn, .portal-wine-btn, .theme-btn, #theme-toggle-btn")) return;
    const btn = e.target.closest("button, .btn, .btn-portal, a.btn, a.btn-portal, .ecosystem-card");
    if (btn && !btn.id?.includes("audio-toggle")) audio.playCoin();
  });
  document.addEventListener("focusin", (e) => {
    if (e.target.matches("input, select, textarea")) { audio.ensureContext(); audio.playBlip(); }
  });
});
