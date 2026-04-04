"""
Master runner: collects all results needed for figures and tables.
Run this once to populate results/ before building figures/tables.
"""

import sys, os, json, numpy as np, pandas as pd

sys.path.insert(0, os.path.dirname(__file__))

DATA = "../src/farm/DATA/environment_dataset.csv"
OUT = "results"

df = pd.read_csv(DATA)
sensor_cols = ["temperature", "humidity", "co2", "ammonia"]
safe_ranges = {
    "temperature": (18, 32),
    "humidity": (40, 75),
    "co2": (400, 1500),
    "ammonia": (0, 25),
}

# ── Anomaly detection ──────────────────────────────────────────────────────────
from ai_analytics.anomaly_detection import AnomalyDetector

N = len(df)
event_mask = np.zeros(N, dtype=int)
for i in range(1 * 1440 + 780, 1 * 1440 + 960):
    event_mask[i] = 1
for i in range(3 * 1440 + 120, 3 * 1440 + 360):
    event_mask[i] = 1
for i in range(5 * 1440 + 480, 5 * 1440 + 660):
    event_mask[i] = 1
for i in range(6 * 1440 + 0, 6 * 1440 + 120):
    event_mask[i] = 1

train_df = df.iloc[:2880]
test_df = df.iloc[2880:].copy()
test_df = test_df.reset_index(drop=True)
test_labels = event_mask[2880:]

det = AnomalyDetector(contamination=0.08)
det.fit(train_df, sensor_cols, safe_ranges)

z_l, z_s = det.predict_zscore(test_df)
if_l, if_s = det.predict_isolation_forest(test_df)
lof_l, lof_s = det.predict_lof(test_df)
ens_l, ens_s = det.predict_ensemble(test_df, threshold=0.45)

from sklearn.metrics import confusion_matrix


def compute_metrics(yt, yp, name):
    tn, fp, fn, tp = confusion_matrix(yt, yp).ravel()
    p = tp / (tp + fp) if tp + fp > 0 else 0.0
    r = tp / (tp + fn) if tp + fn > 0 else 0.0
    f1 = 2 * p * r / (p + r) if p + r > 0 else 0.0
    far = fp / (fp + tn) if fp + tn > 0 else 0.0
    return {
        "method": name,
        "precision": round(p, 4),
        "recall": round(r, 4),
        "f1_score": round(f1, 4),
        "false_alarm_rate": round(far, 4),
        "true_positives": int(tp),
        "false_positives": int(fp),
        "true_negatives": int(tn),
        "false_negatives": int(fn),
    }


anomaly_metrics = [
    compute_metrics(test_labels, z_l, "Z-Score"),
    compute_metrics(test_labels, if_l, "Isolation Forest"),
    compute_metrics(test_labels, lof_l, "LOF"),
    compute_metrics(test_labels, ens_l, "Ensemble"),
]
os.makedirs(f"{OUT}/anomaly", exist_ok=True)
pd.DataFrame(anomaly_metrics).to_csv(f"{OUT}/anomaly/metrics.csv", index=False)

# Save predictions for plotting
pred_df = test_df.copy()
pred_df["true_event"] = test_labels
pred_df["z_pred"] = z_l
pred_df["if_pred"] = if_l
pred_df["lof_pred"] = lof_l
pred_df["ens_pred"] = ens_l
pred_df["ens_score"] = ens_s if ens_s is not None else 0.5
# z-score max across sensors
z_max = np.zeros(len(test_df))
for s in sensor_cols:
    mean = det.baseline_stats[s]["mean"]
    std = max(det.baseline_stats[s]["std"], 1e-9)
    z_max = np.maximum(z_max, np.abs((test_df[s].values - mean) / std))
pred_df["z_score_max"] = z_max
pred_df.to_csv(f"{OUT}/anomaly/predictions.csv", index=False)
print(
    "Anomaly done.",
    pd.DataFrame(anomaly_metrics)[
        ["method", "precision", "recall", "f1_score", "false_alarm_rate"]
    ].to_string(index=False),
)

# ── Forecasting ────────────────────────────────────────────────────────────────
from ai_analytics.forecasting import (
    create_forecast_horizon_comparison,
    MultiSensorForecaster,
)

os.makedirs(f"{OUT}/forecast", exist_ok=True)

hc = create_forecast_horizon_comparison(df, sensor_cols, [15, 30, 60])
hc.to_csv(f"{OUT}/forecast/horizon_comparison.csv", index=False)

forecaster = MultiSensorForecaster(forecast_horizon=15)
forecaster.fit(df, sensor_cols)
preds = forecaster.predict(df)
pred_fore = df.copy()
for s, p in preds.items():
    pad = [None] * (len(df) - len(p))
    pred_fore[f"{s}_pred"] = pad + list(p)
pred_fore.to_csv(f"{OUT}/forecast/predictions.csv", index=False)
print("\nForecast done (15-min horizon):")
print(
    hc[hc["horizon"] == 15][["sensor", "MAE", "RMSE", "R2", "MAPE"]].to_string(
        index=False
    )
)

# ── Risk scoring & clustering ─────────────────────────────────────────────────
from ai_analytics.risk_scoring import RiskScorer, EnvironmentalStateClusterer

os.makedirs(f"{OUT}/risk", exist_ok=True)

scorer = RiskScorer()
df_risk = scorer.compute_risk_score(df, sensor_cols)
df_risk.to_csv(f"{OUT}/risk/risk_scores.csv", index=False)
recs = scorer.generate_recommendations(df_risk, sensor_cols)
recs.to_csv(f"{OUT}/risk/recommendations.csv", index=False)
print("\nRisk distribution:")
print(df_risk["risk_level"].value_counts())

clusterer = EnvironmentalStateClusterer(n_clusters=4)
cl_labels, cl_semantic = clusterer.fit(df, sensor_cols)
df_clust = df.copy()
df_clust["cluster"] = cl_labels
df_clust["cluster_label"] = cl_semantic
df_clust.to_csv(f"{OUT}/risk/data_with_states.csv", index=False)
cl_summary = clusterer.get_cluster_summary()
cl_summary.to_csv(f"{OUT}/risk/cluster_profiles.csv")
print("Cluster distribution:")
print(pd.Series(cl_semantic).value_counts())

print("\nAll pipelines complete. Results in", OUT)
