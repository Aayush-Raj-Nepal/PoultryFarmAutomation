"""
Risk Scoring Module for Poultry Farm IoT
Creates interpretable "Shed Health Risk Index" from multi-sensor data.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings('ignore')


class RiskScorer:
    """
    Compute interpretable risk scores from environmental sensor data.
    """

    def __init__(self, target_ranges=None, weights=None):
        """
        Initialize risk scorer.

        Args:
            target_ranges: dict with (optimal_min, optimal_max, critical_min, critical_max)
            weights: dict with importance weights for each sensor
        """
        self.target_ranges = target_ranges or {
            'temperature': {'optimal': (21, 27), 'critical': (15, 35)},
            'humidity': {'optimal': (50, 70), 'critical': (30, 80)},
            'co2': {'optimal': (400, 800), 'critical': (300, 1500)},
            'ammonia': {'optimal': (0, 10), 'critical': (0, 25)}
        }
        self.weights = weights or {
            'temperature': 0.25,
            'humidity': 0.20,
            'co2': 0.30,
            'ammonia': 0.25
        }
        self.scaler = MinMaxScaler()

    def compute_sensor_risk(self, value, sensor):
        """
        Compute risk score for a single sensor reading.

        Returns:
            risk: 0 (normal) to 1 (critical)
            level: 'Normal', 'Warning', or 'Critical'
        """
        if sensor not in self.target_ranges:
            return 0, 'Normal'

        ranges = self.target_ranges[sensor]
        optimal_min, optimal_max = ranges['optimal']
        critical_min, critical_max = ranges['critical']

        # Inside optimal range = no risk
        if optimal_min <= value <= optimal_max:
            return 0, 'Normal'

        # Below critical minimum
        if value < critical_min:
            return 1.0, 'Critical'

        # Above critical maximum
        if value > critical_max:
            return 1.0, 'Critical'

        # Between optimal and critical (low side)
        if value < optimal_min:
            risk = 0.5 * (optimal_min - value) / (optimal_min - critical_min)
            return risk, 'Warning'

        # Between optimal and critical (high side)
        if value > optimal_max:
            risk = 0.5 * (value - optimal_max) / (critical_max - optimal_max)
            return risk, 'Warning'

        return 0, 'Normal'

    def compute_risk_score(self, df, sensor_cols):
        """
        Compute composite risk score for each timestep.

        Returns:
            df_risk: dataframe with risk scores and levels
        """
        df_risk = df.copy()

        # Compute individual sensor risks
        for sensor in sensor_cols:
            risks = []
            levels = []
            for _, row in df_risk.iterrows():
                risk, level = self.compute_sensor_risk(row[sensor], sensor)
                risks.append(risk)
                levels.append(level)
            df_risk[f'{sensor}_risk'] = risks
            df_risk[f'{sensor}_level'] = levels

        # Compute weighted composite risk
        composite_risk = np.zeros(len(df_risk))
        for sensor in sensor_cols:
            weight = self.weights.get(sensor, 0.25)
            composite_risk += weight * df_risk[f'{sensor}_risk'].values

        df_risk['composite_risk'] = composite_risk

        # Assign overall risk level
        def assign_level(risk):
            if risk < 0.25:
                return 'Normal'
            elif risk < 0.5:
                return 'Warning'
            else:
                return 'Critical'

        df_risk['risk_level'] = df_risk['composite_risk'].apply(assign_level)

        # Compute persistence (how long in abnormal state)
        df_risk['persistence'] = self._compute_persistence(df_risk['risk_level'])

        # Adjust risk for persistence
        df_risk['adjusted_risk'] = df_risk['composite_risk'] * (1 + 0.1 * df_risk['persistence'])
        df_risk['adjusted_risk'] = df_risk['adjusted_risk'].clip(0, 1)

        return df_risk

    def _compute_persistence(self, risk_level):
        """
        Compute how many consecutive timesteps in non-Normal state.
        """
        persistence = np.zeros(len(risk_level))
        count = 0

        for i, level in enumerate(risk_level):
            if level == 'Normal':
                count = 0
            else:
                count += 1
            persistence[i] = count

        return persistence

    def generate_recommendations(self, df_risk, sensor_cols):
        """
        Generate actionable recommendations based on risk analysis.
        """
        recommendations = []

        for idx, row in df_risk.iterrows():
            recs = []

            if row['risk_level'] == 'Critical':
                # Find primary contributor
                max_risk_sensor = max(sensor_cols, key=lambda s: row.get(f'{s}_risk', 0))
                max_risk = row[f'{max_risk_sensor}_risk']

                if max_risk_sensor == 'temperature':
                    if row['temperature'] > 27:
                        recs.append("URGENT: Activate cooling/ventilation - temperature exceeds comfort range")
                    else:
                        recs.append("URGENT: Activate heating - temperature below comfort range")

                elif max_risk_sensor == 'humidity':
                    if row['humidity'] > 70:
                        recs.append("URGENT: Increase ventilation - humidity too high")
                    else:
                        recs.append("URGENT: Reduce ventilation or add humidity - too dry")

                elif max_risk_sensor == 'co2':
                    recs.append("URGENT: Increase ventilation - CO2 accumulation detected")

                elif max_risk_sensor == 'ammonia':
                    recs.append("URGENT: Improve ventilation and check litter - ammonia spike detected")

            elif row['risk_level'] == 'Warning':
                warning_sensors = [s for s in sensor_cols if row.get(f'{s}_level') == 'Warning']
                for sensor in warning_sensors:
                    val = row[sensor]
                    if sensor == 'temperature':
                        recs.append(f"Monitor temperature trend - currently {val:.1f}°C")
                    elif sensor == 'humidity':
                        recs.append(f"Monitor humidity - currently {val:.1f}%")
                    elif sensor == 'co2':
                        recs.append(f"Ventilation may be insufficient - CO2 at {val:.0f} ppm")
                    elif sensor == 'ammonia':
                        recs.append(f"Check litter conditions - ammonia at {val:.1f} ppm")

            if row.get('persistence', 0) > 10:
                recs.append(f"Abnormal conditions persisting for {int(row['persistence'])} time steps")

            if not recs:
                recs.append("All parameters within normal range")

            recommendations.append({
                'timestamp': row.get('timestamp', idx),
                'risk_level': row['risk_level'],
                'composite_risk': row['composite_risk'],
                'recommendations': "; ".join(recs)
            })

        return pd.DataFrame(recommendations)


class EnvironmentalStateClusterer:
    """
    Cluster environmental states for pattern discovery.
    NOTE: This clusters farm conditions, NOT sensor-reference validation pairs.
    """

    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.kmeans = None
        self.feature_cols = None
        self.scaler = MinMaxScaler()

    def create_state_features(self, df, sensor_cols):
        """
        Create features for environmental state clustering.
        """
        features = pd.DataFrame()

        for sensor in sensor_cols:
            # Current value
            features[f'{sensor}'] = df[sensor]
            # Rolling variance (indicates instability)
            features[f'{sensor}_var'] = df[sensor].rolling(window=10, min_periods=1).var().fillna(0)

        # Time of day
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            features['hour'] = df['timestamp'].dt.hour
            features['hour_sin'] = np.sin(2 * np.pi * features['hour'] / 24)
            features['hour_cos'] = np.cos(2 * np.pi * features['hour'] / 24)

        self.feature_cols = features.columns.tolist()
        return features

    def fit(self, df, sensor_cols):
        """
        Fit clustering model on environmental state features.
        """
        features = self.create_state_features(df, sensor_cols)

        # Scale features
        features_scaled = self.scaler.fit_transform(features)

        # Fit K-means
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        cluster_labels = self.kmeans.fit_predict(features_scaled)

        # Analyze cluster characteristics
        features['cluster'] = cluster_labels
        self.cluster_profiles = features.groupby('cluster').mean()

        # Assign semantic labels to clusters
        self.cluster_labels = self._interpret_clusters(sensor_cols)

        return cluster_labels

    def _interpret_clusters(self, sensor_cols):
        """
        Assign interpretable labels to clusters based on characteristics.
        """
        labels = {}

        for cluster_id in range(self.n_clusters):
            profile = self.cluster_profiles.loc[cluster_id]

            # Simple heuristic interpretation
            indicators = []

            if 'temperature' in sensor_cols:
                if profile['temperature'] > 28:
                    indicators.append('heat-stress')
                elif profile['temperature'] < 20:
                    indicators.append('cold-stress')

            if 'humidity' in sensor_cols:
                if profile['humidity'] > 70:
                    indicators.append('high-humidity')
                elif profile['humidity'] < 45:
                    indicators.append('low-humidity')

            if 'co2' in sensor_cols:
                if profile['co2'] > 1000:
                    indicators.append('poor-ventilation')

            if 'ammonia' in sensor_cols:
                if profile['ammonia'] > 15:
                    indicators.append('gas-accumulation')

            if not indicators:
                labels[cluster_id] = 'Normal/Comfortable'
            else:
                labels[cluster_id] = ' / '.join(indicators)

        return labels

    def predict(self, df, sensor_cols):
        """
        Predict cluster assignments for new data.
        """
        features = self.create_state_features(df, sensor_cols)
        features_scaled = self.scaler.transform(features)

        cluster_labels = self.kmeans.predict(features_scaled)
        semantic_labels = [self.cluster_labels.get(c, f'Cluster {c}') for c in cluster_labels]

        return cluster_labels, semantic_labels

    def fit_predict(self, df, sensor_cols):
        """
        Fit the clustering model and return numeric and semantic labels.
        """
        cluster_labels = self.fit(df, sensor_cols)
        semantic_labels = [self.cluster_labels.get(c, f'Cluster {c}') for c in cluster_labels]
        return cluster_labels, semantic_labels

    def get_cluster_summary(self):
        """
        Get summary of cluster characteristics.
        """
        summary = self.cluster_profiles.copy()
        summary['interpretation'] = [self.cluster_labels.get(i, f'Cluster {i}')
                                      for i in range(self.n_clusters)]
        return summary


def run_risk_scoring_pipeline(data_path, output_dir):
    """
    Run complete risk scoring and environmental state clustering pipeline.
    """
    import os

    os.makedirs(output_dir, exist_ok=True)

    # Load data
    df = pd.read_csv(data_path)
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']

    print("=" * 60)
    print("RISK SCORING RESULTS")
    print("=" * 60)

    # Compute risk scores
    print("\nComputing risk scores...")
    scorer = RiskScorer()
    df_risk = scorer.compute_risk_score(df, sensor_cols)

    # Save risk scores
    df_risk.to_csv(os.path.join(output_dir, 'risk_scores.csv'), index=False)

    # Generate recommendations
    print("Generating recommendations...")
    recommendations = scorer.generate_recommendations(df_risk, sensor_cols)
    recommendations.to_csv(os.path.join(output_dir, 'recommendations.csv'), index=False)

    # Print risk distribution
    print("\nRisk Level Distribution:")
    risk_dist = df_risk['risk_level'].value_counts()
    print(risk_dist)

    # Environmental state clustering
    print("\n" + "=" * 60)
    print("ENVIRONMENTAL STATE CLUSTERING")
    print("=" * 60)

    clusterer = EnvironmentalStateClusterer(n_clusters=4)
    cluster_labels, semantic_labels = clusterer.fit_predict(df, sensor_cols)

    # Add to dataframe
    df['cluster'] = cluster_labels
    df['cluster_label'] = semantic_labels

    # Save clustering results
    df.to_csv(os.path.join(output_dir, 'data_with_states.csv'), index=False)

    # Cluster summary
    cluster_summary = clusterer.get_cluster_summary()
    cluster_summary.to_csv(os.path.join(output_dir, 'cluster_profiles.csv'))

    print("\nCluster Profiles:")
    print(cluster_summary.to_string())

    # Cluster distribution
    print("\nCluster Distribution:")
    cluster_dist = pd.Series(semantic_labels).value_counts()
    print(cluster_dist)

    print("\n" + "=" * 60)
    print("Risk scoring complete!")
    print(f"Results saved to: {output_dir}")
    print("=" * 60)

    return {
        'risk_scores': df_risk,
        'recommendations': recommendations,
        'clustered_data': df,
        'cluster_profiles': cluster_summary,
        'scorer': scorer,
        'clusterer': clusterer
    }


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "DATA/environment_dataset.csv"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "ai_analytics/risk_results"

    run_risk_scoring_pipeline(data_path, output_dir)
