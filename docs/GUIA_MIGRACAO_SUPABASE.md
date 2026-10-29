# 🍇 Guia de Migração e Integração do Banco de Dados Supabase Cloud
### Vinheria Agnello — Check Point 5 (ESP32 Físico & Dashboard SCADA)

Este guia prático foi elaborado para permitir que você transfira e execute este projeto em **outra máquina** e em **outra conta do Supabase** de forma rápida, segura e sem erros de dependência.

---

## 📋 Sumário da Arquitetura Integrada
1. **ESP32 Físico (ou Wokwi)**: Lê DHT11/22 e LDR, avalia os triggers enológicos do vinho localmente, aciona os LEDs e Buzzer na ordem programada, e envia as leituras diretamente para a tabela `vine_telemetry` do Supabase via **HTTPS REST** e via **MQTT HiveMQ**.
2. **Supabase Cloud (PostgreSQL)**: Armazena dispositivos, triggers de 8 estilos de vinho, telemetria histórica, cavas de guarda (12 lotes) e terroirs mundiais.
3. **Dashboard Web SCADA**: Conecta ao Supabase e ao Broker MQTT para visualização em tempo real e controle remoto.

---

## 🚀 Passo a Passo: Migração para Outra Máquina e Outra Conta

### Passo 1: Criar o Projeto no Supabase (Nova Conta)
1. Acesse [https://supabase.com](https://supabase.com) e faça login na sua nova conta.
2. Clique em **"New Project"**.
3. Defina:
   - **Name**: `Vinheria Agnello CP5` (ou o nome que desejar)
   - **Database Password**: Crie uma senha segura e guarde-a.
   - **Region**: `South America (São Paulo)` ou a mais próxima.
4. Aguarde cerca de 1 a 2 minutos até o projeto ficar com status **Active Healthy**.

---

### Passo 2: Executar o Script do Banco de Dados Integrado
1. No menu lateral esquerdo do Supabase, clique em **SQL Editor** (ícone de terminal/código).
2. Clique em **"New query"**.
3. Abra o arquivo [`supabase_schema.sql`](../supabase_schema.sql) (ou `supabase/schema_completo.sql`), copie todo o seu conteúdo e cole no editor do Supabase.
4. Clique no botão verde **"Run"** (ou aperte `Ctrl + Enter`).
5. **Resultado esperado**:
   - Criação das 5 tabelas: `vine_devices`, `vine_trigger_configs`, `vine_telemetry`, `real_vineyards_status`, `cellar_lots`.
   - Criação da trigger function `auto_provision_device` (garante que qualquer placa ESP32 envie dados sem erro de chave estrangeira).
   - Políticas RLS públicas para leitura e gravação anon/authenticated.
   - View analítica `v_vine_telemetry_summary`.
   - Carga inicial (seed) de 8 presets de vinho, 12 lotes mundiais e 12 vinícolas.

---

### Passo 3: Obter a URL e a Chave Pública Anon
1. No painel do seu projeto no Supabase, clique na engrenagem **Project Settings** (canto inferior esquerdo).
2. Vá na aba **API** (em *Configuration*).
3. Copie os seguintes valores:
   - **Project URL**: Exemplo: `https://slqozouuqzxwmfswyroo.supabase.co`
   - **Project API Keys** -> chave `anon` (public): Exemplo: `eyJhbGciOiJIUzI1Ni...`

---

### Passo 4: Configurar o Arquivo `.env` na Nova Máquina
Na raiz do projeto na nova máquina, crie ou edite o arquivo `.env`:
```env
SUPABASE_URL=https://seu-novo-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
FIWARE_HOST=localhost
WOKWI_MQTT_BROKER=broker.hivemq.com
```

---

### Passo 5: Atualizar as Credenciais no Firmware do Arduino ESP32
Abra o código correspondente no Arduino IDE na nova máquina:
- Para o protótipo físico de bancada com **DHT11**: Abra [`hardware/handson_dht11/sketch_handson_dht11.ino`](../hardware/handson_dht11/sketch_handson_dht11.ino)
- Para testes gerais / Wokwi com **DHT22**: Abra [`sketch.ino`](../sketch.ino)

Logo no início do código, atualize as constantes:
```cpp
const char* WIFI_SSID_PRIMARY = "Sua_Rede_WiFi_Ou_Roteador_Celular";
const char* WIFI_PASS_PRIMARY = "Sua_Senha_WiFi";
const char* SUPABASE_URL      = "https://seu-novo-projeto.supabase.co";
const char* SUPABASE_KEY      = "sua_chave_anon_copiada_do_supabase";
```
Grave o código na placa ESP32 via cabo USB.

---

### Passo 6: Testar e Validar a Integração com o Script Python
Na nova máquina, com Python instalado, execute o script de diagnóstico automatizado:
```bash
python scripts/test_supabase_connection.py
```
O script testará o acesso a todas as tabelas e fará uma gravação real simulando o ESP32. Se tudo estiver correto, você verá a mensagem `>> SUCESSO TOTAL!`.

---

## 💡 Matriz de Funcionamento dos LEDs e Buzzer no Hardware Físico

A placa utiliza 3 LEDs de diagnóstico e 1 Buzzer:
- 🟢 **LED Verde (`GPIO 5`)**: Estado **IDEAL** (Saúde 95% a 100%). Condições perfeitas para o vinho atual.
- 🟡 **LED Amarelo (`GPIO 2`)**: Estado **PADRÃO / ATENÇÃO** (Saúde 75% a 94%). Indica 1 desvio moderado na adega.
- 🔴 **LED Vermelho (`GPIO 18`)**: Estado **CRÍTICO** (Saúde < 75%). Múltiplas violações graves dos limites.
- 🔊 **Buzzer Piezoelétrico (`GPIO 4`)**: Emite tons auditivos para cada transição.

### Sequência de Autoteste no Boot (Ao Ligar a Placa)
Assim que o ESP32 é energizado, ele executa um teste físico em ordem:
1. 🟢 **LED Verde liga** por 180ms com bip agudo (1319 Hz) e desliga.
2. 🟡 **LED Amarelo liga** por 180ms com bip médio (784 Hz) e desliga.
3. 🔴 **LED Vermelho liga** por 180ms com bip grave (1480 Hz) e desliga.
4. Entra no modo de monitoramento contínuo do vinho.

> **Dica para o Físico**: Se algum LED não acender durante esse autoteste de 1 segundo:
> - Verifique a polaridade do LED (perna maior = Anodo `+` no GPIO; perna menor com chanfro = Catodo `-` no GND através de resistor de 220 Ω).
> - Certifique-se de que o resistor está bem encaixado na protoboard.
> - O LED Amarelo deve estar ligado no pino `D2` (`GPIO 2`).

### Sequência Sonora ao Mudar o Status do Vinho
Sempre que a temperatura, umidade ou luminosidade alterarem o status do vinho:
- **Transição para Ideal (Normal)**: Bip melódico de confirmação (`1319 Hz`, 90ms).
- **Transição para Atenção (Amarelo)**: Bip duplo de alerta (`784 Hz`, dois pulsos de 70ms).
- **Transição para Crítico (Vermelho)**: Escala de emergência (`1480 Hz` e `1760 Hz`) + apito intermitente.
