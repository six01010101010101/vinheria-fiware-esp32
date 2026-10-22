/**
 * Motor Sonoro Arcade & Fliperama em 8-bits — Vinheria Agnello & Wokwi
 * Sintetizador Web Audio API NATIVO (Zero Dependências Externas, Zero Latência).
 * Efeitos de Moeda do Mario, Cano/Warp, 1-UP/Power-Up e Blip nos Inputs.
 */

class ArcadeAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.08;
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

  // 5. Alerta de Anomalia Estilo Fliperama
  playAlert() {
    this.playTone(320, 0.15, "sawtooth", 120);
    this.playTone(280, 0.20, "sawtooth", 90, 0.12);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.playCoin();
    return this.enabled;
  }
}

window.arcadeAudio = new ArcadeAudioEngine();

// Auto-ligação nos botões, abas, selects e caixas de texto
document.addEventListener("DOMContentLoaded", () => {
  const audio = window.arcadeAudio;

  // Botões -> Moeda Mario
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".vineyard-card");
    if (card) { audio.ensureContext(); audio.playPowerup(); return; }
    const sc = e.target.closest(".sc-btn");
    if (sc) { audio.ensureContext(); audio.playAlert(); return; }
    const target = e.target.closest("button, .btn, .btn-portal, a.btn, a.btn-portal, .theme-btn");
    if (target) {
      audio.ensureContext();
      if (!target.id?.includes("audio-toggle")) audio.playCoin();
    }
  });

  // Selects & Dropdowns -> Warp
  document.addEventListener("change", (e) => {
    if (e.target.matches("select, .form-select, input[type='radio'], input[type='checkbox']")) {
      audio.ensureContext();
      audio.playWarp();
    }
  });

  // Caixas de Texto & Inputs -> Blip suave
  document.addEventListener("focusin", (e) => {
    if (e.target.matches("input[type='text'], input[type='number'], input[type='search'], textarea")) {
      audio.ensureContext();
      audio.playBlip();
    }
  });
});
