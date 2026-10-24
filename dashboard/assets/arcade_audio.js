/**
 * Motor Sonoro Arcade & Fliperama em 8-bits — Vinheria Agnello & Wokwi
 * Sintetizador Web Audio API NATIVO (Zero Dependências Externas, Zero Latência).
 * Efeitos de Moeda do Mario, Cano/Warp, 1-UP/Power-Up, Blip e Alarmes Enológicos.
 */

class ArcadeAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.09;
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

  playTone(freq, duration, type = "square", endFreq = null, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), t0 + duration);
      }

      gain.gain.setValueAtTime(this.volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + duration);
    } catch (_) {}
  }

  // 1. Som Clássico da Moeda do Super Mario (B5 -> E6)
  playCoin() {
    this.playTone(987.77, 0.08, "square");
    this.playTone(1318.51, 0.32, "square", null, 0.075);
  }

  // 2. Som de Tubo / Warp ao Trocar de Aba ou Preset
  playWarp() {
    this.playTone(440, 0.09, "triangle", 220);
    this.playTone(220, 0.12, "triangle", 660, 0.08);
  }

  // 3. Som de Power-up / 1-UP Enológico ao Selecionar Vinho Nobre
  playPowerup() {
    const notes = [659.25, 783.99, 1318.51, 1046.50, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.08, "square", null, idx * 0.055);
    });
  }

  // 4. Blip Sutil ao Focar em Caixa de Texto ou Input Numérico
  playBlip() {
    this.playTone(880, 0.04, "square");
  }

  // 5. Alerta de Anomalia Térmica / Higro Estilo Fliperama
  playAlert() {
    this.ensureContext();
    this.playTone(480, 0.14, "sawtooth", 160);
    this.playTone(360, 0.22, "sawtooth", 120, 0.12);
  }

  // 6. Sirene de Perigo Crítico / Múltipla Anomalia (Bowser Castle Alert)
  playCritical() {
    this.ensureContext();
    const siren = [880, 1175, 1480, 1760, 1480, 1175];
    siren.forEach((freq, idx) => {
      this.playTone(freq, 0.09, "sawtooth", freq * 0.85, idx * 0.08);
    });
  }

  playClick() {
    this.playTone(987.77, 0.05, "square");
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

// Auto-ligação nos botões, abas, selects e caixas de texto
document.addEventListener("DOMContentLoaded", () => {
  const audio = window.arcadeAudio;

  document.addEventListener("click", (e) => {
    audio.ensureContext();
    const card = e.target.closest(".vineyard-card");
    if (card) return;
    const sc = e.target.closest(".sc-btn");
    if (sc) return;
    const target = e.target.closest("button, .btn, .btn-portal, a.btn, a.btn-portal, .theme-btn");
    if (target && !target.id?.includes("audio-toggle")) audio.playCoin();
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("select, .form-select, input[type='radio'], input[type='checkbox']")) {
      audio.ensureContext();
      audio.playWarp();
    }
  });

  document.addEventListener("focusin", (e) => {
    if (e.target.matches("input[type='text'], input[type='number'], input[type='search'], textarea")) {
      audio.ensureContext();
      audio.playBlip();
    }
  });
});
