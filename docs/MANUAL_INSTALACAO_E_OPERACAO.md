# 🛠️ Manual Completo de Instalação e Operação (Hardware & Software)

Este documento detalha o procedimento passo a passo para montagem física em laboratório (Hands-on), simulação no **Wokwi**, configuração do back-end **FIWARE** e operação do **Dashboard Dinâmico Web**.

---

## 1. Manual de Hardware (ESP32 + Sensores + Atuadores)

### 1.1 Lista de Componentes (BOM)
| Qtd | Componente | Especificação / Função |
| :-: | :--- | :--- |
| 1 | **ESP32 DevKit V1** | Microcontrolador Wi-Fi Dual-Core (30 ou 38 pinos) |
| 1 | **Sensor DHT-11** *(ou DHT-22 no Wokwi)* | Medição de Temperatura (°C) e Umidade Relativa (%) |
| 1 | **Sensor LDR (Fotoresistor)** | Medição de Luminosidade ambiente da adega (0 a 100%) |
| 1 | **Resistor 10 kΩ** | Divisor de tensão para o LDR (caso não utilize módulo LDR) |
| 1 | **Buzzer (Passivo ou Ativo)** | Emissão de alertas sonoros distintos para cada anomalia |
| 1 | **LED Amarelo + Resistor 220 Ω** | Alerta visual de estado Padrão/Atenção (utiliza o `GPIO 2`) |
| 1 | **Protoboard + Jumpers** | Conexões macho-macho e macho-fêmea |

---

### 1.2 Tabela Oficial de Pinagem (Pinout ESP32)

| Componente | Pino do Componente | Pino no ESP32 | Observação Técnica |
| :--- | :--- | :---: | :--- |
| **DHT-11 / DHT-22** | `VCC` (`+`) | `3V3` | Alimentação 3.3V |
| **DHT-11 / DHT-22** | `DATA` / `SDA` | **`GPIO 15`** (`D15`) | Sinal digital de Temperatura e Umidade |
| **DHT-11 / DHT-22** | `GND` (`-`) | `GND` | Terra comum |
| **Módulo LDR** | `VCC` | `3V3` | Alimentação 3.3V |
| **Módulo LDR** | `AO` (Saída Analógica) | **`GPIO 34`** (`D34`) | Canal `ADC1_CH6` (compatível com Wi-Fi ativo) |
| **Módulo LDR** | `GND` | `GND` | Terra comum |
| **LED Amarelo** | Anodo (`+`) | **`GPIO 2`** (`D2`) | Indicador de Atenção/Padrão (1 desvio nos parâmetros do vinho) |
| **LED Amarelo** | Catodo (`-`) | `GND` | Conectado via resistor de 220 Ω |
| **Buzzer** | Pino Positivo (`+` / `S`) | **`GPIO 4`** (`D4`) | Acionado via `tone()` com frequências por anomalia |
| **Buzzer** | Pino Negativo (`-`) | `GND` | Terra comum |

> [!IMPORTANT]
> **Por que usar o `GPIO 34` para o LDR?** No ESP32, os pinos do conversor `ADC2` entram em conflito quando o rádio Wi-Fi está ligado. O pino `GPIO 34` pertence ao `ADC1`, garantindo leituras analógicas estáveis de luminosidade durante a transmissão MQTT.

---

### 1.3 Como Executar a Simulação no Wokwi (DHT-22 + LDR + Buzzer)
1. Acesse o projeto oficial no Wokwi: **[https://wokwi.com/projects/478106752109243393](https://wokwi.com/projects/478106752109243393)**.
2. Na aba `sketch.ino`, está configurado o código [`sketch.ino`](../sketch.ino) (compilação nativa sem dependência de bibliotecas externas).
3. Na aba `diagram.json`, está configurado o circuito completo [`diagram.json`](../diagram.json).
4. Clique em **Start the Simulation** (ícone Play verde) para iniciar a transmissão em tempo real para o Dashboard.

---

### 1.4 Como Gravar no ESP32 Físico (Hands-on no Laboratório — DHT-11)
1. Abra a **Arduino IDE 2.x** e selecione a placa **DOIT ESP32 DEVKIT V1** (ou **ESP32 Dev Module**).
2. Em *Sketch -> Include Library -> Manage Libraries*, instale:
   - **PubSubClient** (por Nick O'Leary)
   - **DHT sensor library** (por Adafruit) + **Adafruit Unified Sensor**
3. Abra o arquivo [`hardware/handson_dht11/sketch_handson_dht11.ino`](../hardware/handson_dht11/sketch_handson_dht11.ino).
4. Configure o `WIFI_SSID`, `WIFI_PASSWORD` (rede da bancada ou roteador do celular em 2.4 GHz) e o `MQTT_BROKER` (IP do FIWARE).
5. Conecte o ESP32 via cabo USB, selecione a porta `COM` correspondente e clique em **Upload**.
6. Abra o **Serial Monitor** em `115200 baud` para acompanhar os pacotes `[FIWARE PUB] t|...|h|...|l|...` e os comandos `[ALERTA REMOTO]`.

---

## 2. Manual de Software (FIWARE & Dashboard Web)

### 2.1 Pré-Requisitos e Instalação do Dashboard
1. Certifique-se de possuir **Python 3.10+** instalado.
2. No terminal, navegue até a pasta `dashboard/` e instale as dependências listadas no `requirements.txt`:
   ```bash
   cd dashboard
   pip install -r requirements.txt
   ```
3. Para validar os testes automatizados (TDD) da solução:
   ```bash
   pytest tests -v
   ```

### 2.2 Inicialização do Servidor Dashboard
Execute o arquivo principal:
```bash
python app.py
```
O servidor iniciará com *Hot-Reload* ativo no endereço:
👉 **`http://127.0.0.1:8050`**

---

### 2.3 Guia de Operação do Dashboard no Hands-on
1. **Conexão FIWARE**: No topo do painel, informe o **Host / IP do FIWARE** (ex.: `20.206.204.100` ou `localhost`), o **Entity ID** (`urn:ngsi-ld:Vine:001`) e a quantidade de amostras históricas (`lastN`).
2. **Cadastro de IoT Devices (Porta 4041)**:
   - No cartão **Cadastro e Gerenciamento de IoT Devices**, preencha o `Device ID` (`vine001`), `Entity Name` (`urn:ngsi-ld:Vine:001`), `Type` (`Vine`) e `API Key` (`TEF`).
   - Clique em **➕ Cadastrar Device + Subscrição STH-Comet**. O sistema provisionará automaticamente o Service Group, o dispositivo com os atributos `t`, `h`, `l` e o comando remoto `alert`, além de registrar a subscrição histórica na porta `8666` do STH-Comet.
3. **Seleção de Presets de Vinho e Ajuste de Triggers**:
   - Escolha um preset no seletor **Diferencial: Presets Inteligentes por Tipo de Vinho** (*Tinto*, *Branco*, *Espumante* ou *Cave de Envelhecimento*) ou ajuste manualmente os valores **Mín / Máx** de Temperatura, Umidade e Luminosidade.
4. **Verificação de Anomalias e Acionamento Remoto (LED Azul + Buzzer)**:
   - Sempre que qualquer leitura sair da faixa definida nos Triggers, o Front-end envia automaticamente um `PATCH` ao Orion Context Broker (`:1026`), que repassa o comando via MQTT (`/TEF/vine001/cmd`) ao ESP32:
     - **`alert|temp`** → LED Azul piscando + **Buzzer Tipo 1** (Bips agudos rápidos de `2000 Hz`).
     - **`alert|hum`** → LED Azul piscando + **Buzzer Tipo 2** (Pulsos graves de `850 Hz`).
     - **`alert|lum`** → LED Azul piscando + **Buzzer Tipo 3** (Sirene alternada `1200 Hz / 1700 Hz`).
     - **`alert|multi`** → LED Azul piscando rápido + **Buzzer Tipo 4** (Escala tripla `1000 / 1800 / 2500 Hz`).
     - **`alert|normal`** → Quando os parâmetros retornam à faixa ideal, o Front-end envia `alert|normal`, desligando o LED Azul e silenciando o Buzzer imediatamente.
