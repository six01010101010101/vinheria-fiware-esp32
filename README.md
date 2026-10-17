# 🍷 Monitoramento Global de Vinherias — IoT, FIWARE & Dashboard Dinâmico

![FIWARE](https://img.shields.io/badge/FIWARE-Orion%20%7C%20IoT%20Agent%20%7C%20STH--Comet-0095D9?style=for-the-badge)
![ESP32](https://img.shields.io/badge/Hardware-ESP32%20%2B%20DHT11%2F22%20%2B%20LDR%20%2B%20Buzzer-E7352C?style=for-the-badge)
![Python](https://img.shields.io/badge/Dashboard-Python%20%7C%20Dash%20%7C%20Plotly-3776AB?style=for-the-badge)
![Tests](https://img.shields.io/badge/TDD-9%20Passed%20(Pytest)-2EA44F?style=for-the-badge)

> **Check Point 5 — Edge Computing & Computer Systems**  
> Solução ponta a ponta de telemetria enológica em tempo real, análise de séries históricas via **API 8666 do STH-Comet**, provisionamento dinâmico de **IoT Devices** e acionamento remoto de alertas visuais (**LED Azul piscante**) e sonoros (**Buzzer multi-frequência por tipo de anomalia**) comandados diretamente pelo **Front-end**.

---

## 👥 Integrantes do Grupo

| Nome Completo | RM | Responsabilidade Principal |
| :--- | :---: | :--- |
| **[Inserir Nome do Integrante 1]** | `RM XXXXX` | Firmware ESP32 (`.ino`), Sensores DHT/LDR e Simulação Wokwi |
| **[Inserir Nome do Integrante 2]** | `RM XXXXX` | Infraestrutura FIWARE (Orion, IoT Agent MQTT e STH-Comet) |
| **[Inserir Nome do Integrante 3]** | `RM XXXXX` | Dashboard Dinâmico Web (Dash/Plotly) e Motor de Triggers |
| **[Inserir Nome do Integrante 4]** | `RM XXXXX` | Documentação Técnica, Testes TDD e Pitch Hands-on |

---

## 📖 1. Descrição Completa da Solução

A conservação de vinhos de alta gama exige controle rigoroso de **Temperatura**, **Umidade Relativa** e **Luminosidade**. Variações térmicas aceleram reações químicas indesejadas, baixa umidade resseca as rolhas permitindo oxidação, e a incidência luminosa degrada compostos fenólicos (*lightstrike*).

Nossa solução resolve esse desafio através de uma arquitetura distribuída em **4 camadas**:
1. **Sensores & Atuadores (ESP32)**: Coleta contínua de temperatura e umidade (**DHT-11** em bancada física / **DHT-22** no Wokwi) e luminosidade (**LDR** no `ADC1`), publicando via protocolo **Ultralight 2.0 sobre MQTT**.
2. **Back-end FIWARE**: O **IoT Agent MQTT (`:4041`)** traduz os pacotes para entidades NGSI-v2 no **Orion Context Broker (`:1026`)**, enquanto o **STH-Comet (`:8666`)** persiste as séries históricas no **MongoDB**.
3. **Dashboard Dinâmico Web (Python / Dash / Plotly)**: Permite cadastrar e remover IoT Devices em tempo real, visualizar gráficos dinâmicos históricos da API `8666` do STH-Comet e ajustar os **Triggers (Mín/Máx)** de cada grandeza.
4. **Acionamento Remoto Inteligente pelo Front-end**: Sempre que qualquer parâmetro ultrapassa os triggers definidos no dashboard, o Front-end envia automaticamente um comando remoto via FIWARE (`PATCH /v2/entities/{id}/attrs`) que faz o **LED Azul do ESP32 piscar ininterruptamente** e aciona o **Buzzer com uma assinatura sonora exclusiva para cada tipo de anomalia**, desligando-os assim que o valor retorna à faixa normal.

---

## 🏗️ 2. Arquitetura em Camadas

```mermaid
flowchart TB
    subgraph L1["Camada 1: IoT Edge Device (Hardware ESP32)"]
        DHT["Sensor DHT-11 / DHT-22<br/>(Temp °C & Umidade %)"]
        LDR["Sensor LDR (ADC1 GPIO 34)<br/>(Luminosidade 0-100%)"]
        ESP["ESP32 DevKit V1<br/>Cliente MQTT Ultralight 2.0"]
        LED["LED Azul (GPIO 2)<br/>Pisca Remotamente em Anomalia"]
        BUZ["Buzzer (GPIO 4)<br/>Tons Distintos por Anomalia"]
        DHT --> ESP
        LDR --> ESP
        ESP --> LED
        ESP --> BUZ
    end

    subgraph L2["Camada 2: Transporte & Mensageria"]
        MOSQ["Eclipse Mosquitto<br/>Broker MQTT (:1883)"]
    end

    subgraph L3["Camada 3: Back-end FIWARE & Persistência"]
        IOTA["IoT Agent MQTT (:4041)<br/>Provisionamento & Tradução UL2.0"]
        ORION["Orion Context Broker (:1026)<br/>Contexto em Tempo Real & Comandos"]
        STH["STH-Comet (:8666)<br/>API de Séries Históricas"]
        MONGO[("MongoDB (:27017)<br/> Context & TimeSeries DB")]
        IOTA <--> ORION
        ORION --> STH
        STH --> MONGO
        IOTA --> MONGO
    end

    subgraph L4["Camada 4: Aplicação Web (Dashboard Python Dash/Plotly :8050)"]
        UI_DEV["Gerenciador de IoT Devices<br/>(Cadastro / Listagem / Exclusão)"]
        UI_CHART["Gráficos Dinâmicos Plotly<br/>(Consumo Histórico Porta 8666)"]
        UI_TRIG["Motor de Triggers + Presets de Vinho<br/>(Disparo Remoto Automático)"]
    end

    ESP -- "Publica /TEF/vine001/attrs (t|h|l)" --> MOSQ
    MOSQ -- "Subscreve /TEF/vine001/cmd (alert)" --> ESP
    MOSQ <--> IOTA
    UI_DEV -- "POST/GET/DELETE :4041/iot/devices" --> IOTA
    UI_CHART -- "GET :8666/STH/v1/contextEntities/..." --> STH
    UI_TRIG -- "PATCH :1026/v2/entities/{id}/attrs (alert)" --> ORION
```

### Fluxo de Sequência do Alerta Remoto (Ativado pelo Front-end)

```mermaid
sequenceDiagram
    participant ESP as ESP32 (DHT + LDR + LED + Buzzer)
    participant FIW as FIWARE (IoT Agent + Orion + STH-Comet)
    participant DASH as Front-end Dashboard (Dash :8050)

    ESP->>FIW: MQTT Publish /TEF/vine001/attrs -> "t|23.5|h|68.0|l|12.0"
    FIW->>FIW: Atualiza Orion (:1026) e grava histórico no STH-Comet (:8666)
    DASH->>FIW: Consulta série histórica (GET :8666) e estado atual (GET :1026)
    DASH->>DASH: TriggerAlertService detecta Temperatura (23.5°C) > Trigger Máx (18.0°C)
    DASH->>FIW: PATCH :1026/v2/entities/urn:ngsi-ld:Vine:001/attrs {"alert": "temp"}
    FIW->>ESP: MQTT Publish /TEF/vine001/cmd -> "vine001@alert|temp"
    ESP->>ESP: Ativa LED Azul Piscando + Buzzer Tipo 1 (2000 Hz) continuamente
    ESP->>FIW: MQTT Publish /TEF/vine001/cmdexe -> "vine001@alert|OK_temp"
```

---

## 🔊 3. Matriz de Alertas Visuais e Sonoros por Tipo de Anomalia

Todas as vezes que um parâmetro sai da faixa de triggers configurada no Front-end, o dashboard envia o comando correspondente para o ESP32:

| Estado / Anomalia Detectada | Comando FIWARE | Comportamento do LED Azul (`GPIO 2`) | Assinatura Sonora do Buzzer (`GPIO 4`) |
| :--- | :---: | :--- | :--- |
| ✅ **Parâmetros Normais** | `alert\|normal` | **Desligado (`LOW`)** | Silenciado (`noTone`) |
| 🌡️ **Anomalia de Temperatura** | `alert\|temp` | **Piscando continuamente (400 ms)** | **Tipo 1**: Bips Agudos Rápidos (`2000 Hz` por `180 ms`) |
| 💧 **Anomalia de Umidade** | `alert\|hum` | **Piscando continuamente (400 ms)** | **Tipo 2**: Pulsos Graves Encorpados (`850 Hz` por `280 ms`) |
| ☀️ **Anomalia de Luminosidade** | `alert\|lum` | **Piscando continuamente (400 ms)** | **Tipo 3**: Sirene Alternada Dupla (`1200 Hz` / `1700 Hz`) |
| 🚨 **Anomalia Múltipla (2+ sensores)** | `alert\|multi` | **Piscando rápido (200 ms)** | **Tipo 4**: Escala Tripla de Emergência (`1000` → `1800` → `2500 Hz`) |

---

## 🏆 4. Diferenciais Implementados (10% da Nota)

1. **Telemetria Verídica em Tempo Real de 9 Vinícolas Reais do Mundo (Satélite & Estações Open-Meteo)**: Monitoramento ao vivo de Temperatura (`°C`), Umidade Relativa (`%`), Luminosidade Solar (`%` e `W/m²`) e Ponto de Orvalho (*Magnus-Tetens*) de **Vinícola Miolo (RS)**, **Villa Francioni (SC)**, **Vinícola Guaspari (SP)**, **Bodega Catena Zapata (Argentina)**, **Viña Concha y Toro (Chile)**, **Château Margaux (França)**, **Marchesi Antinori (Itália)**, **Quinta do Crasto (Portugal)** e **Opus One (EUA)**.
2. **Protótipo 3D Físico (`Corpo_Barril.STL` + `Tampa_Display_LCD16x2.STL`) + Telinha Verde LCD 16x2 (`66×26mm`)**: Integração visual e física do recorte retangular da tampa com display LCD 16x2 I2C (`SDA 21 / SCL 22`) e **3 LEDs (`Verde GPIO 5`, `Vermelho GPIO 18`, `Azul Remoto GPIO 2`) + Buzzer (`GPIO 4`)**.
3. **Presets Enológicos Inteligentes & Gráficos SCADA**: Seleção com 1 clique para **Vinho Tinto**, **Branco & Rosé**, **Espumante** e **Cave de Envelhecimento**, com gráficos Plotly contendo zona ideal sombreada, marcadores diamante em anomalias e linha de média.
4. **Integração de API Plug-and-Play Bidirecional (`Wokwi ↔ Site ↔ Supabase Cloud`)**: Qualquer pessoa que baixar a pasta e abrir o Wokwi tem comunicação em tempo real nos dois sentidos, sem precisar configurar `.env`, coberto por **13 testes automatizados (`pytest`)**.

---

## 📂 5. Estrutura Modular do Projeto

```text
├── INICIAR_PROJETO.bat                 # Inicializador de 1 clique (abre Site + Wokwi já sincronizados)
├── sketch.ino                          # Firmware ESP32 Zero-Libs (DHT22 + LDR + LCD 16x2 I2C + 3 LEDs + Buzzer)
├── diagram.json                        # Circuito Wokwi completo (ESP32 + LCD 16x2 Verde + 3 LEDs + Sensores)
├── supabase_schema.sql                 # Schema PostgreSQL otimizado (Índices B-Tree, RLS e View Analítica)
├── hardware/
│   ├── wokwi_dht22/                    # Projeto completo para o Simulador Wokwi (DHT-22 + LCD 16x2)
│   └── handson_dht11/                  # Firmware calibrado para o Barril Físico (DHT-11 + LCD 16x2)
├── dashboard/
│   ├── app.py                          # Entrypoint do servidor web Dash + API REST (Porta 8050)
│   ├── requirements.txt                # Dependências Python
│   ├── src/
│   │   ├── config/settings.py          # Configurações Plug-and-Play (MQTT, FIWARE, Supabase, Open-Meteo)
│   │   ├── models/iot_models.py        # Dataclasses tipadas (Triggers, Séries, Vinícolas Reais)
│   │   ├── repositories/               # Clientes MQTT Wokwi, Open-Meteo, Supabase, STH-Comet e Orion
│   │   ├── services/                   # Regras de negócio de Triggers, Alertas Remotos e Devices
│   │   └── ui/                         # Componentes visuais, Telinha Verde, Gráficos SCADA e Rotas API
│   └── tests/                          # 13 testes automatizados (Pytest)
└── docs/
    └── MANUAL_INSTALACAO_E_OPERACAO.md # Manual completo de montagem de Hardware e operação de Software
```

---

## 🚀 6. Links Rápidos e Execução Plug-and-Play (Para Avaliadores)

- 💻 **Repositório Oficial no GitHub**:
  - 👉 **[https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32](https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32)**
- 🌐 **Link Oficial da Simulação no Wokwi (ESP32 + Tela Verde LCD 16x2 + 3 LEDs + Buzzer + DHT22 + LDR)**:
  - 👉 **[https://wokwi.com/projects/478106752109243393](https://wokwi.com/projects/478106752109243393)**
- 🗄️ **Banco de Dados em Nuvem no Supabase (PostgreSQL — `Vinheria Agnello CP5`)**:
  - 👉 **API / Project URL**: `https://slqozouuqzxwmfswyroo.supabase.co` (`vine_devices`, `vine_trigger_configs`, `vine_telemetry`, `real_vineyards_status`, `v_vine_telemetry_summary`)
- 📘 **[Manual Completo de Instalação e Operação (Software + Hardware)](./docs/MANUAL_INSTALACAO_E_OPERACAO.md)**

### Como Executar ao Baixar a Pasta (Zero Configuração):
1. Dê um **duplo clique em `INICIAR_PROJETO.bat`** (ou execute os comandos abaixo) e dê **Play** no link do Wokwi (`https://wokwi.com/projects/478106752109243393`):
```bash
cd dashboard
pip install -r requirements.txt
python app.py
# Dashboard Ao Vivo: http://127.0.0.1:8050
# API Status JSON:   http://127.0.0.1:8050/api/v1/status
# API Vinícolas:     http://127.0.0.1:8050/api/v1/vineyards
```

