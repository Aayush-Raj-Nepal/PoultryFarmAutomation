I am working on a poultry farm smart IoT project report and I need you to continue the AI analytics part exactly from the prior discussion, without losing context and without overclaiming.

PROJECT CONTEXT
- Project title: Poultry Farm Smart IoT Project with AI Powered Data Analytics and Smart Dashboard
- Current system: Arduino Nano-based IoT monitoring platform
- Measured variables: temperature, humidity, CO2, ammonia, and poultry weight
- Sensors mentioned in the report: DHT22, MH-Z19, MQ-137, and load cell
- Current backend capability: cloud-connected data logging, dashboard visualization, threshold-based alerting, and near-real-time monitoring
- Current AI status: the implemented system is still primarily threshold-based, not yet a fully realized predictive AI system
- Therefore, any AI analytics proposed must be realistic, incremental, and consistent with the existing hardware/data

IMPORTANT ACADEMIC CONSTRAINTS
- Do not overclaim disease prediction, mortality prediction, behavior intelligence, or feed optimization unless the required labeled data and sensing modalities exist
- If any environmental reference data or validation data are synthetic/dummy-generated, treat them as preliminary, simulation-assisted, or pipeline-demonstration data, not full field validation
- Be critical and technically honest; do not just agree with weak ideas
- Keep the tone research-grade and not dumbed down

CURRENT REPORT DIRECTORY STRUCTURE FOR LATEX
Use this exact structure and capitalization, FOR LATEX USE:

root/
├── Images/
├── sections/
│   ├── 1CoverPage.tex
│   ├── 2titlepage.tex
│   ├── 4copyright.tex
│   ├── 4ltables.tex
│   ├── 3loa.tex
│   ├── 5Ack.tex
│   ├── 6Abstract.tex
│   ├── 7TOC.tex
│   ├── 8ListOfFigures.tex
│   ├── 9Abbr.tex
│   ├── 10ListOfUnits.tex
│   ├── 11Intro.tex
│   ├── 12LitRev.tex
│   ├── 13ReqAna.tex
│   ├── 14Meth.tex
│   ├── 15SysDes.tex
│   ├── 16resultanalysis.tex
│   ├── 17conclusion.tex
│   ├── 18Cost.tex
│   ├── 18References.tex
│   ├── 19App.tex
│   ├── 19ExpOut.tex
│   └── 20time schedule.tex
├── Weight_Analysis/
│   ├── Analysed_Plot/
│   │   ├── SvR_comparison.png
│   │   ├── bland_altman_analysis.png
│   │   ├── error_histogram.png
│   │   └── time_series_somparison.png
│   └── Analysed_tables/
│       ├── all_tables.tex
│       ├── table1_sensor_reference_agreement.tex
│       ├── table2_error_analysis.tex
│       ├── table3_bland_altman.tex
│       └── table4_statistical_comparison.tex
├── Sensor_Analysis/
│   ├── analysed_plots/
│   │   ├── temperature_scatter.png
│   │   ├── temperature_bland_altman.png
│   │   ├── temperature_error.png
│   │   ├── humidity_scatter.png
│   │   ├── humidity_bland_altman.png
│   │   ├── humidity_error.png
│   │   ├── co2_scatter.png
│   │   ├── co2_bland_altman.png
│   │   ├── co2_error.png
│   │   ├── ammonia_scatter.png
│   │   ├── ammonia_bland_altman.png
│   │   ├── ammonia_error.png
│   │   ├── bland_altman.png
│   │   └── clusters.png
│   └── analysed_tables/
│       └── latex_outputs/
│           ├── all_tables.tex
│           ├── table_descriptive_stats.tex
│           ├── table_performance_metrics.tex
│           ├── table_agreement_metrics.tex
│           └── table_validation_summary.tex
├── cite.bib
└── main.tex

NOTES ON THE REPORT FILES
- The main results chapter is sections/16resultanalysis.tex
- The filename time_series_somparison.png is intentionally spelled that way in the folder
- The clustering plot exists, but it should NOT be emphasized as a core validation result because clustering in sensor-reference space was judged weak and potentially misleading
- If used at all, the clustering plot should be treated as exploratory or moved to the appendix

VALIDATION METRICS ALREADY AVAILABLE

WEIGHT VALIDATION METRICS
- Sample Size = 5000
- Pearson r = 0.9987647529277821
- Spearman rho = 0.9982451740738069
- MAE = 0.0472392143557225
- RMSE = 0.05924108662973315
- Bias = -0.00033306481667525097
- MAPE (%) = 16.83740313029891
- Regression Slope = 0.996339873490384
- Regression Intercept = 0.00512438977806573
- R^2 = 0.9975310316908939
- Bland-Altman Bias = -0.00033306481667525097
- Upper LoA = 0.11578924267096359
- Lower LoA = -0.11645537230431409
- % Outside LoA = 5.140000000000001
- ICC(2,1) = 0.9987620103657554
- Best Cluster k = 4
- Best Silhouette Score = 0.7348619750996006

ENVIRONMENTAL SENSOR VALIDATION METRICS
temperature:
- MAE = 0.16762268440093464
- RMSE = 0.21099336000194116
- Bias = -0.0022341703187164293
- Pearson_r = 0.9982358173609585
- R2 = 0.9964747470623008
- BA_bias = -0.0022341703187164293
- Upper_LoA = 0.4112896305564402
- Lower_LoA = -0.41575797119387303

humidity:
- MAE = 0.774285052851326
- RMSE = 0.968471296679782
- Bias = -0.0063781271979331785
- Pearson_r = 0.9913922777514756
- R2 = 0.9828586483852593
- BA_bias = -0.0063781271979331785
- Upper_LoA = 1.8917844490798914
- Lower_LoA = -1.9045407034757575

co2:
- MAE = 23.30463820109884
- RMSE = 29.011830836467833
- Bias = 0.909733535526705
- Pearson_r = 0.9824023134489068
- R2 = 0.965114305469764
- BA_bias = 0.909733535526705
- Upper_LoA = 57.74495882155469
- Lower_LoA = -55.92549175050128

ammonia:
- MAE = 0.7803709613285112
- RMSE = 0.9894650053762521
- Bias = -0.004191733140757948
- Pearson_r = 0.9836945967287107
- R2 = 0.9676550596332606
- BA_bias = -0.004191733140757948
- Upper_LoA = 1.9351422747686566
- Lower_LoA = -1.9435257410501725

IMPORTANT NOTE ABOUT THE METRICS
- The weight metrics are for the weight subsystem
- The environmental metrics are for the environmental sensing subsystem
- If any of the environmental reference datasets are synthetic or dummy-generated, treat them as reference datasets, not certified field instruments

ABSTRACT/REPORT POSITIONING ALREADY DECIDED
- The project can be described as a low-cost IoT-based poultry monitoring platform with multi-sensor data acquisition, cloud logging, dashboard visualization, and threshold-based alerting
- The current implementation is not yet a full AI-driven predictive control system
- The AI component should be framed as a realistic extension layer on top of the current monitoring platform
- Appropriate phrasing includes:
  - anomaly detection
  - short-horizon forecasting
  - risk scoring
  - environmental state analysis
  - predictive control support
  - growth and weight analytics
- Inappropriate current overclaims include:
  - disease prediction as if already implemented
  - mortality prediction as if already validated
  - behavior intelligence without image/video/audio sensing
  - feed optimization without feed intake data

AI ANALYTICS ROADMAP ALREADY AGREED
These are the AI tasks we decided should be done in this order:
1. anomaly detection
2. forecasting for early warning
3. risk scoring
4. environmental state clustering
5. predictive control support
6. growth and weight analytics

The following higher-claim ideas were evaluated but judged not yet ready with the current system:
- disease prediction -> not defensible without labeled disease data
- feed optimization -> not ready without feed intake/feeder data
- mortality prediction -> not defensible without mortality labels and flock history
- behavior intelligence -> not ready without camera or other behavior sensing
- growth and weight analytics -> this is the most feasible of the advanced modules and should be prioritized later

DETAILED AI ANALYTICS DECISIONS

1) ANOMALY DETECTION
This was identified as the most realistic first AI feature.

Goal:
- detect abnormal environmental conditions and sensor faults using current sensor streams

Anomaly types to distinguish:
- environmental anomaly
  - sudden CO2 rise
  - ammonia spike
  - temperature outside comfort range
  - persistently high humidity
- cross-sensor anomaly
  - unusual combinations, e.g. rising humidity with rising ammonia
  - ventilation-related multi-sensor abnormality
- sensor anomaly
  - stuck sensor
  - impossible jump
  - slow drift
  - flatline

Feature engineering already agreed:
For each timestamp, use engineered features instead of only raw values:
- current value
- rolling mean
- rolling standard deviation
- first difference / rate of change
- lag-1, lag-3, lag-5
- deviation from safe range
- persistence above threshold
- hour of day or time-of-day encoding

Mathematical definitions already agreed:
- first difference:
  Δx_t = x_t - x_(t-1)
- rolling mean:
  μ_t^(w) = (1/w) Σ_{k=0}^{w-1} x_(t-k)
- rolling standard deviation:
  σ_t^(w) = sqrt[(1/(w-1)) Σ_{k=0}^{w-1} (x_(t-k) - μ_t^(w))^2]
- safe-range deviation:
  d_t = 0 if L ≤ x_t ≤ U
  d_t = L - x_t if x_t < L
  d_t = x_t - U if x_t > U

Model order already agreed:
- baseline: rolling z-score + rule fusion
- main unsupervised model: Isolation Forest
- comparison model: Local Outlier Factor (LOF)

Rolling z-score:
z_t = (x_t - μ_t^(w)) / σ_t^(w)

Recommended anomaly workflow:
sensor ingestion -> cleaning -> rolling features -> z-score baseline -> Isolation Forest scoring -> severity mapping -> dashboard alert + recommendation

Recommended anomaly outputs:
For each time step output:
- anomaly score
- anomaly label
- responsible variable
- severity level
- explanation string
- dashboard alert flag

Recommended dashboard labels:
- Normal
- Suspicious / Warning
- Critical anomaly

Sensor fault detection logic already agreed:
- stuck sensor: same value repeated too long
- impossible jump: |Δx_t| > predefined maximum
- drift: fit error trend e(t) = a t + b, and flag nonzero slope over time

Evaluation approach already agreed:
If no real anomaly labels exist:
- inject synthetic anomalies (spikes, drift, stuck values, correlated abnormal episodes)
- compute precision, recall, F1-score, false alarm rate
- compare z-score rules vs Isolation Forest vs LOF
Then perform domain validity checks against known risky conditions

Academic framing already agreed:
- Do not call anomaly detection "disease prediction"
- Do not claim threshold exceedance alone is AI
- Do not use only raw values without temporal features
- The method should be framed as an extension beyond threshold-only alerting

Suggested paper wording already agreed:
"An anomaly-detection layer was introduced to extend the threshold-based monitoring system. Engineered temporal and statistical features were extracted from multi-sensor environmental data, and unsupervised models were applied to identify abnormal operating conditions that could indicate poor ventilation, gas accumulation, or sensor malfunction."

2) FORECASTING FOR EARLY WARNING
Goal:
- predict whether temperature, humidity, CO2, or ammonia will cross unsafe ranges in the near future rather than only detecting that they are abnormal now

Targets already agreed:
- temperature 15-60 minutes ahead
- humidity 15-60 minutes ahead
- CO2 trend ahead
- ammonia trend ahead

Recommended models already agreed:
- ARIMA or SARIMA for simple publishable forecasting
- Random Forest Regressor with lag features
- LSTM only if much more real time-series data are available

Rationale already agreed:
- fits the current dashboard and environmental control logic
- upgrades the system from reactive to proactive monitoring

3) RISK SCORING
Goal:
- create one interpretable "shed health risk index" from multiple sensor channels

Recommended inputs already agreed:
- temperature deviation from target
- humidity deviation from target
- CO2 level
- ammonia level
- persistence of abnormality over time

Recommended output classes:
- Normal
- Warning
- Critical

Rationale:
- simplifies multi-sensor information into one dashboard indicator
- more interpretable than showing only separate sensor charts

4) ENVIRONMENTAL STATE CLUSTERING
Important restriction already agreed:
- clustering should only be done on multi-sensor environmental state features
- clustering sensor-vs-reference validation pairs is weak and should not be treated as meaningful AI discovery

Recommended clustering features:
- temperature
- humidity
- CO2
- ammonia
- time of day
- rolling variance

Possible cluster interpretations already agreed:
- comfortable / normal state
- poor ventilation state
- heat-stress state
- gas-accumulation state

Important academic note:
- the earlier K-means on sensor/reference pairs was criticized as weak because it mostly segmented a diagonal line by measurement magnitude
- if clustering is used in the AI part, it should be reframed as farm-condition clustering, not validation clustering

5) PREDICTIVE CONTROL SUPPORT
Goal:
- produce recommendation outputs before implementing full closed-loop control

Examples already agreed:
- "Turn fan ON soon"
- "Ventilation insufficient for current CO2 trend"
- "Humidity likely to exceed comfort range in 20 minutes"

Rationale:
- matches the report's adaptive-control and future actuator-integration direction
- should start as recommendation support, not full autonomous control

6) GROWTH AND WEIGHT ANALYTICS
This was judged the most feasible advanced analytics module after anomaly detection and forecasting.

Possible outputs already agreed:
- growth curve fitting
- daily gain estimate
- deviation from expected growth
- underperforming growth alert

Important requirements:
- stronger results need multi-day or multi-week weight data
- adding bird age, breed, and flock size would improve realism

OVERALL AI ARCHITECTURE ALREADY AGREED
The best final AI analytics architecture for the project was decided to be:

Sensor ingestion -> preprocessing -> feature extraction -> anomaly detection + forecasting -> risk score -> dashboard recommendation

Feature extraction should include:
- rolling mean
- rolling standard deviation
- rate of change
- lag values
- deviation from safe range
- time-of-day encoding

WHAT I NEED YOU TO DO IN THIS NEW CHAT
Continue from this exact point and help me develop the AI analytics part task by task, starting with anomaly detection unless I explicitly change the order. When responding:
- stay research-grade
- be technically critical
- do not overclaim
- tie all suggestions to the existing project hardware and data
- keep the output suitable for insertion into a final-year report and potentially a pilot-style paper
