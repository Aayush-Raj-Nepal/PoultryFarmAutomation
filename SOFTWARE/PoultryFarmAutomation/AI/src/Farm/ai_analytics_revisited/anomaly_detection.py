"""
Anomaly Detection Module for Poultry Farm IoT
Implements z-score baseline, Isolation Forest, and Local Outlier Factor
with synthetic anomaly injection for evaluation.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')


class FeatureEngineer:
    """
    Feature engineering for multi-sensor environmental data.
    Creates temporal and statistical features for anomaly detection.
    """

    def __init__(self, safe_ranges=None, window_size=10):
        """
        Initialize feature engineer.

        Args:
            safe_ranges: dict with (min, max) for each sensor
                e.g., {'temperature': (18, 32), 'humidity': (40, 70), ...}
            window_size: rolling window size for statistics
        """
        self.window_size = window_size
        self.safe_ranges = safe_ranges or {
            'temperature': (18, 32),
            'humidity': (40, 75),
            'co2': (400, 1000),
            'ammonia': (0, 25)
        }
        self.scaler = StandardScaler()

    def engineer_features(self, df, sensor_cols):
        """
        Create engineered features for each sensor.

        Features per sensor:
        - current value (normalized)
        - rolling mean
        - rolling std
        - first difference (rate of change)
        - lag-1, lag-3, lag-5
        - deviation from safe range
        - hour of day encoding
        """
        features_df = df.copy()

        for sensor in sensor_cols:
            col = df[sensor]

            # Rolling statistics
            features_df[f'{sensor}_rolling_mean'] = col.rolling(window=self.window_size, min_periods=1).mean()
            features_df[f'{sensor}_rolling_std'] = col.rolling(window=self.window_size, min_periods=1).std().fillna(0)

            # First difference (rate of change)
            features_df[f'{sensor}_diff'] = col.diff().fillna(0)

            # Lag features
            features_df[f'{sensor}_lag1'] = col.shift(1).fillna(col.iloc[0])
            features_df[f'{sensor}_lag3'] = col.shift(3).fillna(col.iloc[0])
            features_df[f'{sensor}_lag5'] = col.shift(5).fillna(col.iloc[0])

            # Safe range deviation
            min_safe, max_safe = self.safe_ranges.get(sensor, (-np.inf, np.inf))
            deviation = np.zeros(len(col))
            below_mask = col < min_safe
            above_mask = col > max_safe
            deviation[below_mask] = min_safe - col[below_mask]
            deviation[above_mask] = col[above_mask] - max_safe
            features_df[f'{sensor}_safe_deviation'] = deviation

        # Time features
        if 'timestamp' in features_df.columns:
            features_df['timestamp'] = pd.to_datetime(features_df['timestamp'])
            features_df['hour_sin'] = np.sin(2 * np.pi * features_df['timestamp'].dt.hour / 24)
            features_df['hour_cos'] = np.cos(2 * np.pi * features_df['timestamp'].dt.hour / 24)
        else:
            features_df['hour_sin'] = 0
            features_df['hour_cos'] = 0

        # Cross-sensor features (ratios that indicate ventilation issues)
        if 'humidity' in sensor_cols and 'temperature' in sensor_cols:
            features_df['temp_humidity_ratio'] = features_df['temperature'] / (features_df['humidity'] + 1)
        if 'co2' in sensor_cols and 'ammonia' in sensor_cols:
            features_df['co2_ammonia_ratio'] = features_df['co2'] / (features_df['ammonia'] + 0.1)

        return features_df

    def get_feature_columns(self, sensor_cols):
        """Get list of feature column names."""
        feature_cols = []
        for sensor in sensor_cols:
            feature_cols.extend([
                sensor,
                f'{sensor}_rolling_mean',
                f'{sensor}_rolling_std',
                f'{sensor}_diff',
                f'{sensor}_lag1',
                f'{sensor}_lag3',
                f'{sensor}_lag5',
                f'{sensor}_safe_deviation'
            ])
        feature_cols.extend(['hour_sin', 'hour_cos'])
        if 'temperature' in sensor_cols and 'humidity' in sensor_cols:
            feature_cols.append('temp_humidity_ratio')
        if 'co2' in sensor_cols and 'ammonia' in sensor_cols:
            feature_cols.append('co2_ammonia_ratio')
        return feature_cols


class AnomalyInjector:
    """
    Inject synthetic anomalies for evaluation purposes.
    """

    def __init__(self, contamination=0.05, seed=42):
        self.contamination = contamination
        self.seed = seed
        np.random.seed(seed)

    def inject_anomalies(self, df, sensor_cols, anomaly_types=None):
        """
        Inject synthetic anomalies into the data.

        Args:
            df: input dataframe
            sensor_cols: list of sensor column names
            anomaly_types: list of anomaly types to inject
                Options: 'spike', 'drift', 'stuck', 'correlated'

        Returns:
            df_anomalous: dataframe with injected anomalies
            anomaly_labels: binary labels (1 = anomaly, 0 = normal)
            anomaly_info: dict with details of injected anomalies
        """
        df_anomalous = df.copy()
        anomaly_labels = np.zeros(len(df_anomalous))
        anomaly_info = {'spike': [], 'drift': [], 'stuck': [], 'correlated': []}

        if anomaly_types is None:
            anomaly_types = ['spike', 'drift', 'stuck', 'correlated']

        n_anomalies = int(len(df_anomalous) * self.contamination)
        n_per_type = n_anomalies // len(anomaly_types) if anomaly_types else n_anomalies

        for anomaly_type in anomaly_types:
            if anomaly_type == 'spike':
                # Random spikes - sudden large deviations
                for sensor in sensor_cols:
                    spike_indices = np.random.choice(
                        len(df_anomalous),
                        size=n_per_type // len(sensor_cols),
                        replace=False
                    )
                    for idx in spike_indices:
                        std_val = df_anomalous[sensor].std()
                        spike_magnitude = np.random.choice([-1, 1]) * std_val * np.random.uniform(4, 8)
                        df_anomalous.loc[idx, sensor] += spike_magnitude
                        anomaly_labels[idx] = 1
                        anomaly_info['spike'].append({
                            'index': int(idx),
                            'sensor': sensor,
                            'magnitude': float(spike_magnitude)
                        })

            elif anomaly_type == 'drift':
                # Gradual drift over consecutive points
                for sensor in sensor_cols:
                    drift_start = np.random.randint(0, len(df_anomalous) - 20)
                    drift_length = np.random.randint(10, 20)
                    drift_rate = np.random.uniform(0.1, 0.3) * df_anomalous[sensor].std()
                    drift_direction = np.random.choice([-1, 1])

                    for i in range(drift_length):
                        if drift_start + i < len(df_anomalous):
                            df_anomalous.loc[drift_start + i, sensor] += drift_direction * drift_rate * (i + 1)
                            anomaly_labels[drift_start + i] = 1

                    anomaly_info['drift'].append({
                        'start_index': int(drift_start),
                        'length': int(drift_length),
                        'sensor': sensor,
                        'rate': float(drift_rate),
                        'direction': int(drift_direction)
                    })

            elif anomaly_type == 'stuck':
                # Stuck sensor - same value repeated
                for sensor in sensor_cols:
                    stuck_start = np.random.randint(0, len(df_anomalous) - 15)
                    stuck_length = np.random.randint(10, 15)
                    stuck_value = df_anomalous[sensor].iloc[stuck_start]

                    for i in range(stuck_length):
                        if stuck_start + i < len(df_anomalous):
                            df_anomalous.loc[stuck_start + i, sensor] = stuck_value
                            anomaly_labels[stuck_start + i] = 1

                    anomaly_info['stuck'].append({
                        'start_index': int(stuck_start),
                        'length': int(stuck_length),
                        'sensor': sensor,
                        'stuck_value': float(stuck_value)
                    })

            elif anomaly_type == 'correlated':
                # Cross-sensor anomaly (e.g., CO2 and ammonia rise together)
                corr_start = np.random.randint(0, len(df_anomalous) - 10)
                corr_length = np.random.randint(8, 12)

                if 'co2' in sensor_cols and 'ammonia' in sensor_cols:
                    for i in range(corr_length):
                        if corr_start + i < len(df_anomalous):
                            df_anomalous.loc[corr_start + i, 'co2'] += df_anomalous['co2'].std() * 2
                            df_anomalous.loc[corr_start + i, 'ammonia'] += df_anomalous['ammonia'].std() * 1.5
                            anomaly_labels[corr_start + i] = 1

                    anomaly_info['correlated'].append({
                        'start_index': int(corr_start),
                        'length': int(corr_length),
                        'sensors': ['co2', 'ammonia']
                    })

        return df_anomalous, anomaly_labels, anomaly_info


class AnomalyDetector:
    """
    Main anomaly detection class with multiple algorithms.
    """

    def __init__(self, contamination=0.05, random_state=42):
        self.contamination = contamination
        self.random_state = random_state
        self.feature_engineer = None
        self.isolation_forest = None
        self.lof = None
        self.scaler = StandardScaler()
        self.z_threshold = 3.0

    def fit(self, df, sensor_cols, safe_ranges=None):
        """
        Fit anomaly detection models.

        Args:
            df: training data
            sensor_cols: list of sensor column names
            safe_ranges: dict with safe ranges for each sensor
        """
        self.sensor_cols = sensor_cols

        # Initialize feature engineer
        self.feature_engineer = FeatureEngineer(safe_ranges=safe_ranges)

        # Engineer features
        features_df = self.feature_engineer.engineer_features(df, sensor_cols)
        feature_cols = self.feature_engineer.get_feature_columns(sensor_cols)

        # Scale features
        X = features_df[feature_cols].values
        X_scaled = self.scaler.fit_transform(X)

        # Fit Isolation Forest
        self.isolation_forest = IsolationForest(
            n_estimators=200,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.isolation_forest.fit(X_scaled)

        # Fit LOF (for comparison)
        self.lof = LocalOutlierFactor(
            n_neighbors=20,
            contamination=self.contamination,
            novelty=True,
            n_jobs=-1
        )
        self.lof.fit(X_scaled)

        # Compute baseline statistics for z-score
        self.baseline_stats = {}
        for sensor in sensor_cols:
            self.baseline_stats[sensor] = {
                'mean': df[sensor].mean(),
                'std': df[sensor].std()
            }

        return self

    def predict_zscore(self, df):
        """
        Predict anomalies using rolling z-score baseline.

        Returns:
            z_labels: binary labels (1 = anomaly)
            z_scores: dict with z-scores per sensor
        """
        z_scores = {}
        z_labels = np.zeros(len(df))

        for sensor in self.sensor_cols:
            rolling_mean = df[sensor].rolling(window=10, min_periods=1).mean()
            rolling_std = df[sensor].rolling(window=10, min_periods=1).std().fillna(1)
            rolling_std = rolling_std.replace(0, 1)  # Avoid division by zero

            z = (df[sensor] - rolling_mean) / rolling_std
            z_scores[sensor] = z.values

            # Flag as anomaly if |z| > threshold
            sensor_anomalies = np.abs(z.values) > self.z_threshold
            z_labels = np.maximum(z_labels, sensor_anomalies.astype(int))

        return z_labels, z_scores

    def predict_isolation_forest(self, df):
        """
        Predict anomalies using Isolation Forest.

        Returns:
            if_labels: binary labels (-1 = anomaly in sklearn, converted to 1)
            if_scores: anomaly scores (more negative = more anomalous)
        """
        features_df = self.feature_engineer.engineer_features(df, self.sensor_cols)
        feature_cols = self.feature_engineer.get_feature_columns(self.sensor_cols)

        X = features_df[feature_cols].values
        X_scaled = self.scaler.transform(X)

        if_labels = self.isolation_forest.predict(X_scaled)
        if_scores = self.isolation_forest.score_samples(X_scaled)

        # Convert sklearn labels: -1 -> 1 (anomaly), 1 -> 0 (normal)
        if_labels = (if_labels == -1).astype(int)

        return if_labels, if_scores

    def predict_lof(self, df):
        """
        Predict anomalies using Local Outlier Factor.

        Returns:
            lof_labels: binary labels (-1 = anomaly in sklearn, converted to 1)
            lof_scores: negative LOF scores (more negative = more anomalous)
        """
        features_df = self.feature_engineer.engineer_features(df, self.sensor_cols)
        feature_cols = self.feature_engineer.get_feature_columns(self.sensor_cols)

        X = features_df[feature_cols].values
        X_scaled = self.scaler.transform(X)

        lof_labels = self.lof.predict(X_scaled)
        lof_scores = -self.lof.score_samples(X_scaled)  # Negate so higher = more anomalous

        # Convert sklearn labels: -1 -> 1 (anomaly), 1 -> 0 (normal)
        lof_labels = (lof_labels == -1).astype(int)

        return lof_labels, lof_scores

    def predict_ensemble(self, df, voting='soft', threshold=0.5):
        """
        Ensemble prediction combining all methods.

        Args:
            df: input data
            voting: 'soft' (score averaging) or 'hard' (majority voting)
            threshold: decision threshold for soft voting

        Returns:
            ensemble_labels: binary labels
            ensemble_scores: combined anomaly scores
        """
        z_labels, z_scores = self.predict_zscore(df)
        if_labels, if_scores = self.predict_isolation_forest(df)
        lof_labels, lof_scores = self.predict_lof(df)

        # Normalize scores to [0, 1] range
        if_scores_norm = (if_scores - if_scores.min()) / (if_scores.max() - if_scores.min() + 1e-10)
        if_scores_norm = 1 - if_scores_norm  # Invert so higher = more anomalous

        lof_scores_norm = (lof_scores - lof_scores.min()) / (lof_scores.max() - lof_scores.min() + 1e-10)

        # Z-score anomaly indicator (binary)
        z_scores_binary = z_labels.astype(float)

        if voting == 'hard':
            # Majority voting
            vote_sum = z_labels + if_labels + lof_labels
            ensemble_labels = (vote_sum >= 2).astype(int)  # At least 2 out of 3 agree
        else:
            # Soft voting - weighted average
            ensemble_scores = (
                0.3 * z_scores_binary +
                0.35 * if_scores_norm +
                0.35 * lof_scores_norm
            )
            ensemble_labels = (ensemble_scores > threshold).astype(int)
            return ensemble_labels, ensemble_scores

        return ensemble_labels, None

    def evaluate(self, y_true, y_pred, method_name=""):
        """
        Evaluate anomaly detection performance.

        Returns:
            metrics: dict with precision, recall, f1, confusion matrix
        """
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        metrics = {
            'method': method_name,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'true_positives': int(tp),
            'false_positives': int(fp),
            'true_negatives': int(tn),
            'false_negatives': int(fn),
            'false_alarm_rate': fp / (fp + tn) if (fp + tn) > 0 else 0
        }

        return metrics

    def get_anomaly_explanation(self, df, idx, sensor_cols):
        """
        Generate human-readable explanation for why a point was flagged.
        """
        explanations = []

        for sensor in sensor_cols:
            val = df.loc[idx, sensor]
            mean = self.baseline_stats[sensor]['mean']
            std = self.baseline_stats[sensor]['std']
            min_safe, max_safe = self.feature_engineer.safe_ranges.get(sensor, (-np.inf, np.inf))

            # Check if outside safe range
            if val < min_safe:
                explanations.append(f"{sensor} ({val:.2f}) below safe minimum ({min_safe})")
            elif val > max_safe:
                explanations.append(f"{sensor} ({val:.2f}) above safe maximum ({max_safe})")

            # Check z-score
            z = abs(val - mean) / std if std > 0 else 0
            if z > 3:
                explanations.append(f"{sensor} z-score = {z:.2f} (extreme deviation)")

        if not explanations:
            explanations.append("Multi-sensor pattern anomaly detected")

        return "; ".join(explanations)


def run_anomaly_detection_pipeline(data_path, output_dir, contamination=0.05):
    """
    Run complete anomaly detection pipeline.

    Args:
        data_path: path to environment dataset CSV
        output_dir: directory to save results
        contamination: expected proportion of anomalies

    Returns:
        results: dict with all results and metrics
    """
    import os
    import json

    os.makedirs(output_dir, exist_ok=True)

    # Load data
    df = pd.read_csv(data_path)
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']

    # Define safe ranges for poultry
    safe_ranges = {
        'temperature': (18, 32),
        'humidity': (40, 75),
        'co2': (400, 1500),
        'ammonia': (0, 25)
    }

    # Inject synthetic anomalies
    injector = AnomalyInjector(contamination=contamination)
    df_anomalous, anomaly_labels, anomaly_info = injector.inject_anomalies(
        df, sensor_cols,
        anomaly_types=['spike', 'drift', 'stuck', 'correlated']
    )

    # Save anomaly info
    with open(os.path.join(output_dir, 'injected_anomalies.json'), 'w') as f:
        json.dump(anomaly_info, f, indent=2)

    # Fit detector on clean data
    detector = AnomalyDetector(contamination=contamination)
    detector.fit(df, sensor_cols, safe_ranges)

    # Predict on anomalous data
    z_labels, z_scores = detector.predict_zscore(df_anomalous)
    if_labels, if_scores = detector.predict_isolation_forest(df_anomalous)
    lof_labels, lof_scores = detector.predict_lof(df_anomalous)
    ensemble_labels, ensemble_scores = detector.predict_ensemble(df_anomalous)

    # Evaluate all methods
    metrics = []
    metrics.append(detector.evaluate(anomaly_labels, z_labels, "Z-Score"))
    metrics.append(detector.evaluate(anomaly_labels, if_labels, "Isolation Forest"))
    metrics.append(detector.evaluate(anomaly_labels, lof_labels, "LOF"))
    metrics.append(detector.evaluate(anomaly_labels, ensemble_labels, "Ensemble"))

    # Save metrics
    metrics_df = pd.DataFrame(metrics)
    metrics_df.to_csv(os.path.join(output_dir, 'anomaly_detection_metrics.csv'), index=False)

    # Save predictions
    results_df = df_anomalous.copy()
    results_df['true_anomaly'] = anomaly_labels
    results_df['zscore_prediction'] = z_labels
    results_df['isolation_forest_prediction'] = if_labels
    results_df['lof_prediction'] = lof_labels
    results_df['ensemble_prediction'] = ensemble_labels

    if ensemble_scores is not None:
        results_df['ensemble_score'] = ensemble_scores

    results_df.to_csv(os.path.join(output_dir, 'anomaly_predictions.csv'), index=False)

    # Print summary
    print("=" * 60)
    print("ANOMALY DETECTION RESULTS")
    print("=" * 60)
    print(f"Total samples: {len(df_anomalous)}")
    print(f"Injected anomalies: {anomaly_labels.sum()} ({100*anomaly_labels.mean():.2f}%)")
    print()
    print(metrics_df.to_string(index=False))
    print("=" * 60)

    return {
        'metrics': metrics,
        'predictions': results_df,
        'anomaly_info': anomaly_info,
        'detector': detector
    }


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "DATA/environment_dataset.csv"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "ai_analytics/anomaly_results"

    run_anomaly_detection_pipeline(data_path, output_dir)
