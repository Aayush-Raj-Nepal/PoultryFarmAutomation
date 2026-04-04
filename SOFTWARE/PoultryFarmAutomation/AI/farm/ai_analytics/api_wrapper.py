"""
API Wrapper for AI Analytics — Dashboard Integration Layer

Queries PostgreSQL for recent sensor data and returns AI analytics as JSON.
Designed to be called as a child process from the Node.js backend.

Usage:
    python api_wrapper.py anomalies --hours 24
    python api_wrapper.py forecast --horizon 30
    python api_wrapper.py risk
    python api_wrapper.py summary

BUG FIXES (vs qwen3.5 original):
  [A1] get_risk_score() called scorer.compute_risk_scores() — method is compute_risk_score().
  [A2] get_forecast() called forecaster.predict_single_sensor() — method does not exist.
       Replaced with forecaster.predict(df)[sensor] and inline trend/metrics logic.
  [A3] df.fillna(method='ffill') raises FutureWarning in pandas >=2.1; replaced with
       df.ffill().bfill().
  [A4] Ensemble score comparison used `scores[idx] > 0.7` where scores may be None
       (hard-voting path). Added None guard.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta, timezone
import warnings

warnings.filterwarnings("ignore")

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    _HAS_PSYCOPG2 = True
except ImportError:
    _HAS_PSYCOPG2 = False

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from anomaly_detection import AnomalyDetector
from forecasting import MultiSensorForecaster
from risk_scoring import RiskScorer


SENSOR_COLS = ["temperature", "humidity", "co2", "ammonia"]
SAFE_RANGES = {
    "temperature": (18, 32),
    "humidity": (40, 75),
    "co2": (400, 1500),
    "ammonia": (0, 25),
}


# ── Database ───────────────────────────────────────────────────────────────────


def get_db_connection():
    if not _HAS_PSYCOPG2:
        raise RuntimeError("psycopg2 not installed. Run: pip install psycopg2-binary")
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        database=os.environ.get("DB_NAME", "poultry"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", ""),
    )


def get_csv_path():
    default_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "DATA", "environment_dataset.csv"
    )
    return os.environ.get("LOCAL_SENSOR_CSV", os.path.abspath(default_path))


def get_data_source_preference():
    return os.environ.get("AI_DATA_SOURCE", "auto").strip().lower()


def fetch_recent_readings(hours=24, limit=1500):
    source_preference = get_data_source_preference()
    if source_preference in ("auto", "db", "database"):
        df = _fetch_recent_readings_from_db(hours=hours, limit=limit)
        if not df.empty:
            df.attrs["data_source"] = "postgresql"
            return df
        if source_preference in ("db", "database"):
            return df

    df = _fetch_recent_readings_from_csv(limit=limit)
    if not df.empty:
        df.attrs["data_source"] = "csv"
    return df


def _fetch_recent_readings_from_csv(limit=1500):
    csv_path = get_csv_path()
    try:
        df = pd.read_csv(csv_path)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp").tail(limit)
        df = df.ffill().bfill()
        return df[["timestamp", "temperature", "humidity", "co2", "ammonia"]]
    except Exception as e:
        print(json.dumps({"error": f"CSV read error: {e}"}), file=sys.stderr)
        return pd.DataFrame()


def _fetch_recent_readings_from_db(hours=24, limit=1500):
    """
    Fetch recent sensor readings from the PostgreSQL `readings` table.
    Returns a DataFrame or empty DataFrame on error.
    """
    if not _HAS_PSYCOPG2:
        print(
            json.dumps(
                {
                    "warning": "psycopg2 not installed; falling back to CSV mode if available"
                }
            ),
            file=sys.stderr,
        )
        return pd.DataFrame()

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT *
            FROM (
                SELECT
                    recorded_at   AS timestamp,
                    temperature_c AS temperature,
                    humidity_pct  AS humidity,
                    co2_ppm       AS co2,
                    nh3_ppm       AS ammonia
                FROM readings
                WHERE recorded_at >= NOW() - (%s * INTERVAL '1 hour')
                  AND temperature_c IS NOT NULL
                  AND humidity_pct IS NOT NULL
                  AND co2_ppm IS NOT NULL
                  AND nh3_ppm IS NOT NULL
                ORDER BY recorded_at DESC
                LIMIT %s
            ) recent
            ORDER BY timestamp ASC
            """,
            (hours, limit),
        )
        rows = cur.fetchall()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows)
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df = df.ffill().bfill()
        return df[["timestamp", "temperature", "humidity", "co2", "ammonia"]]
    except Exception as e:
        print(json.dumps({"error": f"Database error: {e}"}), file=sys.stderr)
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()


# ── Analytics functions ────────────────────────────────────────────────────────


def get_anomalies(hours=24, contamination=0.05):
    df = fetch_recent_readings(hours=hours)
    source = df.attrs.get("data_source", "unknown")
    if df.empty or len(df) < 20:
        return {
            "status": "insufficient_data",
            "message": f"Need ≥20 readings, got {len(df)}",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "anomalies": [],
            "summary": {"total_anomalies": 0, "recent_anomalies": 0},
        }
    try:
        detector = AnomalyDetector(contamination=contamination)
        detector.fit(df, SENSOR_COLS, SAFE_RANGES)
        labels, scores = detector.predict_ensemble(df, threshold=0.45)

        anomalies = []
        for idx in range(len(df)):
            if labels[idx] != 1:
                continue
            score_val = float(scores[idx]) if scores is not None else 0.5  # [A4] FIX
            explanation = detector.get_anomaly_explanation(
                df, df.index[idx], SENSOR_COLS
            )
            # [A4] FIX: guard against scores being None before comparison
            severity = (
                "critical"
                if score_val > 0.7
                else "warning"
                if score_val > 0.5
                else "suspicious"
            )
            anomalies.append(
                {
                    "timestamp": df.iloc[idx]["timestamp"].isoformat(),
                    "score": score_val,
                    "severity": severity,
                    "explanation": explanation,
                    "values": {s: float(df.iloc[idx][s]) for s in SENSOR_COLS},
                }
            )

        recent_cutoff = datetime.now() - timedelta(hours=1)
        recent = [
            a
            for a in anomalies
            if datetime.fromisoformat(a["timestamp"].replace("Z", "")) > recent_cutoff
        ]
        return {
            "status": "success",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "anomalies": anomalies[-50:],
            "summary": {
                "total_anomalies": len(anomalies),
                "recent_anomalies": len(recent),
                "anomaly_rate": round(len(anomalies) / len(df), 4),
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "anomalies": [],
            "summary": {"total_anomalies": 0, "recent_anomalies": 0},
        }


def get_forecast(horizon=30):
    """
    [A2] FIX: original called forecaster.predict_single_sensor() which does not exist.
    Replaced with forecaster.predict(df)[sensor] (bulk predict then index by sensor).
    """
    df = fetch_recent_readings(hours=6)
    source = df.attrs.get("data_source", "unknown")
    if df.empty or len(df) < 30:
        return {
            "status": "insufficient_data",
            "message": f"Need ≥30 readings, got {len(df)}",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "forecasts": {},
        }
    try:
        forecaster = MultiSensorForecaster(forecast_horizon=horizon)
        forecaster.fit(df, SENSOR_COLS)
        all_preds = forecaster.predict(df)  # [A2] FIX: bulk predict

        from sklearn.metrics import mean_absolute_error, r2_score

        forecasts = {}
        for sensor in SENSOR_COLS:
            preds = all_preds[sensor]
            n_pred = len(preds)
            y_true = df[sensor].iloc[-n_pred:].values
            mae = float(mean_absolute_error(y_true, preds))
            r2 = float(r2_score(y_true, preds))

            current_val = float(df[sensor].iloc[-1])
            predicted_val = float(preds[-1])
            trend = (
                "rising"
                if predicted_val > current_val * 1.02
                else "falling"
                if predicted_val < current_val * 0.98
                else "stable"
            )

            forecasts[sensor] = {
                "current": current_val,
                "predicted": round(predicted_val, 3),
                "horizon_minutes": horizon,
                "trend": trend,
                "mae": round(mae, 4),
                "r2": round(r2, 4),
            }
        return {
            "status": "success",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "horizon_minutes": horizon,
            "forecasts": forecasts,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "forecasts": {},
        }


def get_risk_score():
    """
    [A1] FIX: original called scorer.compute_risk_scores() — correct name is compute_risk_score().
    """
    df = fetch_recent_readings(hours=2)
    source = df.attrs.get("data_source", "unknown")
    if df.empty or len(df) < 10:
        return {
            "status": "insufficient_data",
            "message": f"Need ≥10 readings, got {len(df)}",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "risk_score": 0,
            "risk_level": "unknown",
        }
    try:
        scorer = RiskScorer()
        risk_df = scorer.compute_risk_score(df, SENSOR_COLS)  # [A1] FIX
        latest = risk_df.iloc[-1]

        contributions = sorted(
            [
                {
                    "sensor": s,
                    "value": float(latest[s]),
                    "risk_contribution": float(latest.get(f"{s}_risk", 0)),
                }
                for s in SENSOR_COLS
                if latest.get(f"{s}_risk", 0) > 0.3
            ],
            key=lambda x: x["risk_contribution"],
            reverse=True,
        )
        return {
            "status": "success",
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "risk_score": round(float(latest["composite_risk"]), 4),
            "risk_level": latest["risk_level"],
            "contributing_factors": contributions[:3],
            "recommendation": _get_recommendation(latest["risk_level"], contributions),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "data_source": source,
            "reading_count": int(len(df)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "risk_score": 0,
            "risk_level": "unknown",
        }


def _get_recommendation(risk_level, contributions):
    if risk_level == "Normal":
        return "Environment within acceptable parameters. Continue regular monitoring."
    recs_map = {
        "temperature": "Check ventilation and cooling/heating systems",
        "humidity": "Adjust airflow; check for water leaks or poor drainage",
        "co2": "Increase ventilation rate immediately",
        "ammonia": "Check litter condition and improve ventilation",
    }
    recs = [recs_map[c["sensor"]] for c in contributions if c["sensor"] in recs_map]
    prefix = (
        "CRITICAL: Immediate action required. "
        if risk_level == "Critical"
        else "Warning: "
    )
    return (
        prefix + " ".join(recs[:2])
        if recs
        else f"{risk_level}: Monitor conditions closely."
    )


def get_analytics_summary():
    anomalies = get_anomalies(hours=24)
    forecast = get_forecast(horizon=30)
    risk = get_risk_score()
    return {
        "status": "success",
        "data_source": risk.get("data_source")
        if risk.get("data_source") != "unknown"
        else anomalies.get("data_source", forecast.get("data_source", "unknown")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reading_count": max(
            anomalies.get("reading_count", 0),
            forecast.get("reading_count", 0),
            risk.get("reading_count", 0),
        ),
        "anomaly_summary": anomalies.get("summary", {}),
        "forecast_status": forecast.get("status"),
        "risk_level": risk.get("risk_level", "unknown"),
        "risk_score": risk.get("risk_score", 0),
        "recent_anomaly_count": anomalies.get("summary", {}).get("recent_anomalies", 0),
    }


# ── CLI ────────────────────────────────────────────────────────────────────────


def main(argv=None):
    parser = argparse.ArgumentParser(description="AI Analytics API Wrapper")
    parser.add_argument("command", choices=["anomalies", "forecast", "risk", "summary"])
    parser.add_argument("--hours", type=int, default=24)
    parser.add_argument("--horizon", type=int, default=30, choices=[15, 30, 60])
    parser.add_argument("--contamination", type=float, default=0.05)
    args = parser.parse_args(argv)

    dispatch = {
        "anomalies": lambda: get_anomalies(
            hours=args.hours, contamination=args.contamination
        ),
        "forecast": lambda: get_forecast(horizon=args.horizon),
        "risk": get_risk_score,
        "summary": get_analytics_summary,
    }
    print(json.dumps(dispatch[args.command](), indent=2, default=str))


if __name__ == "__main__":
    main()
