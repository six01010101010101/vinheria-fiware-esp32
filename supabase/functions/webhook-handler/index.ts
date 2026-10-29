// Supabase Edge Function (Deno) - Webhook Handler Vinheria Agnello CP5
// Resposta Imediata HTTP 200, Idempotência no Supabase e Disparo no Telegram

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://slqozouuqzxwmfswyroo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "-5001665013";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const processedMemoryCache = new Set<string>();

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const eventId = String(payload.id || payload.transaction_id || payload.event_id || `evt_${Date.now()}`);

    // 1. IDEMPOTÊNCIA EM MEMÓRIA (Evita spam no Telegram)
    if (processedMemoryCache.has(eventId)) {
      console.log(`[Edge Function] Evento ${eventId} já processado em memória. Ignorando.`);
      return new Response(JSON.stringify({ received: true, event_id: eventId, cached: true }), { status: 200 });
    }
    processedMemoryCache.add(eventId);

    // 2. IDEMPOTÊNCIA NO SUPABASE (PostgreSQL 17)
    const { data: existingEvent } = await supabase
      .from("vine_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[Edge Function] Evento ${eventId} já existe no Supabase. Ignorando.`);
      return new Response(JSON.stringify({ received: true, event_id: eventId, duplicated: true }), { status: 200 });
    }

    // 3. PERSISTÊNCIA NO SUPABASE
    await supabase.from("vine_webhook_events").insert({
      event_id: eventId,
      event_type: payload.type || payload.event || "webhook",
      payload: payload,
      processed: true,
    });

    // 4. ENVIO PARA O TELEGRAM (Grupo Admin Vinheira)
    const title = payload.title || payload.event || "Notificação de Webhook";
    const terroir = payload.terroir || payload.lot_code || "Geral";
    const status = payload.status || "INFO";
    const msg = `🔔 *WEBHOOK RECEBIDO (EDGE FUNCTION)*\n━━━━━━━━━━━━━━━━━━━━━━\n📌 *Evento:* \`${title}\`\n🆔 *ID:* \`${eventId}\`\n📍 *Origem:* ${terroir}\n⚡ *Status:* \`${status}\`\n⏰ *Data:* \`${new Date().toLocaleString("pt-BR")}\`\n━━━━━━━━━━━━━━━━━━━━━━\n📲 _Grupo Admin Vinheira (${TELEGRAM_CHAT_ID})_`;

    // Processamento assíncrono de envio (não bloqueia resposta ao gateway)
    sendTelegramMessage(TELEGRAM_CHAT_ID, msg);

    // Retorno HTTP 200 com confirmação de recebimento
    return new Response(JSON.stringify({ received: true, event_id: eventId }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[Erro no Hook Edge]:", (error as Error).message);
    return new Response(JSON.stringify({ received: false, error: (error as Error).message }), { status: 500 });
  }
});
