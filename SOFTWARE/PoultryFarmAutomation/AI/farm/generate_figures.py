"""
Publication-quality figures for the AI Analytics chapter.
Generates 4 PNG files in plots/:
  fig1_anomaly_detection.png
  fig2_forecasting.png
  fig3_risk_scoring.png
  fig4_clustering.png
"""
import os, sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
from matplotlib.ticker import MaxNLocator
import seaborn as sns

os.makedirs('plots', exist_ok=True)

# ── Style ──────────────────────────────────────────────────────────────────────
plt.rcParams.update({
    'font.family':      'DejaVu Sans',
    'font.size':        10,
    'axes.titlesize':   11,
    'axes.labelsize':   10,
    'xtick.labelsize':  9,
    'ytick.labelsize':  9,
    'legend.fontsize':  9,
    'figure.dpi':       150,
    'axes.spines.top':  False,
    'axes.spines.right':False,
    'axes.grid':        True,
    'grid.alpha':       0.3,
    'grid.linewidth':   0.5,
})
BLUE   = '#2C7BB6'
RED    = '#D7191C'
GREEN  = '#1A9641'
ORANGE = '#FDAE61'
GREY   = '#636363'
PALETTE = [BLUE, GREEN, ORANGE, RED]

sensor_cols  = ['temperature','humidity','co2','ammonia']
sensor_units = {'temperature':'°C','humidity':'%RH','co2':'ppm','ammonia':'ppm'}
sensor_label = {'temperature':'Temperature','humidity':'Humidity',
                'co2':'CO$_2$','ammonia':'NH$_3$'}

# ═══════════════════════════════════════════════════════════════════════════════
# FIGURE 1 — Anomaly Detection
# ═══════════════════════════════════════════════════════════════════════════════
anom_pred = pd.read_csv('results/anomaly/predictions.csv', parse_dates=['timestamp'])
anom_met  = pd.read_csv('results/anomaly/metrics.csv')
df_full   = pd.read_csv('DATA/environment_dataset.csv', parse_dates=['timestamp'])

fig = plt.figure(figsize=(14,10))
gs  = gridspec.GridSpec(3, 2, figure=fig, hspace=0.45, wspace=0.35)

# (a) CO2 time series with event shading and ensemble detections
ax1 = fig.add_subplot(gs[0, :])
t  = np.arange(len(anom_pred))
co2_test = anom_pred['co2'].values
ax1.plot(t, co2_test, color=BLUE, lw=0.8, label='CO$_2$ (ppm)', zorder=2)
# shade true events
event_on = False; ev_start = 0
ev = anom_pred['true_event'].values
for i in range(len(ev)):
    if ev[i]==1 and not event_on:  ev_start=i; event_on=True
    if ev[i]==0 and event_on:
        ax1.axvspan(ev_start, i, alpha=0.18, color=RED, label='_nolegend_')
        event_on=False
if event_on: ax1.axvspan(ev_start, len(ev), alpha=0.18, color=RED)
# mark ensemble detections
det_idx = np.where(anom_pred['ens_pred'].values==1)[0]
ax1.scatter(det_idx, co2_test[det_idx], marker='v', color=RED, s=18,
            zorder=3, label='Ensemble detection')
ax1.axhline(800,  color=ORANGE, lw=1.2, ls='--', label='Optimal upper (800 ppm)')
ax1.axhline(1500, color=RED,    lw=1.2, ls='--', label='Critical upper (1500 ppm)')
red_patch = mpatches.Patch(color=RED, alpha=0.2, label='Known event window')
ax1.add_artist(ax1.legend(handles=[red_patch]+ax1.get_legend_handles_labels()[0],
               loc='upper right', framealpha=0.85, fontsize=8))
ax1.set_xlabel('Time step (minutes, test set)'); ax1.set_ylabel('CO$_2$ (ppm)')
ax1.set_title('(a) CO$_2$ sensor readings with known event windows and ensemble anomaly detections')
ax1.set_xlim(0, len(t))

# (b) Ensemble anomaly score over time
ax2 = fig.add_subplot(gs[1, 0])
score = anom_pred['ens_score'].values
ax2.plot(score, color=BLUE, lw=0.7, alpha=0.85)
ax2.axhline(0.45, color=RED, lw=1.2, ls='--', label='Decision threshold (0.45)')
ax2.fill_between(range(len(score)), score, 0.45,
                 where=score>0.45, alpha=0.35, color=RED, label='Flagged region')
ax2.set_xlabel('Time step'); ax2.set_ylabel('Ensemble anomaly score')
ax2.set_title('(b) Ensemble anomaly score')
ax2.legend(fontsize=8, framealpha=0.85)
ax2.set_ylim(0, 1); ax2.set_xlim(0, len(score))

# (c) F1-score comparison bar chart
ax3 = fig.add_subplot(gs[1, 1])
methods = anom_met['method'].tolist()
f1s     = anom_met['f1_score'].tolist()
bars    = ax3.bar(methods, f1s, color=PALETTE, width=0.55, edgecolor='white', lw=0.8)
for bar, v in zip(bars, f1s):
    ax3.text(bar.get_x()+bar.get_width()/2, v+0.01, f'{v:.3f}',
             ha='center', va='bottom', fontsize=9, fontweight='bold')
ax3.set_ylabel('F1-Score'); ax3.set_ylim(0, 1.05)
ax3.set_title('(c) F1-Score by detection method')
ax3.tick_params(axis='x', rotation=15)

# (d) Precision–Recall trade-off scatter
ax4 = fig.add_subplot(gs[2, 0])
for i, row in anom_met.iterrows():
    ax4.scatter(row['recall'], row['precision'], s=90, color=PALETTE[i], zorder=3,
                edgecolors='white', lw=0.8)
    ax4.annotate(row['method'], (row['recall'], row['precision']),
                 textcoords='offset points', xytext=(6,4), fontsize=8)
ax4.set_xlabel('Recall'); ax4.set_ylabel('Precision')
ax4.set_title('(d) Precision–Recall comparison')
ax4.set_xlim(-0.05,1.1); ax4.set_ylim(-0.05,1.1)
ax4.plot([0,1],[1,0], ls=':', color=GREY, lw=0.8, alpha=0.5)

# (e) False alarm rate comparison
ax5 = fig.add_subplot(gs[2, 1])
bars2 = ax5.bar(methods, anom_met['false_alarm_rate'].tolist(),
                color=PALETTE, width=0.55, edgecolor='white', lw=0.8)
for bar, v in zip(bars2, anom_met['false_alarm_rate'].tolist()):
    ax5.text(bar.get_x()+bar.get_width()/2, v+0.0003, f'{v:.4f}',
             ha='center', va='bottom', fontsize=8)
ax5.set_ylabel('False Alarm Rate'); ax5.set_ylim(0, max(anom_met['false_alarm_rate'])*1.3+0.005)
ax5.set_title('(e) False alarm rate by detection method')
ax5.tick_params(axis='x', rotation=15)

fig.suptitle('Figure 1: Anomaly Detection Results — AI Analytics Layer',
             fontsize=13, fontweight='bold', y=1.01)
fig.savefig('plots/fig1_anomaly_detection.png', dpi=150, bbox_inches='tight')
plt.close(fig)
print("fig1 saved")

# ═══════════════════════════════════════════════════════════════════════════════
# FIGURE 2 — Forecasting
# ═══════════════════════════════════════════════════════════════════════════════
hc       = pd.read_csv('results/forecast/horizon_comparison.csv')
pred_df  = pd.read_csv('results/forecast/predictions.csv', parse_dates=['timestamp'])

fig = plt.figure(figsize=(14,10))
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.42, wspace=0.35)

# (a)-(d) Actual vs Predicted for each sensor at 15-min horizon (last 500 pts)
for idx, sensor in enumerate(sensor_cols):
    ax = fig.add_subplot(gs[idx//2, idx%2])
    pred_col = f'{sensor}_pred'
    sub = pred_df[[sensor, pred_col]].dropna().tail(500)
    x   = np.arange(len(sub))
    ax.plot(x, sub[sensor].values,    color=BLUE,   lw=1.2,  label='Actual',    zorder=2)
    ax.plot(x, sub[pred_col].values,  color=RED,    lw=1.0,  ls='--',
            label='Predicted (15 min)', zorder=3, alpha=0.85)
    # metrics box
    row = hc[(hc['sensor']==sensor)&(hc['horizon']==15)].iloc[0]
    ax.text(0.98, 0.04,
            f"MAE={row['MAE']:.3f}  R²={row['R2']:.4f}",
            transform=ax.transAxes, ha='right', va='bottom', fontsize=8,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    ax.set_xlabel('Time step'); ax.set_ylabel(f"{sensor_label[sensor]} ({sensor_units[sensor]})")
    ax.set_title(f"({'abcd'[idx]}) {sensor_label[sensor]} — actual vs predicted")
    ax.legend(fontsize=8, framealpha=0.85, loc='upper left')

fig.suptitle('Figure 2: Multi-Sensor Forecasting Performance (15-minute horizon)',
             fontsize=13, fontweight='bold', y=1.01)
fig.savefig('plots/fig2_forecasting.png', dpi=150, bbox_inches='tight')
plt.close(fig)
print("fig2 saved")

# ═══════════════════════════════════════════════════════════════════════════════
# FIGURE 3 — Forecast Horizon Degradation + Risk Scoring
# ═══════════════════════════════════════════════════════════════════════════════
risk_df = pd.read_csv('results/risk/risk_scores.csv', parse_dates=['timestamp'])

fig = plt.figure(figsize=(14,10))
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.42, wspace=0.35)

# (a) R² vs horizon for all sensors
ax1 = fig.add_subplot(gs[0, 0])
for i, sensor in enumerate(sensor_cols):
    sub = hc[hc['sensor']==sensor].sort_values('horizon')
    ax1.plot(sub['horizon'], sub['R2'], marker='o', color=PALETTE[i],
             lw=1.5, ms=6, label=sensor_label[sensor])
ax1.set_xlabel('Forecast horizon (minutes)'); ax1.set_ylabel('R²')
ax1.set_title('(a) Forecast accuracy vs horizon')
ax1.set_xticks([15,30,60]); ax1.set_ylim(0, 1.05)
ax1.legend(fontsize=8, framealpha=0.85)

# (b) MAE vs horizon
ax2 = fig.add_subplot(gs[0, 1])
for i, sensor in enumerate(sensor_cols):
    sub = hc[hc['sensor']==sensor].sort_values('horizon')
    ax2.plot(sub['horizon'], sub['MAE'], marker='s', color=PALETTE[i],
             lw=1.5, ms=6, label=sensor_label[sensor])
ax2.set_xlabel('Forecast horizon (minutes)'); ax2.set_ylabel('MAE')
ax2.set_title('(b) MAE degradation vs horizon')
ax2.set_xticks([15,30,60])
ax2.legend(fontsize=8, framealpha=0.85)

# (c) Composite risk score timeline
ax3 = fig.add_subplot(gs[1, :])
t_risk = np.arange(len(risk_df))
comp   = risk_df['composite_risk'].values
ax3.fill_between(t_risk, comp, 0, color=BLUE, alpha=0.45, label='Composite risk score')
ax3.axhline(0.25, color=ORANGE, lw=1.3, ls='--', label='Warning threshold (0.25)')
ax3.axhline(0.50, color=RED,    lw=1.3, ls='--', label='Critical threshold (0.50)')
# shade Warning regions
warn_mask = risk_df['risk_level']=='Warning'
if warn_mask.any():
    ax3.fill_between(t_risk, 0, 1, where=warn_mask.values,
                     alpha=0.25, color=ORANGE, label='Warning period')
ax3.set_xlabel('Time step (minutes)'); ax3.set_ylabel('Composite risk score (0–1)')
ax3.set_title('(c) Shed Health Risk Index — full 7-day monitoring period')
ax3.set_ylim(0, 0.7); ax3.set_xlim(0, len(t_risk))
ax3.legend(fontsize=8, framealpha=0.85, loc='upper right')
normal_pct  = 100*(risk_df['risk_level']=='Normal').mean()
warning_pct = 100*(risk_df['risk_level']=='Warning').mean()
ax3.text(0.01, 0.93, f"Normal: {normal_pct:.1f}%    Warning: {warning_pct:.1f}%",
         transform=ax3.transAxes, fontsize=9,
         bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.85))

fig.suptitle('Figure 3: Forecast Horizon Degradation and Risk Scoring',
             fontsize=13, fontweight='bold', y=1.01)
fig.savefig('plots/fig3_risk_scoring.png', dpi=150, bbox_inches='tight')
plt.close(fig)
print("fig3 saved")

# ═══════════════════════════════════════════════════════════════════════════════
# FIGURE 4 — Environmental State Clustering
# ═══════════════════════════════════════════════════════════════════════════════
from sklearn.decomposition import PCA
cl_df      = pd.read_csv('results/risk/data_with_states.csv', parse_dates=['timestamp'])
cl_profile = pd.read_csv('results/risk/cluster_profiles.csv', index_col=0)
# Keep only numeric sensor columns for PCA
feat_cols = ['temperature','humidity','co2','ammonia']
unique_labels = cl_df['cluster_label'].unique()
label_colors  = {lbl: PALETTE[i] for i,lbl in enumerate(unique_labels)}

fig = plt.figure(figsize=(14,9))
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.42, wspace=0.38)

# (a) PCA 2-D scatter coloured by cluster
ax1 = fig.add_subplot(gs[0, 0])
pca  = PCA(n_components=2, random_state=42)
Xpca = pca.fit_transform(cl_df[feat_cols].values)
for lbl in unique_labels:
    mask = cl_df['cluster_label']==lbl
    ax1.scatter(Xpca[mask,0], Xpca[mask,1], s=4, alpha=0.4,
                color=label_colors[lbl], label=lbl, rasterized=True)
ax1.set_xlabel(f'PC1 ({100*pca.explained_variance_ratio_[0]:.1f}% var)')
ax1.set_ylabel(f'PC2 ({100*pca.explained_variance_ratio_[1]:.1f}% var)')
ax1.set_title('(a) Cluster membership — PCA projection')
ax1.legend(fontsize=7, markerscale=3, framealpha=0.85)

# (b) Cluster distribution bar
ax2 = fig.add_subplot(gs[0, 1])
counts = cl_df['cluster_label'].value_counts()
bars = ax2.bar(range(len(counts)), counts.values,
               color=[label_colors[l] for l in counts.index],
               edgecolor='white', lw=0.8, width=0.6)
ax2.set_xticks(range(len(counts)))
ax2.set_xticklabels([l.replace('/','/\n') for l in counts.index], fontsize=8)
ax2.set_ylabel('Sample count'); ax2.set_title('(b) Cluster sample distribution')
for bar, v in zip(bars, counts.values):
    ax2.text(bar.get_x()+bar.get_width()/2, v+20, f'{v:,}',
             ha='center', va='bottom', fontsize=8)

# (c) Cluster profile heatmap (sensor means normalised 0-1)
ax3 = fig.add_subplot(gs[1, 0])
profile_sub = cl_profile[feat_cols].copy()
profile_norm = (profile_sub - profile_sub.min()) / (profile_sub.max() - profile_sub.min() + 1e-9)
sns.heatmap(profile_norm.T, annot=profile_sub.T.round(1), fmt='.1f',
            cmap='YlOrRd', ax=ax3, linewidths=0.5, linecolor='white',
            cbar_kws={'label':'Normalised mean value', 'shrink':0.8},
            annot_kws={'size':9})
ax3.set_xlabel('Cluster ID'); ax3.set_ylabel('Sensor')
ax3.set_title('(c) Mean sensor values per cluster (annotated)')
ax3.set_yticklabels(['Temp','Humidity','CO$_2$','NH$_3$'], rotation=0)

# (d) Temperature vs CO2 scatter coloured by cluster
ax4 = fig.add_subplot(gs[1, 1])
for lbl in unique_labels:
    mask = cl_df['cluster_label']==lbl
    ax4.scatter(cl_df.loc[mask,'temperature'], cl_df.loc[mask,'co2'],
                s=4, alpha=0.35, color=label_colors[lbl], label=lbl, rasterized=True)
ax4.set_xlabel('Temperature (°C)'); ax4.set_ylabel('CO$_2$ (ppm)')
ax4.set_title('(d) Temperature vs CO$_2$ — cluster separation')
ax4.legend(fontsize=7, markerscale=3, framealpha=0.85)

fig.suptitle('Figure 4: Environmental State Clustering (K-Means, k=4)',
             fontsize=13, fontweight='bold', y=1.01)
fig.savefig('plots/fig4_clustering.png', dpi=150, bbox_inches='tight')
plt.close(fig)
print("fig4 saved")
print("All figures complete.")
