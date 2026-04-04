# 🐔 GJ_Poultry

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)  
[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)](#)  
[![Issues](https://img.shields.io/github/issues/dudeabide21/GJ_Poultry)](https://github.com/dudeabide21/GJ_Poultry/issues)  

## 📘 Project Overview  
**GJ_Poultry** is an open-source IoT-based poultry monitoring system designed to track and visualize key environmental parameters in a chicken coop.  
It integrates **low-cost sensors** (temperature, humidity, gas, and camera modules) with a **microcontroller** and **web app** to continuously collect and analyze data.  

By maintaining optimal coop conditions, the system helps:
- Reduce **mortality** and **growth delays**
- Improve **feed efficiency**
- Enable **data-driven farm management**

The project aligns with precision livestock farming principles — leveraging **IoT, control systems, and physics-based modeling** to enhance animal welfare and productivity.

---

## 🧰 Hardware Components and Sensor Layout  

| Component | Description | Function |
|------------|--------------|-----------|
| **ESP8266/NodeMCU** | 32-bit Wi-Fi-enabled microcontroller | Main controller; collects and transmits data |
| **DHT22** | Digital Temperature & Humidity Sensor | Measures ambient conditions |
| **MQ-135** | Gas Sensor | Detects NH₃, CO₂, and air pollutants |
| **DS18B20** | Waterproof Temperature Probe | Measures localized/ground temperature |
| **ESP32-CAM** | Optional Camera Module | Captures coop visuals |
| **Buzzer/LEDs** | Output indicators | Alerts for abnormal conditions |
| **Power Supply (5 V)** | — | Feeds system components |

Typical wiring setup:
DHT22 → Digital pin 3
MQ135 → A0
DS18B20 → Digital pin 2
Buzzer → Digital pin 4
Wi-Fi → ESP8266 built-in

---

## ⚙️ Firmware Structure and Deployment  

The firmware is written in **Arduino (C/C++)**.

### 🔧 Setup Procedure
1. **Install Arduino IDE** and libraries:  
   - `Adafruit DHT`  
   - `OneWire`  
   - `DallasTemperature`  
2. **Configure pins & Wi-Fi credentials** in `GJ_Poultry.ino`.  
3. **Upload code** to ESP8266 or ESP32 board.  
4. **Monitor serial output** (baud rate: `115200`).  

### 🧩 Example Code Snippet
```cpp
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define DHTPIN 3
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18(&oneWire);

const int MQ135_PIN = A0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  ds18.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temp1 = dht.readTemperature();
  ds18.requestTemperatures();
  float temp2 = ds18.getTempCByIndex(0);
  int mqRaw = analogRead(MQ135_PIN);
  float co2ppm = (mqRaw - 33.0) * (1000.0 / (4095.0 - 33.0));

  Serial.printf("Temp1=%.2fC Temp2=%.2fC Humidity=%.1f%% CO2=%.1fppm\n",
                 temp1, temp2, humidity, co2ppm);
  delay(5000);
}
```

---

### 🌐 Web App Setup
Web Dashboard Options:
  - Blynk IoT App
  - Add widgets for gauges and plots.
  - Link virtual pins to ESP8266.
  -View real-time updates on mobile.

## Custom Web App (Python/Node.js)
Run locally:

```
$ pip install -r requirements.txt
$ python server.py
# or
$ npm install && npm start
Visit: http://localhost:5000
```

---


### Features:
  -Real-time sensor charts
  -Alerts for threshold breaches
  -CSV data export

Dashboard with adjustable time ranges

## 📊 CSV Data Format
  Collected data are stored in /src/data.csv as:

```csv
timestamp,temperature_C,humidity_%,co2_ppm
2025-11-01 06:00:00,24.2,45.7,350
2025-11-01 06:05:00,24.5,46.0,355
2025-11-01 06:10:00,24.3,45.5,348
Data Fields
Column	Unit	Description
timestamp	ISO time	Reading time
temperature_C	°C	DHT22 / DS18B20 temperature
humidity_%	%RH	Ambient humidity
co2_ppm	ppm	MQ-135 gas reading
```

---


### 📈 Visualization and Analytics

  - Time-Series Graphs: Temperature, humidity, and gas concentration over time.
  - Threshold Bands: Safe/unsafe zones highlighted on charts.
  - Historical Comparison: Weekly or daily parameter trends.
  - KPI Overlay: Mortality, productivity, and feed efficiency vs. environment.

## Example Python visualization:

```python
import pandas as pd
import matplotlib.pyplot as plt

data = pd.read_csv('data.csv', parse_dates=['timestamp'])
plt.plot(data['timestamp'], data['temperature_C'], label='Temp (°C)')
plt.plot(data['timestamp'], data['humidity_%'], label='Humidity (%)')
plt.xlabel('Time'); plt.ylabel('Value')
plt.legend(); plt.show()
```

---


## 📏 Measurable Outcomes / KPIs

| Metric | Formula | Description |
|:-------|:---------|:-------------|
| **Environmental Compliance** | % of time within safe range | Stability indicator |
| **CO₂/NH₃ Levels** | Average and peak ppm | Air quality indicator |
| **Mortality Rate (CMR)** | `CMR = (D / N) × 100%` | Health performance |
| **Egg Production Rate (EPR)** | `EPR = E / C` | Productivity |
| **Sensor Uptime** | Logged readings / total attempts | Data integrity |
| **Energy Efficiency** | Energy / Airflow | HVAC efficiency |

**🎯 Target:**  
Maintain **>95% uptime**, **CO₂ < 1000 ppm**, and **temperature between 18–24 °C** for optimal flock health.

---

## 🧪 Research Alignment

This system contributes to **smart poultry research** by:

- Demonstrating IoT integration with real-time environmental feedback  
- Applying open-source, low-cost hardware for small farms  
- Supporting data analytics for mortality reduction and performance optimization  

**Supporting Studies:**
- *Syafar et al.* – IoT-based poultry coop monitoring with DHT22 and MQ-135  
- *Phiri et al.* – Arduino-ZigBee-GSM smart farming model  
- *Liu et al., 2024* – Integrated environmental & performance dashboards for smart poultry houses  

---

## ⚛️ Physics and Engineering Foundations

### 🔥 Heat Transfer
Maintaining coop temperature uses the **convective heat transfer equation**:

```text
Q = m_dot * c_p * ΔT
```

Where:

m_dot = mass flow rate of air (kg/s)

c_p = specific heat capacity of air (kJ/kg·K)

ΔT = temperature difference (°C)

💨 Gas Law Relation
For MQ-135 readings, gas concentration depends on the ideal gas law:

``` text
p * V = n * R * T
```

Where:

p = pressure (Pa)

V = volume (m³)

n = number of moles

R = universal gas constant (8.314 J/mol·K)

T = temperature (K)

💧 Humidity Sensing
The DHT22 measures relative humidity (RH) using a capacitive sensor:

```text
C = ε * A / d
```

Where:

C = capacitance (F)

ε = permittivity of the dielectric

A = area of the capacitor plates

d = distance between plates

🌡️ Comfort Index (Enthalpy Approximation)

```text
h = 1.006*T + RH * (2501 + 1.86*T)
```

Where:

T = temperature in °C

RH = relative humidity (fraction)

h = enthalpy (kJ/kg)

📈 Production Equations
```python
Copy code
# Mortality Rate
CMR = (D / N) * 100  # D = number of deaths, N = initial population

# Egg Production Rate
EPR = E / C           # E = eggs produced, C = number of chickens
```
---

## 💾 Data and Code Examples

**Data Flow:**  

```text
Arduino → CSV → Web App → Visualization
Sensors → ESP8266 via GPIO/ADC
Data → Logged as data.csv
Web App → Displays charts (real-time & historical)
Analysis → Performed using Python/Pandas
```

---


## 🧠 Key Outcomes

- Improved environmental control via sensor feedback  
- Enhanced animal welfare  
- Scalable and reproducible open-source design  
- Potential to reduce mortality by **10–15%** through environmental optimization  

---

## 📚 References

- **Syafar et al.** – IoT-based poultry coop monitoring with DHT22 and MQ-135  
- **Phiri et al.** – Arduino-ZigBee-GSM smart farming model  
- **Liu et al., 2024** – Integrated environmental & performance dashboards for smart poultry houses  

---

## 🚀 Future Scope

- Integrate **PID-based temperature control** (using fans/heaters)  
- Add **cloud synchronization** (Firebase/MQTT)  
- Implement **predictive analytics** using Machine Learning models  

---

## Dashboard AI Integration

The active web server for this repository is the Node/Express app in
`software/PoultryFarmAutomation/index.js`. It now supports a Python AI bridge
using `AI/farm/ai_analytics/api_wrapper.py`, which reads recent poultry sensor
data from PostgreSQL and returns JSON for the frontend dashboard.

### Python setup for AI analytics

```bash
cd software/PoultryFarmAutomation/AI/farm
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment variables

- `DATABASE_URL`: shared PostgreSQL connection string for Node and Python
- `AI_PYTHON_BIN`: optional Python executable override, default `python3`
- `AI_ANALYTICS_CACHE_TTL_MS`: optional response cache TTL in milliseconds
- `AI_DATA_SOURCE`: optional `auto`, `db`, or `csv`
- `LOCAL_SENSOR_CSV`: optional fallback CSV path for offline analytics

### Available dashboard analytics endpoints

- `GET /api/analytics/summary`
- `GET /api/analytics/anomalies?hours=24`
- `GET /api/analytics/forecast?horizon=30`
- `GET /api/analytics/risk`

`GET /api/analytics/prediction` is kept as a compatibility alias for the
existing dashboard card, but new integrations should use the forecast, risk,
and anomalies endpoints directly.

---

## 🏁 License

This project is released under the **MIT License**.  
Feel free to use, modify, and extend it for **research and educational purposes**.

