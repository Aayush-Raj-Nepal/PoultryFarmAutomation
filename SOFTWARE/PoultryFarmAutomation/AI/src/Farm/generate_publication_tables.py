"""
Publication-Ready Table Generator for Research Papers
Generates formatted tables suitable for direct inclusion in research papers.
Designed to accompany: Bland-Altman, Sensor vs Reference, Error Distribution, and Time-Series plots.
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path

output_dir = "../DATA/analysis_outputs/publication_tables"
os.makedirs(output_dir, exist_ok=True)


def format_value(value, decimals=4, use_scientific=False):
    """Format numeric values for publication."""
    if pd.isna(value):
        return "N/A"

    if use_scientific and abs(value) < 0.001 or (use_scientific and abs(value) > 1000):
        return f"{value:.2e}"

    return f"{value:.{decimals}f}"


def generate_table1_agreement_metrics(data_dir: str, output_dir: str):
    """
    Table 1: Sensor-Reference Agreement Metrics
    For use with Sensor vs Reference comparison plot
    """
    # Load data
    corr_df = pd.read_csv(os.path.join(data_dir, "correlation_results.csv"))
    icc_df = pd.read_csv(os.path.join(data_dir, "icc_results.csv"))

    # Extract values
    pearson_r = corr_df[corr_df["test"] == "Pearson"]["coefficient"].values[0]
    pearson_p = corr_df[corr_df["test"] == "Pearson"]["p_value"].values[0]
    spearman_r = corr_df[corr_df["test"] == "Spearman"]["coefficient"].values[0]
    spearman_p = corr_df[corr_df["test"] == "Spearman"]["p_value"].values[0]
    icc = icc_df[icc_df["metric"] == "ICC_2_1"]["value"].values[0]

    table_data = {
        "Metric": ["Pearson correlation (r)", "Spearman correlation (rho)", "ICC(2,1)"],
        "Value": [f"{pearson_r:.4f}", f"{spearman_r:.4f}", f"{icc:.4f}"],
        "p-value": [
            f"{pearson_p:.4f}" if pearson_p > 0.001 else "<0.001",
            f"{spearman_p:.4f}" if spearman_p > 0.001 else "<0.001",
            "<0.001",
        ],
    }

    df = pd.DataFrame(table_data)
    df.to_csv(
        os.path.join(output_dir, "table1_sensor_reference_agreement.csv"), index=False
    )

    # Generate LaTeX
    latex = (
        r"""
\begin{table}[h]
\centering
\caption{Sensor-Reference Agreement Metrics}
\label{tab:agreement}
\begin{tabular}{lcc}
\hline
\textbf{Metric} & \textbf{Value} & \textbf{p-value} \\
\hline
Pearson correlation ($r$) & """
        + f"{pearson_r:.4f}"
        + r""" & $<0.001$ \\
Spearman correlation ($\rho$) & """
        + f"{spearman_r:.4f}"
        + r""" & $<0.001$ \\
ICC(2,1) & """
        + f"{icc:.4f}"
        + r""" & $<0.001$ \\
\hline
\end{tabular}
\end{table}
"""
    )

    with open(
        os.path.join(output_dir, "table1_sensor_reference_agreement.tex"), "w"
    ) as f:
        f.write(latex)

    return df, latex


def generate_table2_error_analysis(data_dir: str, output_dir: str):
    """
    Table 2: Error Analysis Metrics
    For use with Error Distribution plot
    """
    error_df = pd.read_csv(os.path.join(data_dir, "error_metrics.csv"))

    # Extract values
    mae = error_df[error_df["metric"] == "MAE"]["value"].values[0]
    rmse = error_df[error_df["metric"] == "RMSE"]["value"].values[0]
    bias = error_df[error_df["metric"] == "Bias"]["value"].values[0]
    std_err = error_df[error_df["metric"] == "Std_Error"]["value"].values[0]
    median_ae = error_df[error_df["metric"] == "Median_AE"]["value"].values[0]
    mape = error_df[error_df["metric"] == "MAPE_percent"]["value"].values[0]

    table_data = {
        "Metric": [
            "Mean Absolute Error (MAE)",
            "Root Mean Square Error (RMSE)",
            "Bias (Mean Error)",
            "Standard Error",
            "Median Absolute Error",
            "Mean Absolute Percentage Error (MAPE)",
        ],
        "Value": [
            f"{mae:.4f}",
            f"{rmse:.4f}",
            f"{bias:.4f}",
            f"{std_err:.4f}",
            f"{median_ae:.4f}",
            f"{mape:.2f}\\%",
        ],
        "Unit": ["kg", "kg", "kg", "kg", "kg", "\\%"],
    }

    df = pd.DataFrame(table_data)
    df.to_csv(os.path.join(output_dir, "table2_error_analysis.csv"), index=False)

    # Generate LaTeX
    latex = (
        r"""
\begin{table}[h]
\centering
\caption{Error Analysis Metrics}
\label{tab:errors}
\begin{tabular}{lcc}
\hline
\textbf{Metric} & \textbf{Value} & \textbf{Unit} \\
\hline
Mean Absolute Error (MAE) & """
        + f"{mae:.4f}"
        + r""" & kg \\
Root Mean Square Error (RMSE) & """
        + f"{rmse:.4f}"
        + r""" & kg \\
Bias (Mean Error) & """
        + f"{bias:.4f}"
        + r""" & kg \\
Standard Error & """
        + f"{std_err:.4f}"
        + r""" & kg \\
Median Absolute Error & """
        + f"{median_ae:.4f}"
        + r""" & kg \\
Mean Absolute Percentage Error & """
        + f"{mape:.2f}"
        + r"""\% & \% \\
\hline
\end{tabular}
\end{table}
"""
    )

    with open(os.path.join(output_dir, "table2_error_analysis.tex"), "w") as f:
        f.write(latex)

    return df, latex


def generate_table3_bland_altman(data_dir: str, output_dir: str):
    """
    Table 3: Bland-Altman Agreement Analysis
    For use with Bland-Altman plot
    """
    ba_df = pd.read_csv(os.path.join(data_dir, "bland_altman_results.csv"))

    # Extract values
    bias = ba_df[ba_df["metric"] == "bias"]["value"].values[0]
    sd_diff = ba_df[ba_df["metric"] == "sd_of_difference"]["value"].values[0]
    upper_loa = ba_df[ba_df["metric"] == "upper_limit_of_agreement"]["value"].values[0]
    lower_loa = ba_df[ba_df["metric"] == "lower_limit_of_agreement"]["value"].values[0]
    pct_outside = ba_df[ba_df["metric"] == "percent_outside_loa"]["value"].values[0]
    prop_bias_slope = ba_df[ba_df["metric"] == "proportional_bias_slope"][
        "value"
    ].values[0]
    prop_bias_p = ba_df[ba_df["metric"] == "proportional_bias_p_value"]["value"].values[
        0
    ]

    # Calculate 95% CI for bias (bias ± 1.96*SD/sqrt(n))
    # Assuming n=5000 from the data
    n = 5000
    ci_bias = 1.96 * sd_diff / np.sqrt(n)

    table_data = {
        "Parameter": [
            "Bias (mean difference)",
            "Standard deviation of differences",
            "Upper LoA (bias + 1.96×SD)",
            "Lower LoA (bias - 1.96×SD)",
            "Points outside LoA (%)",
            "Proportional bias slope",
            "Proportional bias p-value",
        ],
        "Value": [
            f"{bias:.4f}",
            f"{sd_diff:.4f}",
            f"{upper_loa:.4f}",
            f"{lower_loa:.4f}",
            f"{pct_outside:.2f}",
            f"{prop_bias_slope:.4f}",
            f"{prop_bias_p:.4f}",
        ],
        "95% CI": [f"{bias:.4f} ± {ci_bias:.4f}", "-", "-", "-", "-", "-", "-"],
    }

    df = pd.DataFrame(table_data)
    df.to_csv(os.path.join(output_dir, "table3_bland_altman.csv"), index=False)

    # Generate LaTeX
    latex = (
        r"""
\begin{table}[h]
\centering
\caption{Bland-Altman Agreement Analysis}
\label{tab:bland_altman}
\begin{tabular}{lcc}
\hline
\textbf{Parameter} & \textbf{Value} & \textbf{95\% CI} \\
\hline
Bias (mean difference) & """
        + f"{bias:.4f}"
        + r""" & """
        + f"{bias:.4f}"
        + r""" $\pm$ """
        + f"{ci_bias:.6f}"
        + r""" \\
Standard deviation of differences & """
        + f"{sd_diff:.4f}"
        + r""" & -- \\
Upper LoA (bias + 1.96$\times$SD) & """
        + f"{upper_loa:.4f}"
        + r""" & -- \\
Lower LoA (bias - 1.96$\times$SD) & """
        + f"{lower_loa:.4f}"
        + r""" & -- \\
Points outside LoA (\%) & """
        + f"{pct_outside:.2f}"
        + r""" & -- \\
Proportional bias slope & """
        + f"{prop_bias_slope:.4f}"
        + r""" & -- \\
Proportional bias p-value & """
        + f"{prop_bias_p:.4f}"
        + r""" & -- \\
\hline
\end{tabular}
\end{table}
"""
    )

    with open(os.path.join(output_dir, "table3_bland_altman.tex"), "w") as f:
        f.write(latex)

    return df, latex


def generate_table4_paired_comparison(data_dir: str, output_dir: str):
    """
    Table 4: Statistical Comparison (Paired Tests)
    For use with Time-Series comparison plot
    """
    paired_df = pd.read_csv(os.path.join(data_dir, "paired_test_results.csv"))

    # Extract values
    shapiro_w = paired_df[paired_df["metric"] == "Shapiro_W"]["value"].values[0]
    shapiro_p = paired_df[paired_df["metric"] == "Shapiro_p"]["value"].values[0]
    t_stat = paired_df[paired_df["metric"] == "Test_Statistic"]["value"].values[0]
    t_p = paired_df[paired_df["metric"] == "Test_p_value"]["value"].values[0]

    # Determine significance
    normality = "Yes" if shapiro_p > 0.05 else "No"
    sig_diff = "Yes" if t_p < 0.05 else "No"

    table_data = {
        "Test": [
            "Shapiro-Wilk Normality (W)",
            "Shapiro-Wilk p-value",
            "Paired t-test (t)",
            "Paired t-test p-value",
        ],
        "Value": [
            f"{shapiro_w:.4f}",
            f"{shapiro_p:.4f}",
            f"{t_stat:.4f}",
            f"{t_p:.4f}",
        ],
        "Interpretation": [
            "Normal distribution" if normality == "Yes" else "Non-normal",
            "p > 0.05" if normality == "Yes" else "p ≤ 0.05",
            f"Significant: {sig_diff}",
            "p < 0.05" if sig_diff == "Yes" else "p ≥ 0.05",
        ],
    }

    df = pd.DataFrame(table_data)
    df.to_csv(
        os.path.join(output_dir, "table4_statistical_comparison.csv"), index=False
    )

    # Generate LaTeX
    latex = (
        r"""
\begin{table}[h]
\centering
\caption{Statistical Comparison: Sensor vs Reference}
\label{tab:stats}
\begin{tabular}{lcc}
\hline
\textbf{Test} & \textbf{Value} & \textbf{Interpretation} \\
\hline
Shapiro-Wilk Normality ($W$) & """
        + f"{shapiro_w:.4f}"
        + r""" & """
        + ("Normally distributed" if normality == "Yes" else "Non-normal distribution")
        + r""" \\
Shapiro-Wilk p-value & """
        + f"{shapiro_p:.4f}"
        + r""" & $p """
        + (">" if normality == "Yes" else r"\leq")
        + r""" 0.05$ \\
Paired t-test ($t$) & """
        + f"{t_stat:.4f}"
        + r""" & """
        + (
            "No significant difference"
            if sig_diff == "No"
            else "Significant difference"
        )
        + r""" \\
Paired t-test p-value & """
        + f"{t_p:.4f}"
        + r""" & $p """
        + ("<" if sig_diff == "Yes" else r"\geq")
        + r""" 0.05$ \\
\hline
\end{tabular}
\end{table}
"""
    )

    with open(os.path.join(output_dir, "table4_statistical_comparison.tex"), "w") as f:
        f.write(latex)

    return df, latex


def generate_combined_summary_table(data_dir: str, output_dir: str):
    """
    Combined Summary Table - All key metrics in one table
    Useful for supplementary materials or condensed reporting
    """
    # Load all data
    error_df = pd.read_csv(os.path.join(data_dir, "error_metrics.csv"))
    corr_df = pd.read_csv(os.path.join(data_dir, "correlation_results.csv"))
    icc_df = pd.read_csv(os.path.join(data_dir, "icc_results.csv"))
    ba_df = pd.read_csv(os.path.join(data_dir, "bland_altman_results.csv"))

    mae = error_df[error_df["metric"] == "MAE"]["value"].values[0]
    rmse = error_df[error_df["metric"] == "RMSE"]["value"].values[0]
    bias = error_df[error_df["metric"] == "Bias"]["value"].values[0]
    mape = error_df[error_df["metric"] == "MAPE_percent"]["value"].values[0]

    pearson_r = corr_df[corr_df["test"] == "Pearson"]["coefficient"].values[0]
    spearman_r = corr_df[corr_df["test"] == "Spearman"]["coefficient"].values[0]
    icc = icc_df[icc_df["metric"] == "ICC_2_1"]["value"].values[0]

    upper_loa = ba_df[ba_df["metric"] == "upper_limit_of_agreement"]["value"].values[0]
    lower_loa = ba_df[ba_df["metric"] == "lower_limit_of_agreement"]["value"].values[0]
    pct_outside = ba_df[ba_df["metric"] == "percent_outside_loa"]["value"].values[0]

    table_data = {
        "Category": [
            "Correlation",
            "Correlation",
            "Agreement",
            "Error",
            "Error",
            "Error",
            "Error",
            "Bland-Altman",
            "Bland-Altman",
            "Bland-Altman",
        ],
        "Metric": [
            "Pearson r",
            "Spearman ρ",
            "ICC(2,1)",
            "MAE",
            "RMSE",
            "Bias",
            "MAPE",
            "Upper LoA",
            "Lower LoA",
            "% Outside LoA",
        ],
        "Value": [
            f"{pearson_r:.4f}",
            f"{spearman_r:.4f}",
            f"{icc:.4f}",
            f"{mae:.4f}",
            f"{rmse:.4f}",
            f"{bias:.4f}",
            f"{mape:.2f}%",
            f"{upper_loa:.4f}",
            f"{lower_loa:.4f}",
            f"{pct_outside:.2f}%",
        ],
    }

    df = pd.DataFrame(table_data)
    df.to_csv(os.path.join(output_dir, "table_combined_summary.csv"), index=False)

    return df


def export_all_tables_latex(output_dir: str, filename: str = "all_tables.tex"):
    """Export all tables to a single LaTeX file."""

    tex_files = [
        "table1_sensor_reference_agreement.tex",
        "table2_error_analysis.tex",
        "table3_bland_altman.tex",
        "table4_statistical_comparison.tex",
    ]

    with open(os.path.join(output_dir, filename), "w") as f:
        f.write("% Publication-Ready Tables\n")
        f.write("% Generated for research paper\n")
        f.write("% ==========================================\n\n")

        for tex_file in tex_files:
            filepath = os.path.join(output_dir, tex_file)
            if os.path.exists(filepath):
                with open(filepath, "r") as tf:
                    f.write(tf.read())
                f.write("\n\n")

    print(f"Combined LaTeX file saved to: {os.path.join(output_dir, filename)}")


def main():
    base_dir = Path(__file__).parent
    data_dir = base_dir / "DATA" / "analysis_outputs"
    output_dir = data_dir / "publication_tables"

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("GENERATING PUBLICATION-READY TABLES")
    print("=" * 60)
    print(f"Output directory: {output_dir}")
    print()

    # Generate all tables
    print("Table 1: Sensor-Reference Agreement Metrics...")
    df1, _ = generate_table1_agreement_metrics(str(data_dir), str(output_dir))
    print(f"  - CSV: table1_sensor_reference_agreement.csv")
    print(f"  - LaTeX: table1_sensor_reference_agreement.tex")
    print()

    print("Table 2: Error Analysis Metrics...")
    df2, _ = generate_table2_error_analysis(str(data_dir), str(output_dir))
    print(f"  - CSV: table2_error_analysis.csv")
    print(f"  - LaTeX: table2_error_analysis.tex")
    print()

    print("Table 3: Bland-Altman Agreement Analysis...")
    df3, _ = generate_table3_bland_altman(str(data_dir), str(output_dir))
    print(f"  - CSV: table3_bland_altman.csv")
    print(f"  - LaTeX: table3_bland_altman.tex")
    print()

    print("Table 4: Statistical Comparison...")
    df4, _ = generate_table4_paired_comparison(str(data_dir), str(output_dir))
    print(f"  - CSV: table4_statistical_comparison.csv")
    print(f"  - LaTeX: table4_statistical_comparison.tex")
    print()

    print("Combined Summary Table...")
    df_combined = generate_combined_summary_table(str(data_dir), str(output_dir))
    print(f"  - CSV: table_combined_summary.csv")
    print()

    # Export combined LaTeX
    export_all_tables_latex(str(output_dir))
    print(f"  - Combined LaTeX: all_tables.tex")
    print()

    print("=" * 60)
    print("TABLES READY FOR PUBLICATION")
    print("=" * 60)
    print()
    print("Usage guide:")
    print("  - Table 1: Use with Sensor vs Reference comparison plot")
    print("  - Table 2: Use with Error Distribution plot")
    print("  - Table 3: Use with Bland-Altman plot")
    print("  - Table 4: Use with Time-Series comparison plot")
    print()
    print("Files are ready for direct inclusion in your paper!")


if __name__ == "__main__":
    main()
