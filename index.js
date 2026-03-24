import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "128kb" }));
app.use(express.text({ type: "*/*", limit: "128kb" }));

function parseIncomingPayload(body) {
  let payload = body;

  if (typeof payload === "string") {
    payload = JSON.parse(payload);
  }

  let deviceId = "poultry-node-01";
  let cycle = null;
  let samples = [];

  if (Array.isArray(payload)) {
    samples = payload;
  } else {
    deviceId = payload.deviceId || "poultry-node-01";
    cycle = payload.cycle ?? null;
    samples = payload.samples || [];
  }

  if (!Array.isArray(samples)) {
    throw new Error("Invalid payload format");
  }

  return { deviceId, cycle, samples };
}

function comfortScore(sample) {
  let score = 100;

  const t = Number(sample.temperature_c ?? 0);
  const h = Number(sample.humidity_pct ?? 0);
  const c = Number(sample.co2_ppm ?? 0);
  const l = Number(sample.light_lux ?? 0);

  if (t < 24 || t > 32) score -= 20;
  if (t < 22 || t > 35) score -= 10;

  if (h < 50 || h > 75) score -= 15;
  if (h < 45 || h > 85) score -= 10;

  if (c > 1500) score -= 20;
  if (c > 2500) score -= 20;

  if (l < 5) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function generateAlerts(sample) {
  const alerts = [];

  if (sample.temperature_c > 33) {
    alerts.push({
      sensor: "Temperature",
      severity: "high",
      message: "Heat stress risk",
      recommendation: "Increase ventilation and cooling",
    });
  }

  if (sample.temperature_c < 22) {
    alerts.push({
      sensor: "Temperature",
      severity: "medium",
      message: "Low temperature detected",
      recommendation: "Check heating setup",
    });
  }

  if (sample.humidity_pct > 80) {
    alerts.push({
      sensor: "Humidity",
      severity: "medium",
      message: "High humidity",
      recommendation: "Improve airflow and reduce moisture",
    });
  }

  if (sample.co2_ppm > 2000) {
    alerts.push({
      sensor: "CO2",
      severity: "high",
      message: "CO2 above safe threshold",
      recommendation: "Ventilation required immediately",
    });
  }

  if (sample.light_lux < 1) {
    alerts.push({
      sensor: "Light",
      severity: "low",
      message: "Low light / possible lighting issue",
      recommendation: "Inspect lighting system",
    });
  }

  return alerts;
}

function zScoreAnomalies(rows, key, threshold = 2.2) {
  const values = rows
    .map((r) => Number(r[key]))
    .filter((v) => !Number.isNaN(v));

  if (values.length < 5) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 1;

  return rows
    .map((r) => {
      const value = Number(r[key]);
      const z = (value - mean) / std;
      return {
        ...r,
        metric: key,
        zscore: Number(z.toFixed(2)),
        isAnomaly: Math.abs(z) >= threshold,
      };
    })
    .filter((r) => r.isAnomaly);
}

app.get("/", (req, res) => {
  res.status(200).send("OK: Poultry backend running");
});

app.post("/ingest", async (req, res) => {
  try {
    const { deviceId, cycle, samples } = parseIncomingPayload(req.body);

    if (!samples.length) {
      return res.status(400).json({ error: "No samples found" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];

        await client.query(
          `
          INSERT INTO readings (
            device_uid,
            recorded_at,
            cycle_no,
            sample_index,
            temperature_c,
            humidity_pct,
            mq_air_raw,
            light_lux,
            co2_ppm,
            weight_kg
          )
          VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            deviceId,
            cycle,
            s.i ?? i,
            s.t ?? null,
            s.h ?? null,
            s.a ?? null,
            s.l ?? null,
            s.c ?? null,
            s.w ?? null,
          ],
        );
      }

      await client.query("COMMIT");

      res.status(200).json({
        ok: true,
        inserted: samples.length,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("INGEST ERROR:", err);
    res.status(500).json({ error: "Failed to ingest data" });
  }
});

app.get("/api/readings/latest", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM readings
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    const latest = rows[0] || null;

    if (!latest) {
      return res.json(null);
    }

    res.json({
      ...latest,
      comfort_score: comfortScore(latest),
      alerts: generateAlerts(latest),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest reading" });
  }
});

app.get("/api/readings", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 300);

    const { rows } = await pool.query(
      `
      SELECT *
      FROM readings
      ORDER BY recorded_at DESC
      LIMIT $1
      `,
      [limit],
    );

    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

app.get("/api/analytics/summary", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        ROUND(AVG(temperature_c)::numeric, 2) AS avg_temp,
        ROUND(AVG(humidity_pct)::numeric, 2) AS avg_humidity,
        ROUND(AVG(light_lux)::numeric, 2) AS avg_light,
        ROUND(AVG(co2_ppm)::numeric, 2) AS avg_co2,
        ROUND(AVG(weight_kg)::numeric, 2) AS avg_weight,
        MAX(co2_ppm) AS max_co2,
        MIN(weight_kg) AS min_weight,
        MAX(recorded_at) AS last_update
      FROM readings
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
    `);

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

app.get("/api/analytics/anomalies", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM readings
      WHERE recorded_at >= NOW() - INTERVAL '48 hours'
      ORDER BY recorded_at ASC
    `);

    const anomalies = [
      ...zScoreAnomalies(rows, "temperature_c"),
      ...zScoreAnomalies(rows, "humidity_pct"),
      ...zScoreAnomalies(rows, "co2_ppm"),
      ...zScoreAnomalies(rows, "light_lux"),
    ];

    anomalies.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anomalies" });
  }
});

app.get("/api/analytics/alerts", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM readings
      ORDER BY recorded_at DESC
      LIMIT 50
    `);

    const alerts = rows.flatMap((r) =>
      generateAlerts(r).map((a) => ({
        ...a,
        recorded_at: r.recorded_at,
        value: {
          temperature_c: r.temperature_c,
          humidity_pct: r.humidity_pct,
          co2_ppm: r.co2_ppm,
          light_lux: r.light_lux,
          weight_kg: r.weight_kg,
        },
      })),
    );

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

app.get("/api/analytics/prediction", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM readings
      ORDER BY recorded_at DESC
      LIMIT 20
    `);

    const ordered = rows.reverse();
    const co2Series = ordered.map((r, i) => ({
      x: i,
      y: Number(r.co2_ppm || 0),
    }));

    if (co2Series.length < 2) {
      return res.json({ message: "Not enough data" });
    }

    const n = co2Series.length;
    const sumX = co2Series.reduce((s, p) => s + p.x, 0);
    const sumY = co2Series.reduce((s, p) => s + p.y, 0);
    const sumXY = co2Series.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = co2Series.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const nextX = n + 2;
    const predictedCo2 = Math.round(intercept + slope * nextX);

    let status = "stable";
    if (predictedCo2 > 1800) status = "warning";
    if (predictedCo2 > 2200) status = "critical";

    res.json({
      predicted_co2_30min: predictedCo2,
      trend_slope: Number(slope.toFixed(2)),
      status,
      recommendation:
        predictedCo2 > 2000
          ? "CO2 likely to exceed comfort threshold. Improve ventilation."
          : "CO2 trend is currently acceptable.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch prediction" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on ${port}`);
});
