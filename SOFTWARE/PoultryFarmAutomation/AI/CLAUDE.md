# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GJ_Poultry is an IoT-based poultry monitoring system with:
- **Firmware**: ESP8266/NodeMCU Arduino code for sensor data acquisition (temperature, humidity, CO2, ammonia, weight)
- **Web Dashboard**: Next.js application for real-time visualization and data management
- **AI Analytics**: Python modules for anomaly detection, forecasting, and risk scoring

## Build Commands

### Firmware (PlatformIO)
```bash
# Build firmware
pio run

# Build and upload to device
pio run -t upload

# Monitor serial output
pio device monitor
```

Board configuration: `nodemcuv2` (ESP8266), framework: `arduino`, monitor speed: `115200`

### Web Dashboard (Next.js)
```bash
cd web_app
npm install          # Install dependencies
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # Linting
```

### AI Analytics (Python)
```bash
cd src/Farm
# Run notebooks in Jupyter, or:
python ai_analytics/run_pipeline.py                    # Run full pipeline
python ai_analytics/run_pipeline.py <data_path> <output_dir>
```

## Project Structure

```
GJ_Poultry/
├── platformio.ini              # PlatformIO configuration
├── web_app/                    # Next.js dashboard application
│   ├── app/                    # Next.js app router pages
│   ├── components/             # React components
│   ├── lib/                    # Database/utils (Supabase, PostgreSQL)
│   └── package.json
├── src/
│   ├── Farm/
│   │   ├── Farm_Weights/       # Weight measurement firmware (.ino)
│   │   ├── Farm_Sensors/       # Sensor firmware with Blynk + HTTPS
│   │   ├── DATA/               # CSV datasets and analysis outputs
│   │   ├── ai_analytics/       # AI modules (anomaly, forecast, risk)
│   │   └── CLAUDE.md           # Detailed AI analytics guidance
│   └── Hatchery/               # Hatchery-specific firmware
└── .pio/                       # PlatformIO build artifacts
```

## Hardware Configuration

Sensors connected to ESP8266/NodeMCU:
- DHT22 → Digital pin 3 (temperature/humidity)
- MQ-135/MH-Z19 → A0/D2 (CO2/gas)
- DS18B20 → Digital pin 2 (temperature)
- HX711 + Load cell → D2/D3 (weight)
- VEML6030 → I2C (ambient light)

## Data Flow

1. **Firmware** reads sensors → sends to Blynk cloud + HTTPS POST to backend
2. **Backend** (Vercel/Supabase) stores data → provides API endpoints
3. **Web Dashboard** displays real-time charts and historical data
4. **AI Analytics** processes CSV exports → generates reports and predictions

## AI Analytics Context

For detailed guidance on the AI analytics work (anomaly detection, forecasting, risk scoring), see `src/Farm/CLAUDE.md`. Key points:
- The project is a **monitoring platform** with threshold-based alerting
- AI features are **extension layers**: anomaly detection, forecasting, risk scoring, state clustering
- Do not overclaim disease prediction, mortality prediction, or feed optimization without appropriate labeled data
- Validation metrics are available in `src/Farm/DATA/analysis_outputs/`

## Key Files

- `src/Farm/Farm_Sensors/LiveServer/LiveServer.ino` - Main sensor firmware
- `web_app/lib/supabase.js` - Database connection
- `web_app/app/(pages)/farm/page.jsx` - Dashboard home
- `src/Farm/ai_analytics/run_pipeline.py` - AI pipeline entry point