# 📲 Guia de Integração do Telegram Bot — Grupo "Admin Vinheira"
### Vinheria Agnello · Alertas IoT e Monitoramento Global por Satélite

Este guia explica como conectar o sistema de monitoramento da **Vinheria Agnello** ao seu Telegram para receber alertas automáticos de status crítico e avisos de adega no grupo **Admin Vinheira** (vinculado ao seu número `11981237033`).

---

## 🔒 Por que usar um Bot do Telegram?
Por diretrizes globais de segurança e privacidade do Telegram:
* Aplicativos externos e robôs **não podem criar grupos automaticamente em nome de contas pessoais** via telefone/CPF (a criação de contas e grupos exige confirmação por código SMS direto no seu celular).
* O Telegram disponibiliza a **Telegram Bot API oficial**: você cria o seu Bot em menos de 1 minuto, cria o grupo **Admin Vinheira** no seu aplicativo e adiciona o Bot como membro. A partir daí, o sistema envia alertas em tempo real com emojis, status por satélite e relatórios instantâneos.

---

## 🚀 Passo a Passo: Configuração em 3 Minutos

### Passo 1: Criar o seu Bot no Telegram
1. No seu aplicativo Telegram no celular (`11981237033`), busque por: **`@BotFather`** (verifique o selo azul de verificado).
2. Envie a mensagem: `/newbot`
3. Digite o nome do bot: `Vinheria Agnello Alertas`
4. Digite o username do bot (deve terminar em `bot`): Exemplo `vinheria_agnello_admin_bot`
5. O BotFather responderá com o seu **Token de Acesso**:
   `Exemplo: 7123456789:AAFn8xYz_AbcDeFgHiJkLmNoPqRsTuVwXyZ`
   *(Copie e guarde este token).*

---

### Passo 2: Criar o Grupo "Admin Vinheira"
1. No seu Telegram, clique em **Novo Grupo**.
2. Adicione o seu próprio Bot (o username que você criou no Passo 1) e crie o grupo com o nome exato: **`Admin Vinheira`**.
3. Envie qualquer mensagem no grupo (ex: `/start` ou `Ola adega`) para gerar o histórico inicial.

---

### Passo 3: Descobrir o `CHAT_ID` do Grupo
1. No seu navegador, abra o link (substituindo pelo seu token do Passo 1):
   `https://api.telegram.org/bot<SEU_TOKEN_AQUI>/getUpdates`
2. Procure pelo campo `"chat":{"id": -100xxxxxxxxxx, "title": "Admin Vinheira"}`.
3. Copie o número do `id` (incluindo o sinal negativo `-`, se houver).
   *(Dica: Se preferir, adicione o bot `@RawDataBot` no grupo e ele mostrará o `Chat ID` instantaneamente).*

---

### Passo 4: Inserir no Arquivo `.env`
No arquivo `.env` da raiz do projeto, adicione:
```env
TELEGRAM_BOT_TOKEN=7123456789:AAFn8xYz_AbcDeFgHiJkLmNoPqRsTuVwXyZ
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_GROUP_NAME=Admin Vinheira
TELEGRAM_ADMIN_PHONE=11981237033
```

---

## 🧪 Como Testar o Envio dos Alertas

1. **Pelo Dashboard Web**:
   * Abra [http://localhost:8050/dashboard.html](http://localhost:8050/dashboard.html).
   * No topo da página, clique no botão azul **📲 Telegram: Admin Vinheira**.
   * Uma notificação toast confirmará o disparo e a mensagem chegará no grupo!
2. **Disparo Automático por Satélite**:
   * Sempre que você selecionar um terroir cuja temperatura ou umidade do satélite esteja em estado **🔴 CRÍTICO**:
     * O site aciona o alarme sonoro (buzzer).
     * O Wokwi recebe o comando e pisca o **LED Vermelho (`GPIO 18`)** com o buzzer físico apitando.
     * O sistema envia imediatamente o relatório com as coordenadas e diagnóstico para o grupo Telegram!
