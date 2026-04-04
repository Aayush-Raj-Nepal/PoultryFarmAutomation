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

ALTER TABLE readings
ADD COLUMN IF NOT EXISTS nh3_ppm NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
ON readings(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_readings_device_time
ON readings(device_uid, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  sensor VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  reading_id BIGINT REFERENCES readings(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_recorded_at
ON alerts(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status
ON alerts(status, recorded_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
