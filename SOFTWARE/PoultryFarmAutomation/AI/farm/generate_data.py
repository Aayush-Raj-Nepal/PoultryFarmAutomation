"""
Synthetic Environment Dataset Generator
Simulates realistic poultry farm sensor readings for:
  - DHT22: temperature (±0.5°C), humidity (±2–5% RH)
  - MH-Z19: CO2 (±50 ppm)
  - MQ-137: ammonia (±1 ppm, calibration-dependent)

Generates 7 days of 1-minute interval readings (~10080 samples).
Includes realistic diurnal patterns, ventilation cycles, and measurement noise.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(2024)

N = 10080          # 7 days × 1440 min
start = datetime(2024, 1, 15, 0, 0, 0)
timestamps = [start + timedelta(minutes=i) for i in range(N)]
hours = np.array([t.hour + t.minute / 60 for t in timestamps])

# --- Diurnal base curves ---
# Temperature: cooler at night (18–20°C), warmer midday (24–27°C)
temp_base = 23.0 + 3.5 * np.sin(2 * np.pi * (hours - 6) / 24)

# Humidity: inverse of temperature (higher at night ~65%, lower midday ~55%)
hum_base = 60.0 - 6.0 * np.sin(2 * np.pi * (hours - 6) / 24)

# CO2: rises when birds are active / feeding (peaks ~9:00 and ~17:00)
co2_base = (600
    + 120 * np.exp(-0.5 * ((hours - 9) / 2) ** 2)
    + 100 * np.exp(-0.5 * ((hours - 17) / 2) ** 2))

# Ammonia: slow daily accumulation, drops after ventilation (~06:00)
day_fraction = (hours % 24) / 24
ammonia_base = 4.0 + 4.0 * day_fraction - 4.0 * (hours % 24 < 6).astype(float)
ammonia_base = np.clip(ammonia_base, 1.0, 12.0)

# --- Sensor noise (manufacturer specs) ---
temp = temp_base + np.random.normal(0, 0.4, N)        # DHT22 ±0.5°C
hum  = hum_base  + np.random.normal(0, 1.5, N)        # DHT22 ±2% RH
co2  = co2_base  + np.random.normal(0, 25, N)          # MH-Z19 ±50 ppm
amm  = ammonia_base + np.random.normal(0, 0.5, N)      # MQ-137 ~±1 ppm

# --- Clip to physically plausible ranges ---
temp = np.clip(temp, 12, 40)
hum  = np.clip(hum,  20, 95)
co2  = np.clip(co2,  380, 2500)
amm  = np.clip(amm,  0,   40)

df = pd.DataFrame({
    'timestamp': timestamps,
    'temperature': np.round(temp, 2),
    'humidity':    np.round(hum,  2),
    'co2':         np.round(co2,  1),
    'ammonia':     np.round(amm,  2),
})

df.to_csv('DATA/environment_dataset.csv', index=False)
print(f"Generated {N} samples → DATA/environment_dataset.csv")
print(df.describe().round(2))
