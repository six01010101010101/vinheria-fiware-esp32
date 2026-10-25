/**
 * Motor Sonoro Polifônico & Sintetizador Enológico — Vinheria Agnello & Wokwi
 * Web Audio API Nativo (Zero Dependências): Sons diversos por Vinho, Cava, Terroir, Atuador e Tema.
 */

class ArcadeAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.095;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq, duration, type = "square", endFreq = null, delay = 0, volScale = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
      }

      const peak = Math.min(0.25, this.volume * volScale);
      gain.gain.setValueAtTime(peak, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration);
    } catch (_) {}
  }

  // 1. Sons Exclusivos por Estilo de Vinho (8 Estilos)
  playWineStyle(style) {
    this.ensureContext();
    const s = (style || "tinto").toLowerCase();
    const chords = {
      tinto: [[220.0, 277.18, 329.63, 440.0, 554.37], "triangle", 0.14],
      branco: [[659.25, 830.61, 987.77, 1318.51, 1661.22], "sine", 0.12],
      rose: [[349.23, 440.0, 523.25, 659.25, 880.0], "sine", 0.12],
      espumante: [[523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98, 2093.0], "sine", 0.07],
      pinot: [[293.66, 369.99, 440.0, 554.37, 739.99], "triangle", 0.13],
      porto: [[164.81, 207.65, 246.94, 329.63, 415.30], "sawtooth", 0.14],
      sobremesa: [[587.33, 739.99, 880.0, 1108.73, 1479.98], "sine", 0.13],
      laranja: [[392.0, 493.88, 587.33, 739.99, 987.77], "triangle", 0.12]
    };
    const [freqs, wave, dur] = chords[s] || chords.tinto;
    freqs.forEach((f, i) => this.playTone(f, dur, wave, f * 1.02, i * 0.048, 1.0));
  }

  // 2. Som de Seleção de Cava de Guarda / Barrica de Carvalho
  playCavaSelect() {
    this.ensureContext();
    this.playTone(196.0, 0.08, "triangle", 293.66, 0, 1.2);
    this.playTone(392.0, 0.10, "triangle", 587.33, 0.06, 1.1);
    this.playTone(783.99, 0.18, "sine", null, 0.12, 0.95);
  }

  // 3. Som de Radar Satélite Open-Meteo ao Selecionar Terroir Global
  playTerroirSelect() {
    this.ensureContext();
    this.playTone(880.0, 0.06, "sine", 1318.51, 0, 0.95);
    this.playTone(1318.51, 0.07, "sine", 1760.0, 0.055, 0.9);
    this.playTone(1760.0, 0.16, "triangle", 1975.53, 0.11, 0.85);
  }

  // 4. Sons Específicos para cada Cenário / Atuador Wokwi
  playScenario(sc) {
    this.ensureContext();
    switch (sc) {
      case "normal": this.playPowerup(); break;
      case "padrao":
        [523.25, 659.25, 783.99].forEach((f, i) => this.playTone(f, 0.09, "triangle", null, i * 0.06));
        break;
      case "temp":
        // Sirene térmica bitonal de alta temperatura
        [740, 523.25, 784, 493.88].forEach((f, i) => this.playTone(f, 0.11, "sawtooth", f * 0.92, i * 0.085));
        break;
      case "hum":
        // Pulso sonar hidrográfico de umidade
        [330, 493.88, 293.66, 440].forEach((f, i) => this.playTone(f, 0.12, "triangle", f * 0.8, i * 0.09));
        break;
      case "lum":
        // Cintilação óptica de alerta LDR / Penumbra
        [1480, 1174.66, 1567.98, 1046.5].forEach((f, i) => this.playTone(f, 0.08, "square", f * 0.9, i * 0.065, 0.8));
        break;
      case "multi": default:
        this.playCritical(); break;
    }
  }

  // 5. Transição Acústica de Tema (Claro, Escuro, Sistema)
  playThemeSwitch(mode) {
    this.ensureContext();
    if (mode === "light") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.playTone(f, 0.09, "sine", null, i * 0.045));
    } else if (mode === "dark") {
      [659.25, 523.25, 392.0, 261.63].forEach((f, i) => this.playTone(f, 0.10, "triangle", null, i * 0.045));
    } else {
      [440.0, 659.25, 880.0].forEach((f, i) => this.playTone(f, 0.09, "sine", null, i * 0.05));
    }
  }

  playCoin() {
    this.playTone(987.77, 0.08, "square");
    this.playTone(1318.51, 0.28, "square", null, 0.075);
  }

  playWarp() {
    this.playCavaSelect();
  }

  playPowerup() {
    [659.25, 783.99, 1318.51, 1046.50, 1174.66, 1567.98].forEach((f, i) => {
      this.playTone(f, 0.08, "square", null, i * 0.052, 0.9);
    });
  }

  playBlip() {
    this.playTone(932.33, 0.04, "sine", 1174.66, 0, 0.75);
  }

  playAlert() {
    this.ensureContext();
    this.playTone(520, 0.13, "sawtooth", 220);
    this.playTone(390, 0.20, "sawtooth", 150, 0.11);
  }

  playCritical() {
    this.ensureContext();
    [880, 1175, 1480, 1760, 1318, 987].forEach((f, i) => {
      this.playTone(f, 0.09, "sawtooth", f * 0.82, i * 0.075, 1.05);
    });
  }

  playClick() {
    this.playTone(1046.5, 0.045, "triangle");
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.playCoin();
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
