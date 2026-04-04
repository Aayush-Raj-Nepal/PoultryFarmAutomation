CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_uid VARCHAR(100) NOT NULL DEFAULT 'poultry-node-01',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_no INTEGER,
  sample_index INTEGER,
  temperature_c NUMERIC(6,2),
  humidity_pct NUMERIC(6,2),
  mq_air_raw INTEGER,
  light_lux NUMERIC(10,2),
  co2_ppm INTEGER,
  weight_kg NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
ON readings(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_readings_device_time
ON readings(device_uid, recorded_at DESC);