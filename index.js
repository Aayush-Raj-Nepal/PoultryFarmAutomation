import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { sendMessage } from "./utils/sparrowSmsHelper.js";

dotenv.config();

// In-memory throttling for SMS (prevent spam)
const smsThrottle = new Map();
const SMS_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "poultry-secret";

// Middleware
app.use(cors());
app.use(express.json({ limit: "128kb" }));

// --- Helpers & Utilities ---

async function getSettings() {
  const { rows } = await pool.query("SELECT key, value FROM settings");
  const settings = {};
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });
  return settings;
}

function parseIncomingPayload(body) {
  let payload = body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      /* ignore */
    }
  }

  let deviceId = "poultry-node-01";
  let cycle = null;
  let samples = [];

  if (Array.isArray(payload)) {
    samples = payload;
  } else if (payload && typeof payload === "object") {
    deviceId = payload.deviceId || "poultry-node-01";
    cycle = payload.cycle ?? null;
    samples = payload.samples || [];
  }

  return { deviceId, cycle, samples };
}

function calculateComfortScore(sample, thresholds) {
  let score = 100;
  const t = Number(sample.temperature_c ?? 25);
  const h = Number(sample.humidity_pct ?? 60);
  const c = Number(sample.co2_ppm ?? 800);
  const l = Number(sample.light_lux ?? 50);

  if (t < thresholds.temp_min || t > thresholds.temp_max) score -= 15;
  if (t < thresholds.temp_min - 2 || t > thresholds.temp_max + 3) score -= 15;

  if (h < thresholds.humidity_min || h > thresholds.humidity_max) score -= 10;
  if (h < thresholds.humidity_min - 10 || h > thresholds.humidity_max + 10)
    score -= 10;

  if (c > thresholds.co2_max) score -= 20;
  if (c > thresholds.co2_max + 1000) score -= 20;

  if (l < thresholds.light_min) score -= 5;

  return Math.max(0, Math.min(100, score));
}

async function generateAndPersistAlerts(sample, readingId, thresholds) {
  const alerts = [];
  const t = Number(sample.temperature_c);
  const h = Number(sample.humidity_pct);
  const c = Number(sample.co2_ppm);
  const l = Number(sample.light_lux);

  if (t > thresholds.temp_max + 1) {
    alerts.push({
      sensor: "Temperature",
      severity: t > thresholds.temp_max + 5 ? "critical" : "high",
      message: `High temperature: ${t}°C`,
      recommendation: "Increase ventilation and activate cooling systems.",
    });
  } else if (t < thresholds.temp_min - 1) {
    alerts.push({
      sensor: "Temperature",
      severity: "medium",
      message: `Low temperature: ${t}°C`,
      recommendation: "Check heating systems and insulation.",
    });
  }

  if (h > thresholds.humidity_max + 5) {
    alerts.push({
      sensor: "Humidity",
      severity: "medium",
      message: `High humidity: ${h}%`,
      recommendation: "Improve airflow and check for leaks.",
    });
  }

  if (c > thresholds.co2_max) {
    alerts.push({
      sensor: "CO2",
      severity: c > thresholds.co2_max + 1000 ? "critical" : "high",
      message: `CO2 level high: ${c}ppm`,
      recommendation:
        "Emergency ventilation required. Check for gas leaks or congestion.",
    });
  }

  const n = Number(sample.nh3_ppm || 0);
  if (n > (thresholds.nh3_max || 25)) {
    alerts.push({
      sensor: "Ammonia",
      severity: n > (thresholds.nh3_max || 25) + 20 ? "critical" : "high",
      message: `Ammonia level high: ${n}ppm`,
      recommendation: "Increase ventilation and check litter conditions.",
    });
  }

  if (l > thresholds.light_max) {
    alerts.push({
      sensor: "Light",
      severity: "high",
      message: `Light level very high: ${l} lux`,
      recommendation: "Consider shading or reducing artificial light.",
    });
  } else if (l < thresholds.light_min) {
    alerts.push({
      sensor: "Light",
      severity: "medium",
      message: `Light level too low: ${l} lux`,
      recommendation: "Check lighting systems or open windows.",
    });
  }

  // Persist to DB
  for (const alert of alerts) {
    await pool.query(
      `INSERT INTO alerts (sensor, severity, message, recommendation, reading_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        alert.sensor,
        alert.severity,
        alert.message,
        alert.recommendation,
        readingId,
      ],
    );

    // Send SMS for out-of-range alerts with throttling
    if (process.env.ENABLE_SMS === "true") {
      const now = Date.now();
      const lastSent = smsThrottle.get(alert.sensor) || 0;

      if (now - lastSent > SMS_THROTTLE_MS) {
        const phone = process.env.ALERT_PHONE_NUMBER;
        if (phone) {
          const smsText = `POULTRY ALERT: ${alert.sensor} out of range! ${alert.message}. Recommendation: ${alert.recommendation}`;
          sendMessage(phone, smsText)
            .then(() => {
              smsThrottle.set(alert.sensor, now);
              console.log(`[SMS] Sent alert for ${alert.sensor} to ${phone}`);
            })
            .catch((e) => {
              console.error(
                `[SMS ERROR] Failed to send for ${alert.sensor}:`,
                e.message,
              );
            });
        }
      }
    }
  }

  return alerts;
}

// --- Auth Middleware ---

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// --- Routes ---

app.get("/", (req, res) => {
  res.json({
    message: "Poultry Farm Smart IoT API",
    version: "2.0.0",
    status: "online",
  });
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ id: username, role: "admin" }, JWT_SECRET, {
      expiresIn: "12h",
    });
    return res.json({ token, username });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Settings Endpoints
app.get("/api/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    await pool.query(
      "INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
      [key, value],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Ingest Reading
app.post("/ingest", async (req, res) => {
  try {
    const { deviceId, cycle, samples } = parseIncomingPayload(req.body);
    if (!samples.length) return res.status(400).json({ error: "No samples" });

    const settings = await getSettings();
    const thresholds = settings.thresholds || {};

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const { rows } = await client.query(
          `INSERT INTO readings (device_uid, cycle_no, sample_index, temperature_c, humidity_pct, mq_air_raw, light_lux, co2_ppm, nh3_ppm, weight_kg)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            deviceId,
            cycle,
            s.i ?? i,
            s.t,
            s.h,
            s.a,
            s.l,
            s.c,
            s.n ?? s.nh3_ppm ?? s.a, // Map raw MQ sensor to Ammonia if no specific NH3 ppm is provided
            s.w,
          ],
        );
        // Map raw MQ sensor to Ammonia if no specific NH3 ppm is provided
        if (s.n === undefined && s.nh3_ppm === undefined) {
          s.nh3_ppm = s.a;
        }

        const readingId = rows[0].id;

        // Smart Analytics: Generate and Persist Alerts
        await generateAndPersistAlerts(s, readingId, thresholds);
      }
      await client.query("COMMIT");
      res.json({ ok: true, count: samples.length });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("INGEST ERROR:", err);
    res.status(500).json({ error: "Ingest failed" });
  }
});

// Readings API
app.get("/api/readings/latest", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM readings ORDER BY recorded_at DESC LIMIT 1",
    );
    if (!rows[0]) return res.json(null);

    const settings = await getSettings();
    const latest = rows[0];
    res.json({
      ...latest,
      comfort_score: calculateComfortScore(latest, settings.thresholds),
      farm_info: settings.farm_info,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest" });
  }
});

app.get("/api/readings", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 1000);
  const hours = Number(req.query.hours || 24);

  try {
    const { rows } = await pool.query(
      "SELECT * FROM readings WHERE recorded_at >= NOW() - INTERVAL '1 hour' * $1 ORDER BY recorded_at DESC LIMIT $2",
      [hours, limit],
    );
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

// Alerts API
app.get("/api/alerts", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM alerts ORDER BY recorded_at DESC LIMIT 50",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/alerts/:id/acknowledge", authenticateAdmin, async (req, res) => {
  try {
    await pool.query(
      "UPDATE alerts SET status = 'acknowledged', acknowledged_at = NOW() WHERE id = $1",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/alerts/:id/resolve", authenticateAdmin, async (req, res) => {
  try {
    await pool.query(
      "UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Health & System Status
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await pool.query("SELECT NOW()");
    const latestReading = await pool.query(
      "SELECT recorded_at FROM readings ORDER BY recorded_at DESC LIMIT 1",
    );

    res.json({
      status: "healthy",
      uptime: process.uptime(),
      database: "connected",
      latest_ingest: latestReading.rows[0]?.recorded_at || null,
      environment: process.env.NODE_ENV || "development",
    });
  } catch (err) {
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
});

app.get("/api/device/status", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        recorded_at as last_seen,
        device_uid,
        NOW() - recorded_at as idle_duration
      FROM readings
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    const settings = await getSettings();
    const staleTimeoutSub =
      (settings.thresholds?.stale_timeout_min || 15) * 60 * 1000;

    const data = rows[0] || { last_seen: null };
    const isOnline =
      data.last_seen && new Date() - new Date(data.last_seen) < staleTimeoutSub;

    res.json({
      deviceId: data.device_uid || "unknown",
      status: isOnline ? "online" : "offline",
      lastSeen: data.last_seen,
      idleDuration: data.idle_duration,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Analytics Summary & Prediction
app.get("/api/analytics/summary", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int as total_readings,
        ROUND(AVG(temperature_c)::numeric, 2)::float as avg_temp,
        ROUND(AVG(humidity_pct)::numeric, 2)::float as avg_humidity,
        ROUND(AVG(co2_ppm)::numeric, 2)::float as avg_co2,
        MAX(temperature_c)::float as max_temp,
        MIN(temperature_c)::float as min_temp,
        (SELECT COUNT(*)::int FROM alerts WHERE recorded_at >= NOW() - INTERVAL '24 hours') as alerts_24h
      FROM readings
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
    `);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

app.get("/api/analytics/prediction", async (req, res) => {
  try {
    // Basic linear regression on CO2 for the last 2 hours
    const { rows } = await pool.query(
      "SELECT co2_ppm, recorded_at FROM readings WHERE recorded_at >= NOW() - INTERVAL '2 hours' ORDER BY recorded_at ASC",
    );

    if (rows.length < 5) {
      return res.json({
        predicted_co2_30min: "--",
        trend_slope: 0,
        status: "Analyzing",
        recommendation: "Gathering more data for precise prediction...",
      });
    }

    // Simple slope calculation: (y2-y1)/(x2-x1)
    const first = rows[0];
    const last = rows[rows.length - 1];
    const dx =
      (new Date(last.recorded_at) - new Date(first.recorded_at)) / (1000 * 60); // minutes
    const dy = last.co2_ppm - first.co2_ppm;
    const slope = dy / dx; // ppm per minute

    const predicted = Math.round(last.co2_ppm + slope * 30);
    let status = "Stable";
    let recommendation =
      "Environment is stable. No immediate adjustment needed.";

    if (slope > 5) {
      status = "Rising Fast";
      recommendation =
        "CO2 levels are rising rapidly. Suggest increasing ventilation duty cycle.";
    } else if (slope < -5) {
      status = "Falling Fast";
      recommendation = "Levels are stabilizing. Continue current monitoring.";
    }

    res.json({
      predicted_co2_30min: predicted,
      trend_slope: parseFloat(slope.toFixed(2)),
      status,
      recommendation,
    });
  } catch (err) {
    res.status(500).json({ error: "Prediction failed" });
  }
});

// Demo Data Seeder
app.post("/api/admin/seed-demo-data", authenticateAdmin, async (req, res) => {
  try {
    const points = 100;
    const now = new Date();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 15 * 60 * 1000); // every 15 mins
        const temp = 25 + Math.random() * 5;
        const hum = 60 + Math.random() * 10;
        const co2 = 600 + Math.random() * 1000;
        const weight = 2.5 + (points - i) * 0.01;

        await client.query(
          `INSERT INTO readings (device_uid, recorded_at, temperature_c, humidity_pct, co2_ppm, weight_kg, light_lux)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ["demo-device", time, temp, hum, co2, weight, 50],
        );
      }
      await client.query("COMMIT");
      res.json({ message: "Seeded 100 points" });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to seed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Poultry Pro Backend listening on ${PORT}`);
});
