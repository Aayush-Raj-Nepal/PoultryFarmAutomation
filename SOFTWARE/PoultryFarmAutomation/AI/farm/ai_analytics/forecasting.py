"""
Forecasting Module for Poultry Farm IoT
Random Forest with lag features for multi-sensor short-horizon forecasting.

BUG FIXES (vs qwen3.5 original):
  [F1] create_forecast_horizon_comparison() was missing 'MAPE' in results.append()
       -> KeyError in run_pipeline.py LaTeX table loop. Fixed: MAPE now included.
  [F2] multi_step_df column rename used enumerate(columns) incorrectly, mixing
       column-name and step-index. Fixed: rows labelled step_1..step_N cleanly.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')


class TimeSeriesFeatures:
    def __init__(self, lags=None):
        self.lags = lags or [1, 2, 3, 5, 10, 15]

    def create_features(self, df, target_col, exog_cols=None):
        df_feat = df.copy()
        for lag in self.lags:
            df_feat[f'{target_col}_lag{lag}'] = df_feat[target_col].shift(lag)
        df_feat[f'{target_col}_rolling_mean'] = df_feat[target_col].rolling(5, min_periods=1).mean()
        df_feat[f'{target_col}_rolling_std']  = df_feat[target_col].rolling(5, min_periods=1).std()
        df_feat[f'{target_col}_diff1'] = df_feat[target_col].diff()
        df_feat[f'{target_col}_diff2'] = df_feat[target_col].diff(2)
        if 'timestamp' in df_feat.columns:
            df_feat['timestamp'] = pd.to_datetime(df_feat['timestamp'])
            h = df_feat['timestamp'].dt.hour
            df_feat['hour_sin'] = np.sin(2 * np.pi * h / 24)
            df_feat['hour_cos'] = np.cos(2 * np.pi * h / 24)
        if exog_cols:
            for col in exog_cols:
                for lag in [1, 2, 3]:
                    df_feat[f'{col}_lag{lag}'] = df_feat[col].shift(lag)
        df_feat = df_feat.dropna()
        feature_cols = [c for c in df_feat.columns
                        if c != target_col and not c.startswith('timestamp')]
        return df_feat[feature_cols], df_feat[target_col], feature_cols


class MultiSensorForecaster:
    def __init__(self, forecast_horizon=15, model_type='rf'):
        self.forecast_horizon = forecast_horizon
        self.model_type = model_type
        self.models, self.scalers, self.feature_engineers, self.feature_cols = {}, {}, {}, {}

    def fit(self, df, sensor_cols, exog_cols=None):
        self.sensor_cols = sensor_cols
        self.exog_cols = exog_cols or list(sensor_cols)
        for sensor in sensor_cols:
            fe = TimeSeriesFeatures()
            other = [c for c in self.exog_cols if c != sensor]
            X, y, fcols = fe.create_features(df, sensor, other)
            self.feature_engineers[sensor] = fe
            self.feature_cols[sensor] = fcols
            scaler = StandardScaler()
            Xs = scaler.fit_transform(X)
            self.scalers[sensor] = scaler
            m = RandomForestRegressor(n_estimators=100, max_depth=10,
                                      min_samples_leaf=5, random_state=42, n_jobs=-1)
            m.fit(Xs, y)
            self.models[sensor] = m
        return self

    def predict(self, df):
        predictions = {}
        for sensor in self.sensor_cols:
            fe    = self.feature_engineers[sensor]
            other = [c for c in self.exog_cols if c != sensor]
            X, _, _ = fe.create_features(df, sensor, other)
            Xs = self.scalers[sensor].transform(X)
            predictions[sensor] = self.models[sensor].predict(Xs)
        return predictions

    def forecast_multi_step(self, df, steps=5):
        forecasts = {s: [] for s in self.sensor_cols}
        history = df.copy()
        for _ in range(steps):
            preds = self.predict(history)
            for s in self.sensor_cols:
                forecasts[s].append(preds[s][-1])
            new_row = history.iloc[-1:].copy()
            for s in self.sensor_cols:
                new_row[s] = preds[s][-1]
            history = pd.concat([history, new_row], ignore_index=True)
        return forecasts

    @staticmethod
    def _mape(y_true, y_pred):
        yt, yp = np.asarray(y_true), np.asarray(y_pred)
        mask = yt != 0
        return float(np.mean(np.abs((yt[mask] - yp[mask]) / yt[mask])) * 100) if mask.any() else 0.0


def create_forecast_horizon_comparison(df, sensor_cols, horizons=None):
    """[F1 FIX] results.append now includes MAPE."""
    horizons = horizons or [15, 30, 60]
    results = []
    for horizon in horizons:
        df_h = df.copy()
        for s in sensor_cols:
            df_h[f'{s}_target'] = df_h[s].shift(-horizon)
        forecaster = MultiSensorForecaster(forecast_horizon=horizon)
        forecaster.fit(df, sensor_cols)
        target_cols = [f'{s}_target' for s in sensor_cols]
        for sensor in sensor_cols:
            valid = ~df_h[f'{sensor}_target'].isna()
            if valid.sum() < 10:
                continue
            # Drop all target columns before predict to avoid feature-name mismatch
            X_test = df_h[valid].drop(columns=target_cols, errors='ignore').copy()
            y_true = df_h[valid][f'{sensor}_target'].values
            y_pred = forecaster.predict(X_test)[sensor]
            n = min(len(y_true), len(y_pred))
            yt, yp = y_true[:n], y_pred[:n]
            mask = yt != 0
            mape = float(np.mean(np.abs((yt[mask] - yp[mask]) / yt[mask])) * 100) if mask.any() else 0.0
            results.append({
                'horizon': horizon, 'sensor': sensor,
                'MAE':  mean_absolute_error(yt, yp),
                'RMSE': np.sqrt(mean_squared_error(yt, yp)),
                'R2':   r2_score(yt, yp),
                'MAPE': mape,
                'samples': n,
            })
    return pd.DataFrame(results)


def run_forecasting_pipeline(data_path, output_dir, horizons=None):
    import os
    horizons = horizons or [15, 30, 60]
    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_csv(data_path)
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']

    print("=" * 60)
    print("FORECASTING RESULTS")
    print("=" * 60)

    print("\nComparing forecast horizons ...")
    hc = create_forecast_horizon_comparison(df, sensor_cols, horizons)
    hc.to_csv(os.path.join(output_dir, 'horizon_comparison.csv'), index=False)
    print(hc.to_string(index=False))

    print("\nFitting final model (15-min horizon) ...")
    forecaster = MultiSensorForecaster(forecast_horizon=15)
    forecaster.fit(df, sensor_cols)
    predictions = forecaster.predict(df)

    pred_df = df.copy()
    for sensor, preds in predictions.items():
        pad = [None] * (len(df) - len(preds))
        pred_df[f'{sensor}_predicted'] = pad + list(preds)
    pred_df.to_csv(os.path.join(output_dir, 'forecast_predictions.csv'), index=False)

    print("\nGenerating 5-step multi-step forecast ...")
    ms = forecaster.forecast_multi_step(df.tail(100), steps=5)
    ms_df = pd.DataFrame(ms)
    ms_df.index = [f'step_{i+1}' for i in range(len(ms_df))]
    ms_df.index.name = 'step'
    ms_df.to_csv(os.path.join(output_dir, 'multi_step_forecast.csv'))
    print(ms_df)

    print(f"\nForecasting complete. Results saved to: {output_dir}")
    return {'horizon_comparison': hc, 'predictions': pred_df,
            'multi_step': ms_df, 'forecaster': forecaster}


if __name__ == "__main__":
    import sys
    run_forecasting_pipeline(
        sys.argv[1] if len(sys.argv) > 1 else "DATA/environment_dataset.csv",
        sys.argv[2] if len(sys.argv) > 2 else "results/forecast"
    )
