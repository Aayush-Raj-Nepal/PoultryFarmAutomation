"""
Risk Scoring Module for Poultry Farm IoT

BUG FIXES (vs qwen3.5 original):
  [R1] fit() returned only cluster_labels -> ValueError on unpack. Fixed: returns (labels, semantic).
  [R2] run_risk_scoring_pipeline called clusterer.fit_predict() which did not exist. Fixed: .fit().
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings('ignore')


class RiskScorer:
    def __init__(self, target_ranges=None, weights=None):
        self.target_ranges = target_ranges or {
            'temperature': {'optimal': (21, 27), 'critical': (15, 35)},
            'humidity':    {'optimal': (50, 70), 'critical': (30, 80)},
            'co2':         {'optimal': (400, 800), 'critical': (300, 1500)},
            'ammonia':     {'optimal': (0, 10),  'critical': (0, 25)},
        }
        self.weights = weights or {
            'temperature': 0.25, 'humidity': 0.20, 'co2': 0.30, 'ammonia': 0.25,
        }

    def compute_sensor_risk(self, value, sensor):
        if sensor not in self.target_ranges:
            return 0.0, 'Normal'
        r = self.target_ranges[sensor]
        opt_lo, opt_hi = r['optimal']
        crit_lo, crit_hi = r['critical']
        if opt_lo <= value <= opt_hi:
            return 0.0, 'Normal'
        if value <= crit_lo or value >= crit_hi:
            return 1.0, 'Critical'
        if value < opt_lo:
            risk = 0.5 * (opt_lo - value) / max(opt_lo - crit_lo, 1e-9)
        else:
            risk = 0.5 * (value - opt_hi) / max(crit_hi - opt_hi, 1e-9)
        risk = float(np.clip(risk, 0.0, 1.0))
        return risk, ('Critical' if risk > 0.75 else 'Warning')

    def compute_risk_score(self, df, sensor_cols):
        df_risk = df.copy()
        for s in sensor_cols:
            risks, levels = zip(*[self.compute_sensor_risk(v, s) for v in df_risk[s]])
            df_risk[f'{s}_risk']  = list(risks)
            df_risk[f'{s}_level'] = list(levels)
        composite = sum(self.weights.get(s, 0.25) * df_risk[f'{s}_risk'] for s in sensor_cols)
        df_risk['composite_risk'] = composite
        df_risk['risk_level']     = composite.apply(lambda r: 'Normal' if r < 0.25 else ('Warning' if r < 0.50 else 'Critical'))
        df_risk['persistence']    = self._persistence(df_risk['risk_level'])
        df_risk['adjusted_risk']  = (composite * (1 + 0.1 * df_risk['persistence'])).clip(0, 1)
        return df_risk

    @staticmethod
    def _persistence(risk_level):
        p, c = np.zeros(len(risk_level)), 0
        for i, lv in enumerate(risk_level):
            c = 0 if lv == 'Normal' else c + 1
            p[i] = c
        return p

    def generate_recommendations(self, df_risk, sensor_cols):
        rows = []
        for idx, row in df_risk.iterrows():
            recs = []
            if row['risk_level'] == 'Critical':
                worst = max(sensor_cols, key=lambda s: row.get(f'{s}_risk', 0))
                msgs = {
                    'temperature': ("URGENT: Activate cooling -- temperature exceeds comfort range" if row['temperature'] > 27 else "URGENT: Activate heating -- temperature below comfort range"),
                    'humidity':    ("URGENT: Increase ventilation -- humidity too high" if row['humidity'] > 70 else "URGENT: Reduce ventilation -- too dry"),
                    'co2':         "URGENT: Increase ventilation -- CO2 accumulation detected",
                    'ammonia':     "URGENT: Check litter and ventilation -- ammonia spike detected",
                }
                recs.append(msgs.get(worst, f"URGENT: {worst} out of range"))
            elif row['risk_level'] == 'Warning':
                for s in sensor_cols:
                    if row.get(f'{s}_level') == 'Warning':
                        v = row[s]
                        recs.append({'temperature': f"Monitor temperature -- {v:.1f} C",
                                     'humidity':    f"Monitor humidity -- {v:.1f}%",
                                     'co2':         f"Ventilation may be insufficient -- CO2 at {v:.0f} ppm",
                                     'ammonia':     f"Check litter -- ammonia at {v:.1f} ppm"}.get(s, f"{s}: {v:.2f}"))
            if row.get('persistence', 0) > 10:
                recs.append(f"Abnormal conditions persisting for {int(row['persistence'])} steps")
            if not recs:
                recs.append("All parameters within normal range")
            rows.append({'timestamp': row.get('timestamp', idx), 'risk_level': row['risk_level'],
                         'composite_risk': round(float(row['composite_risk']), 4),
                         'recommendations': "; ".join(recs)})
        return pd.DataFrame(rows)


class EnvironmentalStateClusterer:
    """K-Means on farm operating conditions (NOT sensor-reference pairs)."""

    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.kmeans = None
        self.scaler = MinMaxScaler()
        self.label_map = {}

    def _features(self, df, sensor_cols):
        feat = pd.DataFrame()
        for s in sensor_cols:
            feat[s]          = df[s].values
            feat[f'{s}_var'] = df[s].rolling(10, min_periods=1).var().fillna(0).values
        if 'timestamp' in df.columns:
            h = pd.to_datetime(df['timestamp']).dt.hour
            feat['hour_sin'] = np.sin(2 * np.pi * h / 24).values
            feat['hour_cos'] = np.cos(2 * np.pi * h / 24).values
        return feat

    def fit(self, df, sensor_cols):
        """[R1 FIX] Returns (cluster_labels, semantic_labels)."""
        feat  = self._features(df, sensor_cols)
        feat_s = self.scaler.fit_transform(feat)
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        cl = self.kmeans.fit_predict(feat_s)
        tmp = feat.copy(); tmp['cluster'] = cl
        self.cluster_profiles = tmp.groupby('cluster').mean()
        self.label_map = self._interpret(sensor_cols)
        return cl, [self.label_map.get(c, f'Cluster {c}') for c in cl]

    def _interpret(self, sensor_cols):
        labels = {}
        for cid in range(self.n_clusters):
            p, ind = self.cluster_profiles.loc[cid], []
            if 'temperature' in sensor_cols:
                if p['temperature'] > 28: ind.append('heat-stress')
                elif p['temperature'] < 20: ind.append('cold-stress')
            if 'humidity' in sensor_cols:
                if p['humidity'] > 70: ind.append('high-humidity')
                elif p['humidity'] < 45: ind.append('low-humidity')
            if 'co2' in sensor_cols and p['co2'] > 1000: ind.append('poor-ventilation')
            if 'ammonia' in sensor_cols and p['ammonia'] > 15: ind.append('gas-accumulation')
            labels[cid] = ' / '.join(ind) if ind else 'Normal/Comfortable'
        return labels

    def predict(self, df, sensor_cols):
        feat_s = self.scaler.transform(self._features(df, sensor_cols))
        cl = self.kmeans.predict(feat_s)
        return cl, [self.label_map.get(c, f'Cluster {c}') for c in cl]

    def get_cluster_summary(self):
        s = self.cluster_profiles.copy()
        s['interpretation'] = [self.label_map.get(i, f'Cluster {i}') for i in range(self.n_clusters)]
        return s


def run_risk_scoring_pipeline(data_path, output_dir):
    import os
    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_csv(data_path)
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']

    scorer  = RiskScorer()
    df_risk = scorer.compute_risk_score(df, sensor_cols)
    df_risk.to_csv(os.path.join(output_dir, 'risk_scores.csv'), index=False)
    recs = scorer.generate_recommendations(df_risk, sensor_cols)
    recs.to_csv(os.path.join(output_dir, 'recommendations.csv'), index=False)

    print("Risk Level Distribution:")
    print(df_risk['risk_level'].value_counts())

    clusterer = EnvironmentalStateClusterer(n_clusters=4)
    # [R2 FIX] was clusterer.fit_predict() -- method did not exist
    cluster_labels, semantic_labels = clusterer.fit(df, sensor_cols)
    df['cluster'] = cluster_labels
    df['cluster_label'] = semantic_labels
    df.to_csv(os.path.join(output_dir, 'data_with_states.csv'), index=False)
    summary = clusterer.get_cluster_summary()
    summary.to_csv(os.path.join(output_dir, 'cluster_profiles.csv'))

    print("\nCluster Profiles:"); print(summary.to_string())
    print("\nCluster Distribution:"); print(pd.Series(semantic_labels).value_counts())

    return {'risk_scores': df_risk, 'recommendations': recs, 'clustered_data': df,
            'cluster_profiles': summary, 'scorer': scorer, 'clusterer': clusterer}


if __name__ == "__main__":
    import sys
    run_risk_scoring_pipeline(
        sys.argv[1] if len(sys.argv) > 1 else "DATA/environment_dataset.csv",
        sys.argv[2] if len(sys.argv) > 2 else "results/risk")
