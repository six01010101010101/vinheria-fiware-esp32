/**
 * Ecossistema Conectado IoT & Nuvem — Vinheria Agnello
 * Exibe os 6 pilares do ecossistema com detalhamento do conteúdo e transição para nova aba.
 */

const ECOSYSTEM_SERVICES = [
  {
    id: "wokwi",
    title: "Simulador ESP32 Wokwi",
    protocol: "HiveMQ :1883",
    badge: "Hardware Virtual",
    color: "success",
    desc: "ESP32 DevKit v1 acoplado ao barril inteligente com display LCD 16x2 e atuadores.",
    inside: "Firmware C++ (sketch.ino), DHT22 (GPIO 15), LDR (GPIO 34), 3 LEDs, Buzzer Mario e HiveMQ MQTT.",
    url: "https://wokwi.com/projects/478106752109243393",
    icon: "📟"
  },
  {
    id: "status_api",
    title: "API REST v1 (Status)",
    protocol: "HTTP :8050 / Render",
    badge: "Telemetria Live",
    color: "danger",
    desc: "Diagnóstico completo da cava em tempo real com telemetria instantânea e score de saúde.",
    inside: "Snapshot térmico (°C), higrometria (%), penumbra (%), estado dos LEDs e integridade da rolha.",
    url: "api/v1/status/index.html",
    icon: "⚡"
  },
  {
    id: "firebase_rtdb",
    title: "Google Firebase RTDB",
    protocol: "HTTPS :443 (REST)",
    badge: "Cloud NoSQL",
    color: "warning",
    desc: "Persistência em nuvem Google sem servidor para telemetria contínua e sincronia de presets.",
    inside: "Coleções /vinheria/telemetry (leituras a cada 2s) e /vinheria/active_config (estilo e terroir).",
    url: "api/v1/cloud/firebase/index.html",
    icon: "🔥"
  },
  {
    id: "lots_api",
    title: "API REST v1 (Lotes)",
    protocol: "HTTP :8050 / Render",
    badge: "Cavas de Guarda",
    color: "primary",
    desc: "Catálogo de 12 grandes lotes mundiais com safras, solos, tipo de carvalho e apogeu.",
    inside: "Códigos de lote, notas do sommelier, tolerâncias térmicas e filtros por estilo e país.",
    url: "api/v1/lots/index.html",
    icon: "🍷"
  },
  {
    id: "openapi_spec",
    title: "OpenAPI 3.0 Spec",
    protocol: "Swagger / JSON",
    badge: "Contrato REST",
    color: "info",
    desc: "Especificação formal documentando todos os endpoints, esquemas Pydantic e parâmetros.",
    inside: "Schemas dos modelos IoT, rotas /api/v1/*, respostas HTTP 200/404/500 e tipagens estritas.",
    url: "api/v1/openapi.json",
    icon: "📜"
  },
  {
    id: "supabase_sql",
    title: "Supabase Cloud SQL",
    protocol: "PostgreSQL 17",
    badge: "Cloud Relacional",
    color: "success",
    desc: "Banco PostgreSQL na nuvem com 5 tabelas ativas e segurança Row Level Security (RLS).",
    inside: "Tabelas vine_telemetry, vine_devices, real_vineyards_status, cellar_lots e triggers.",
    url: "https://slqozouuqzxwmfswyroo.supabase.co",
    icon: "🗄️"
  }
];

function openEcosystemTab(url) {
  window.arcadeAudio?.playCoin();
  if (url.startsWith("http")) window.open(url, "_blank", "noopener,noreferrer");
  else window.location.href = url;
}

function renderEcosystemPanel() {
  const container = document.getElementById("ecosystem-grid");
  if (!container) return;
  container.innerHTML = ECOSYSTEM_SERVICES.map(s => `
    <div class="col-lg-4 col-md-6 col-12">
      <div class="ecosystem-card h-100 d-flex flex-column justify-content-between p-3" onclick="openEcosystemTab('${s.url}')" title="Clique para abrir ${s.title} em nova aba">
        <div>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="d-flex align-items-center gap-2"><span class="fs-5">${s.icon}</span><strong class="text-truncate" style="font-size:0.88rem;">${s.title}</strong></span>
            <span class="badge bg-${s.color} bg-opacity-25 text-${s.color} border border-${s.color} border-opacity-50" style="font-size:0.62rem;">${s.badge}</span>
          </div>
          <div class="text-muted small mb-1" style="font-size:0.72rem;"><strong>Protocolo:</strong> <code class="text-wine">${s.protocol}</code></div>
          <div class="text-secondary small mb-2" style="font-size:0.75rem;line-height:1.4;">${s.desc}</div>
        </div>
        <div class="pt-2 border-top border-secondary border-opacity-25 mt-2">
          <div class="text-muted small mb-2" style="font-size:0.68rem;line-height:1.35;"><strong class="text-wine">O que há dentro:</strong> ${s.inside}</div>
          <div class="d-flex justify-content-end">
            <a href="${s.url}" ${s.url.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""} class="btn btn-sm btn-wine text-nowrap" style="font-size:0.70rem;padding:4px 12px;" onclick="event.stopPropagation();window.arcadeAudio?.playCoin();">Acessar Serviço →</a>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderEcosystemPanel);
} else {
  renderEcosystemPanel();
}
