"""
Main Pipeline Runner for AI Analytics
Generates all results, plots, and publication-ready tables.
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import json
import warnings
warnings.filterwarnings('ignore')

# Add package to path
sys.path.insert(0, os.path.dirname(__file__))

from anomaly_detection import AnomalyDetector, AnomalyInjector, run_anomaly_detection_pipeline
from forecasting import MultiSensorForecaster, create_forecast_horizon_comparison, run_forecasting_pipeline
from risk_scoring import RiskScorer, EnvironmentalStateClusterer, run_risk_scoring_pipeline


def create_publication_tables(results, tables_dir):
    """Generate LaTeX tables suitable for direct inclusion in report."""

    os.makedirs(tables_dir, exist_ok=True)

    # Table 1: Anomaly Detection Performance
    anomaly_metrics = results['anomaly']['metrics']
    anomaly_df = pd.DataFrame(anomaly_metrics)

    latex_anomaly = r"""
\begin{table}[h!]
\centering
\caption{Anomaly Detection Performance Comparison}
\label{tab:anomaly_detection}
\begin{tabular}{lcccc}
\hline
\textbf{Method} & \textbf{Precision} & \textbf{Recall} & \textbf{F1-Score} & \textbf{False Alarm Rate} \\
\hline
"""
    for _, row in anomaly_df.iterrows():
        latex_anomaly += f"{row['method']} & {row['precision']:.4f} & {row['recall']:.4f} & {row['f1_score']:.4f} & {row['false_alarm_rate']:.4f} \\\\\n"

    latex_anomaly += r"""
\hline
\end{tabular}
\end{table}
"""

    with open(os.path.join(tables_dir, 'table_anomaly_detection.tex'), 'w') as f:
        f.write(latex_anomaly)

    # Table 2: Forecasting Performance
    forecast_metrics = results['forecast']['horizon_comparison']

    # Aggregate by sensor (using 15-min horizon)
    forecast_15 = forecast_metrics[forecast_metrics['horizon'] == 15]

    latex_forecast = r"""
\begin{table}[h!]
\centering
\caption{Multi-Sensor Forecasting Performance (15-minute horizon)}
\label{tab:forecasting}
\begin{tabular}{lcccc}
\hline
\textbf{Sensor} & \textbf{MAE} & \textbf{RMSE} & \textbf{R$^2$} & \textbf{MAPE (\%)} \\
\hline
"""
    for _, row in forecast_15.iterrows():
        latex_forecast += f"{row['sensor'].title()} & {row['MAE']:.4f} & {row['RMSE']:.4f} & {row['R2']:.4f} & {row['MAPE']:.2f} \\\\\n"

    latex_forecast += r"""
\hline
\end{tabular}
\end{table}
"""

    with open(os.path.join(tables_dir, 'table_forecasting.tex'), 'w') as f:
        f.write(latex_forecast)

    # Table 3: Risk Scoring Summary
    risk_df = results['risk']['risk_scores']
    risk_dist = risk_df['risk_level'].value_counts()
    total = len(risk_df)

    latex_risk = r"""
\begin{table}[h!]
\centering
\caption{Risk Score Distribution}
\label{tab:risk_distribution}
\begin{tabular}{lcc}
\hline
\textbf{Risk Level} & \textbf{Count} & \textbf{Percentage (\%)} \\
\hline
"""
    for level in ['Normal', 'Warning', 'Critical']:
        count = risk_dist.get(level, 0)
        pct = 100 * count / total
        latex_risk += f"{level} & {count} & {pct:.2f} \\\\\n"

    latex_risk += r"""
\hline
\end{tabular}
\end{table}
"""

    with open(os.path.join(tables_dir, 'table_risk_distribution.tex'), 'w') as f:
        f.write(latex_risk)

    # Table 4: Environmental State Clustering
    cluster_profiles = results['risk']['cluster_profiles']

    latex_cluster = r"""
\begin{table}[h!]
\centering
\caption{Environmental State Clustering Profiles}
\label{tab:clustering}
\begin{tabular}{lccccc}
\hline
\textbf{Cluster} & \textbf{Temp} & \textbf{Humidity} & \textbf{CO$_2$} & \textbf{NH$_3$} & \textbf{Interpretation} \\
\hline
"""
    for idx, row in cluster_profiles.iterrows():
        interpretation = row.get('interpretation', f'Cluster {idx}')
        latex_cluster += f"{idx} & {row.get('temperature', 0):.2f} & {row.get('humidity', 0):.2f} & {row.get('co2', 0):.1f} & {row.get('ammonia', 0):.2f} & {interpretation} \\\\\n"

    latex_cluster += r"""
\hline
\end{tabular}
\end{table}
"""

    with open(os.path.join(tables_dir, 'table_clustering.tex'), 'w') as f:
        f.write(latex_cluster)

    # Combined summary table
    latex_summary = r"""
\begin{table}[h!]
\centering
\caption{AI Analytics Modules Summary}
\label{tab:ai_summary}
\begin{tabular}{l|p{4cm}|p{3.5cm}}
\hline
\textbf{Module} & \textbf{Method} & \textbf{Key Result} \\
\hline
"""

    # Get best F1
    best_f1 = anomaly_df.loc[anomaly_df['method'] == 'Ensemble', 'f1_score'].values
    best_f1 = best_f1[0] if len(best_f1) > 0 else 0

    # Get average R2
    avg_r2 = forecast_15['R2'].mean()

    # Get normal percentage
    normal_pct = 100 * risk_dist.get('Normal', 0) / total

    latex_summary += f"""Anomaly Detection & Ensemble (Z-score + IF + LOF) & F1-Score = {best_f1:.4f} \\\\
Forecasting & Random Forest + Lag Features & Avg R$^2$ = {avg_r2:.4f} \\\\
Risk Scoring & Weighted Multi-Sensor Index & Normal: {normal_pct:.1f}\\% \\\\
State Clustering & K-Means (k=4) & 4 distinct states \\\\
"""

    latex_summary += r"""
\hline
\end{tabular}
\end{table}
"""

    with open(os.path.join(tables_dir, 'table_ai_summary.tex'), 'w') as f:
        f.write(latex_summary)

    # Save CSV versions
    anomaly_df.to_csv(os.path.join(tables_dir, 'anomaly_detection.csv'), index=False)
    forecast_15.to_csv(os.path.join(tables_dir, 'forecasting_performance.csv'), index=False)

    print(f"Publication tables saved to: {tables_dir}")


def create_publication_plots(results, plots_dir):
    """Generate publication-ready plots."""

    os.makedirs(plots_dir, exist_ok=True)
    plt.style.use('seaborn-v0_8-whitegrid')
    sns.set_palette('husl')

    # Plot 1: Anomaly Detection Results
    anomaly_preds = results['anomaly']['predictions']
    true_anomalies = anomaly_preds['true_anomaly'].values
    ensemble_preds = anomaly_preds['ensemble_prediction'].values

    if 'ensemble_score' in anomaly_preds.columns:
        ensemble_scores = anomaly_preds['ensemble_score'].values
    else:
        ensemble_scores = np.zeros(len(true_anomalies))

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # True vs Detected
    ax1 = axes[0, 0]
    ax1.fill_between(range(len(true_anomalies)), 0, true_anomalies, alpha=0.5,
                     label='True Anomalies', color='red')
    ax1.fill_between(range(len(ensemble_preds)), 0, ensemble_preds, alpha=0.5,
                     label='Detected', color='blue')
    ax1.set_xlabel('Sample Index')
    ax1.set_ylabel('Anomaly Label')
    ax1.set_title('True vs Detected Anomalies')
    ax1.legend()
    ax1.set_ylim(-0.1, 1.1)

    # Anomaly scores
    ax2 = axes[0, 1]
    ax2.plot(ensemble_scores[:500], linewidth=0.8, color='steelblue')
    ax2.axhline(y=0.5, color='red', linestyle='--', label='Threshold')
    ax2.set_xlabel('Sample Index')
    ax2.set_ylabel('Anomaly Score')
    ax2.set_title('Ensemble Anomaly Scores')
    ax2.legend()

    # F1 comparison
    ax3 = axes[1, 0]
    metrics_df = pd.DataFrame(results['anomaly']['metrics'])
    methods = metrics_df['method'].values
    f1_scores = metrics_df['f1_score'].values
    colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']
    bars = ax3.bar(methods, f1_scores, color=colors)
    ax3.set_ylabel('F1-Score')
    ax3.set_title('F1-Score Comparison')
    ax3.set_ylim(0, 1)
    ax3.tick_params(axis='x', rotation=15)

    # Anomaly type breakdown
    ax4 = axes[1, 1]
    anomaly_info = results['anomaly']['anomaly_info']
    types = list(anomaly_info.keys())
    counts = [len(anomaly_info[t]) for t in types]
    ax4.bar(types, counts, color=['#e74c3c', '#3498db', '#2ecc71', '#f39c12'])
    ax4.set_ylabel('Number of Events')
    ax4.set_title('Injected Anomaly Types')
    ax4.tick_params(axis='x', rotation=15)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, 'anomaly_detection.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # Plot 2: Risk Score Timeline
    risk_df = results['risk']['risk_scores']

    fig, axes = plt.subplots(3, 1, figsize=(14, 12))

    # Composite risk
    ax1 = axes[0]
    ax1.fill_between(range(len(risk_df)), risk_df['composite_risk'], 0,
                     color='steelblue', alpha=0.6)
    ax1.axhline(y=0.25, color='green', linestyle='--', label='Normal/Warning')
    ax1.axhline(y=0.5, color='orange', linestyle='--', label='Warning/Critical')
    ax1.set_ylabel('Risk Score')
    ax1.set_title('Shed Health Risk Index')
    ax1.legend()
    ax1.set_ylim(0, 1)

    # Risk level timeline
    ax2 = axes[1]
    risk_numeric = risk_df['risk_level'].map({'Normal': 0, 'Warning': 1, 'Critical': 2})
    ax2.scatter(range(len(risk_numeric)), risk_numeric, c=risk_numeric,
                cmap='RdYlGn_r', s=10, alpha=0.6)
    ax2.set_ylabel('Risk Level')
    ax2.set_title('Risk Level Timeline')
    ax2.set_yticks([0, 1, 2])
    ax2.set_yticklabels(['Normal', 'Warning', 'Critical'])

    # Sensor risks
    ax3 = axes[2]
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']
    for sensor in sensor_cols:
        ax3.plot(risk_df[f'{sensor}_risk'].values[-500:], label=sensor.title(), linewidth=1)
    ax3.set_xlabel('Time Step')
    ax3.set_ylabel('Sensor Risk')
    ax3.set_title('Individual Sensor Risk Contributions')
    ax3.legend()
    ax3.set_ylim(0, 1)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, 'risk_scoring.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # Plot 3: Forecasting Results
    forecast_horizon = results['forecast']['horizon_comparison']

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    for idx, sensor in enumerate(sensor_cols):
        ax = axes[idx // 2, idx % 2]
        sensor_data = forecast_horizon[forecast_horizon['sensor'] == sensor]

        horizons = sensor_data['horizon'].values
        r2_values = sensor_data['R2'].values

        ax.bar(horizons, r2_values, color=['#3498db', '#2ecc71', '#f39c12'])
        ax.set_xlabel('Forecast Horizon (minutes)')
        ax.set_ylabel('R²')
        ax.set_title(f'{sensor.title()} - Forecast Performance by Horizon')
        ax.set_ylim(0, 1)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, 'forecasting.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # Plot 4: Clustering Results
    clustered_data = results['risk']['clustered_data']
    cluster_profiles = results['risk']['cluster_profiles']

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Cluster distribution
    ax1 = axes[0]
    cluster_counts = clustered_data['cluster_label'].value_counts()
    colors = ['#2ecc71', '#f39c12', '#e74c3c', '#3498db']
    bars = ax1.bar(range(len(cluster_counts)), cluster_counts.values,
                   color=colors[:len(cluster_counts)])
    ax1.set_xlabel('Environmental State')
    ax1.set_ylabel('Frequency')
    ax1.set_title('Environmental State Distribution')
    ax1.set_xticks(range(len(cluster_counts)))
    labels = cluster_counts.index
    ax1.set_xticklabels(labels, rotation=45, ha='right')

    for bar, count in zip(bars, cluster_counts.values):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 10,
                 str(count), ha='center', va='bottom', fontsize=10)

    # Cluster profiles heatmap
    ax2 = axes[1]
    profile_data = cluster_profiles.drop(columns=['interpretation'], errors='ignore')
    sns.heatmap(profile_data.T, annot=True, fmt='.2f', cmap='YlOrRd', ax=ax2,
                cbar_kws={'label': 'Mean Value'})
    ax2.set_title('Cluster Profiles Heatmap')
    ax2.set_ylabel('Sensor')
    ax2.set_xlabel('Cluster')
    plt.setp(ax2.get_xticklabels(), rotation=0)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, 'clustering.png'), dpi=150, bbox_inches='tight')
    plt.close()

    print(f"Publication plots saved to: {plots_dir}")


def run_full_pipeline(data_path, output_dir):
    """
    Run complete AI analytics pipeline and generate all outputs.

    Args:
        data_path: Path to environment_dataset.csv
        output_dir: Output directory for all results

    Returns:
        results: Dict with all results
    """
    os.makedirs(output_dir, exist_ok=True)

    print("="*70)
    print("AI ANALYTICS PIPELINE FOR POULTRY FARM IoT")
    print("="*70)
    print(f"Data: {data_path}")
    print(f"Output: {output_dir}")
    print()

    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']
    results = {}

    # 1. Anomaly Detection
    print("\n" + "="*70)
    print("STEP 1: ANOMALY DETECTION")
    print("="*70)

    anomaly_results = run_anomaly_detection_pipeline(
        data_path,
        os.path.join(output_dir, 'anomaly')
    )
    results['anomaly'] = anomaly_results

    # 2. Forecasting
    print("\n" + "="*70)
    print("STEP 2: FORECASTING")
    print("="*70)

    forecast_results = run_forecasting_pipeline(
        data_path,
        os.path.join(output_dir, 'forecast')
    )
    results['forecast'] = forecast_results

    # 3. Risk Scoring and Clustering
    print("\n" + "="*70)
    print("STEP 3: RISK SCORING & CLUSTERING")
    print("="*70)

    risk_results = run_risk_scoring_pipeline(
        data_path,
        os.path.join(output_dir, 'risk')
    )
    results['risk'] = risk_results

    # 4. Generate Publication Tables
    print("\n" + "="*70)
    print("STEP 4: GENERATING PUBLICATION TABLES")
    print("="*70)

    tables_dir = os.path.join(output_dir, 'publication_tables')
    create_publication_tables(results, tables_dir)

    # 5. Generate Publication Plots
    print("\n" + "="*70)
    print("STEP 5: GENERATING PUBLICATION PLOTS")
    print("="*70)

    plots_dir = os.path.join(output_dir, 'publication_plots')
    create_publication_plots(results, plots_dir)

    # 6. Summary
    print("\n" + "="*70)
    print("PIPELINE COMPLETE")
    print("="*70)
    print(f"""
Output Structure:
{output_dir}/
├── anomaly/           # Anomaly detection results
├── forecast/          # Forecasting results
├── risk/              # Risk scoring and clustering
├── publication_tables/ # LaTeX and CSV tables for report
└── publication_plots/  # PNG figures for report

Key Results:
- Anomaly Detection: Best F1 = {results['anomaly']['metrics'][3]['f1_score']:.4f} (Ensemble)
- Forecasting: Avg R² = {results['forecast']['horizon_comparison'][results['forecast']['horizon_comparison']['horizon']==15]['R2'].mean():.4f} (15-min)
- Risk Scoring: {100*len(results['risk']['risk_scores'][results['risk']['risk_scores']['risk_level']=='Normal'])/len(results['risk']['risk_scores']):.1f}% Normal periods
- Clustering: 4 environmental states identified
""")

    return results


if __name__ == "__main__":
    # Default paths
    if len(sys.argv) > 1:
        data_path = sys.argv[1]
    else:
        data_path = "../DATA/environment_dataset.csv"

    if len(sys.argv) > 2:
        output_dir = sys.argv[2]
    else:
        output_dir = "ai_analytics_results"

    results = run_full_pipeline(data_path, output_dir)
    print("\nPipeline execution complete!")
