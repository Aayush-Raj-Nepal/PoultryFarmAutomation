"""
AI Analytics Package for Poultry Farm IoT
==========================================

This package implements the AI analytics layer for the smart poultry farm
monitoring system, including:

1. Anomaly Detection - Z-score, Isolation Forest, LOF, Ensemble
2. Forecasting - Random Forest with lag features for early warning
3. Risk Scoring - Interpretable shed health index
4. Environmental State Clustering - Pattern discovery

Usage:
    from ai_analytics import run_full_pipeline
    results = run_full_pipeline("path/to/data.csv", "output/dir")
"""

from .anomaly_detection import (
    AnomalyDetector,
    AnomalyInjector,
    FeatureEngineer,
    run_anomaly_detection_pipeline
)
from .forecasting import (
    MultiSensorForecaster,
    TimeSeriesFeatures,
    create_forecast_horizon_comparison,
    run_forecasting_pipeline
)
from .risk_scoring import (
    RiskScorer,
    EnvironmentalStateClusterer,
    run_risk_scoring_pipeline
)

__version__ = '1.0.0'
__all__ = [
    'AnomalyDetector',
    'AnomalyInjector',
    'FeatureEngineer',
    'MultiSensorForecaster',
    'TimeSeriesFeatures',
    'RiskScorer',
    'EnvironmentalStateClusterer',
    'run_anomaly_detection_pipeline',
    'run_forecasting_pipeline',
    'run_risk_scoring_pipeline',
    'create_forecast_horizon_comparison'
]
