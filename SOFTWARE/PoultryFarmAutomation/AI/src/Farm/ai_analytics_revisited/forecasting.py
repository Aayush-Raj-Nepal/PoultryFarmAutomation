"""
Forecasting Module for Poultry Farm IoT
Implements ARIMA, Random Forest, and comparison for multi-sensor forecasting.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')


class TimeSeriesFeatures:
    """
    Create lag features and time-based features for forecasting.
    """

    def __init__(self, lags=[1, 2, 3, 5, 10, 15]):
        self.lags = lags
        self.scalers = {}

    def create_features(self, df, target_col, exog_cols=None):
        """
        Create features for forecasting.

        Args:
            df: dataframe with time series
            target_col: column to forecast
            exog_cols: additional exogenous variables

        Returns:
            X: feature matrix
            y: target values
        """
        df_feat = df.copy()

        # Lag features for target
        for lag in self.lags:
            df_feat[f'{target_col}_lag{lag}'] = df_feat[target_col].shift(lag)

        # Rolling statistics
        df_feat[f'{target_col}_rolling_mean'] = df_feat[target_col].rolling(window=5, min_periods=1).mean()
        df_feat[f'{target_col}_rolling_std'] = df_feat[target_col].rolling(window=5, min_periods=1).std()

        # Difference features
        df_feat[f'{target_col}_diff1'] = df_feat[target_col].diff()
        df_feat[f'{target_col}_diff2'] = df_feat[target_col].diff(2)

        # Time features
        if 'timestamp' in df_feat.columns:
            df_feat['timestamp'] = pd.to_datetime(df_feat['timestamp'])
            df_feat['hour'] = df_feat['timestamp'].dt.hour
            df_feat['minute'] = df_feat['timestamp'].dt.minute
            df_feat['hour_sin'] = np.sin(2 * np.pi * df_feat['hour'] / 24)
            df_feat['hour_cos'] = np.cos(2 * np.pi * df_feat['hour'] / 24)

        # Add exogenous variables with lags
        if exog_cols:
            for col in exog_cols:
                for lag in [1, 2, 3]:
                    df_feat[f'{col}_lag{lag}'] = df_feat[col].shift(lag)

        # Drop rows with NaN from lagging
        df_feat = df_feat.dropna()

        # Separate features and target
        feature_cols = [c for c in df_feat.columns if c != target_col and not c.startswith('timestamp')]
        X = df_feat[feature_cols]
        y = df_feat[target_col]

        return X, y, feature_cols


class MultiSensorForecaster:
    """
    Multi-step forecasting for all environmental sensors.
    """

    def __init__(self, forecast_horizon=15, model_type='rf'):
        """
        Initialize forecaster.

        Args:
            forecast_horizon: minutes ahead to predict
            model_type: 'rf' (Random Forest), 'arima', or 'ensemble'
        """
        self.forecast_horizon = forecast_horizon
        self.model_type = model_type
        self.models = {}
        self.scalers = {}
        self.feature_engineers = {}
        self.feature_cols = {}

    def fit(self, df, sensor_cols, exog_cols=None):
        """
        Fit forecasting models for all sensors.

        Args:
            df: training data
            sensor_cols: sensors to forecast
            exog_cols: other sensors to use as exogenous variables
        """
        self.sensor_cols = sensor_cols
        self.exog_cols = exog_cols or [c for c in sensor_cols]

        for sensor in sensor_cols:
            # Create features
            fe = TimeSeriesFeatures(lags=[1, 2, 3, 5, 10, 15])

            # Use other sensors as exogenous
            other_sensors = [c for c in self.exog_cols if c != sensor]
            X, y, feature_cols = fe.create_features(df, sensor, other_sensors)

            self.feature_engineers[sensor] = fe
            self.feature_cols[sensor] = feature_cols

            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            self.scalers[sensor] = scaler

            # Fit model
            if self.model_type == 'rf':
                model = RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1
                )
                model.fit(X_scaled, y)
                self.models[sensor] = model

        return self

    def predict(self, df):
        """
        Make predictions for all sensors.

        Returns:
            predictions: dict with predictions for each sensor
        """
        predictions = {}

        for sensor in self.sensor_cols:
            fe = self.feature_engineers[sensor]
            scaler = self.scalers[sensor]
            model = self.models[sensor]

            other_sensors = [c for c in self.exog_cols if c != sensor]
            X, _, feature_cols = fe.create_features(df, sensor, other_sensors)

            # Keep the exact training feature order and ignore extra columns
            expected_cols = self.feature_cols[sensor]
            X = X.reindex(columns=expected_cols)

            X_scaled = scaler.transform(X)
            y_pred = model.predict(X_scaled)
            predictions[sensor] = y_pred

        return predictions

    def forecast_multi_step(self, df, steps=5):
        """
        Multi-step ahead forecasting using recursive strategy.

        Args:
            df: input data
            steps: number of steps to forecast

        Returns:
            forecasts: dict with multi-step forecasts for each sensor
        """
        forecasts = {sensor: [] for sensor in self.sensor_cols}

        # Start with historical data
        history = df.copy()

        for step in range(steps):
            # Predict next step
            preds = self.predict(history)

            for sensor in self.sensor_cols:
                forecasts[sensor].append(preds[sensor][-1])

            # Append predictions to history for next iteration
            new_row = history.iloc[-1:].copy()
            for sensor in self.sensor_cols:
                new_row[sensor] = preds[sensor][-1]
            history = pd.concat([history, new_row], ignore_index=True)

        return forecasts

    def evaluate(self, df, y_true_dict):
        """
        Evaluate forecasting performance.

        Args:
            df: input data
            y_true_dict: dict with true values for each sensor

        Returns:
            metrics: DataFrame with metrics for each sensor
        """
        predictions = self.predict(df)
        metrics_list = []

        for sensor in self.sensor_cols:
            if sensor in y_true_dict:
                y_true = y_true_dict[sensor]
                y_pred = predictions[sensor]

                # Align lengths
                min_len = min(len(y_true), len(y_pred))
                y_true = y_true[:min_len]
                y_pred = y_pred[:min_len]

                mae = mean_absolute_error(y_true, y_pred)
                rmse = np.sqrt(mean_squared_error(y_true, y_pred))
                r2 = r2_score(y_true, y_pred)

                metrics_list.append({
                    'sensor': sensor,
                    'MAE': mae,
                    'RMSE': rmse,
                    'R2': r2,
                    'MAPE': self._mape(y_true, y_pred)
                })

        return pd.DataFrame(metrics_list)

    def _mape(self, y_true, y_pred):
        """Mean Absolute Percentage Error."""
        y_true, y_pred = np.array(y_true), np.array(y_pred)
        mask = y_true != 0
        return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def create_forecast_horizon_comparison(df, sensor_cols, horizons=[15, 30, 60]):
    """
    Compare forecasting performance at different horizons.

    Args:
        df: input data
        sensor_cols: sensors to forecast
        horizons: list of forecast horizons to compare

    Returns:
        comparison: DataFrame with metrics for each horizon/sensor combination
    """
    results = []

    for horizon in horizons:
        # Create target: value at horizon steps ahead
        df_horizon = df.copy()

        for sensor in sensor_cols:
            # Shift target by horizon steps
            df_horizon[f'{sensor}_target_{horizon}'] = df_horizon[sensor].shift(-horizon)

        # Fit forecaster
        forecaster = MultiSensorForecaster(forecast_horizon=horizon)
        forecaster.fit(df, sensor_cols)

        # Evaluate
        for sensor in sensor_cols:
            target_col = f'{sensor}_target_{horizon}'
            valid_mask = ~df_horizon[target_col].isna()

            if valid_mask.sum() > 10:
                X_test = df_horizon.loc[valid_mask].copy()
                y_true = X_test[target_col].values

                # Remove future target columns before feature generation to prevent leakage
                helper_cols = [c for c in X_test.columns if '_target_' in c]
                X_test = X_test.drop(columns=helper_cols, errors='ignore')

                # Get predictions
                preds = forecaster.predict(X_test)
                y_pred = preds[sensor]

                # Align
                min_len = min(len(y_true), len(y_pred))
                y_true = y_true[:min_len]
                y_pred = y_pred[:min_len]

                mae = mean_absolute_error(y_true, y_pred)
                rmse = np.sqrt(mean_squared_error(y_true, y_pred))
                r2 = r2_score(y_true, y_pred)

                mape = np.mean(np.abs((y_true[y_true != 0] - y_pred[y_true != 0]) / y_true[y_true != 0])) * 100 if np.any(y_true != 0) else np.nan

                results.append({
                    'horizon': horizon,
                    'sensor': sensor,
                    'MAE': mae,
                    'RMSE': rmse,
                    'R2': r2,
                    'MAPE': mape,
                    'samples': len(y_true)
                })

    return pd.DataFrame(results)


def run_forecasting_pipeline(data_path, output_dir, horizons=[15, 30, 60]):
    """
    Run complete forecasting pipeline.

    Args:
        data_path: path to environment dataset
        output_dir: directory to save results
        horizons: forecast horizons to evaluate

    Returns:
        results: dict with all forecasting results
    """
    import os
    import json

    os.makedirs(output_dir, exist_ok=True)

    # Load data
    df = pd.read_csv(data_path)
    sensor_cols = ['temperature', 'humidity', 'co2', 'ammonia']

    print("=" * 60)
    print("FORECASTING RESULTS")
    print("=" * 60)

    # Horizon comparison
    print("\nComparing forecast horizons...")
    horizon_comparison = create_forecast_horizon_comparison(df, sensor_cols, horizons)

    # Save horizon comparison
    horizon_comparison.to_csv(os.path.join(output_dir, 'horizon_comparison.csv'), index=False)

    # Print summary
    print("\nForecast Horizon Comparison:")
    print(horizon_comparison.to_string(index=False))

    # Fit final model with best horizon (15 min for early warning)
    print("\nFitting final forecasting models (15-min horizon)...")
    forecaster = MultiSensorForecaster(forecast_horizon=15, model_type='rf')
    forecaster.fit(df, sensor_cols)

    # Generate predictions
    predictions = forecaster.predict(df)

    # Save predictions
    pred_df = df.copy()
    for sensor, preds in predictions.items():
        # Align predictions with original data (predictions are shorter due to lag features)
        pred_df[f'{sensor}_predicted'] = [None] * (len(df) - len(preds)) + list(preds)

    pred_df.to_csv(os.path.join(output_dir, 'forecast_predictions.csv'), index=False)

    # Multi-step forecast example
    print("\nGenerating 5-step multi-step forecast...")
    multi_step = forecaster.forecast_multi_step(df.tail(100), steps=5)

    multi_step_df = pd.DataFrame(multi_step)
    multi_step_df.index = [f'step_{i+1}' for i in range(len(multi_step_df))]
    multi_step_df.to_csv(os.path.join(output_dir, 'multi_step_forecast.csv'))

    # Print multi-step forecast
    print("\nMulti-step forecast (next 5 time steps):")
    print(multi_step_df.tail())

    print("\n" + "=" * 60)
    print("Forecasting complete!")
    print(f"Results saved to: {output_dir}")
    print("=" * 60)

    return {
        'horizon_comparison': horizon_comparison,
        'predictions': pred_df,
        'multi_step': multi_step_df,
        'forecaster': forecaster
    }


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "DATA/environment_dataset.csv"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "ai_analytics/forecast_results"

    run_forecasting_pipeline(data_path, output_dir)
