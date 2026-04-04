# Claude Code Prompt for Integrating AI Analytics into the SmartFlock Online Dashboard

## What this file is for

This document gives you a **production-oriented prompt** to paste into Claude Code so it can inspect the existing SmartFlock repository and integrate the current AI analytics pipeline into the online dashboard.

The prompt is written to match the current project reality:

- The project is **SmartFlock**, a poultry farm smart IoT system with cloud logging, dashboard visualization, and threshold-based monitoring.
- The current AI work is **incremental and realistic**, not a fully autonomous predictive intelligence stack.
- The AI analytics already developed around the project are centered on:
  - **Anomaly detection**
  - **Short-horizon forecasting**
  - **Interpretable risk scoring**
  - **Exploratory environmental state clustering**
- The dashboard integration should therefore focus on **analytics, monitoring insights, and operator decision support**, not exaggerated claims such as disease prediction, mortality prediction, feed optimization, or behavior intelligence unless the codebase already contains real supporting data and labels.

This file also includes **implementation guidance**, **architectural expectations**, and a **copy-paste prompt** for Claude Code.

---

## Project-aware context Claude should follow

Claude should work from the existing repository structure rather than inventing a new one. Based on the provided working tree, the important areas are:

```text
C:\Users\dipes\OneDrive\Documents\Machine Learning\Python\GJ_Poultry
├── source/
│   ├── Images/
│   ├── sections/
│   ├── Sensor_Analysis/
│   └── Weight_Analysis/
├── src/
│   ├── Farm/
│   │   ├── ai_analytics_revisited/
│   │   │   ├── plots/
│   │   │   ├── results/
│   │   │   ├── tables/
│   │   │   └── __pycache__/
│   │   ├── DATA/
│   │   │   └── analysis_outputs/
│   │   ├── Farm_Sensors/
│   │   └── Farm_Weights/
│   └── Hatchery/
└── WEB_INTEGRATION/
    ├── arduino/
    ├── frontend/
    │   ├── src/
    │   └── dist/
    └── node_modules/
```

### Practical interpretation of the structure

- `WEB_INTEGRATION/frontend/` appears to be the main **online dashboard frontend**.
- `WEB_INTEGRATION/` also appears to contain the **web integration layer**, likely including the server-side integration pieces.
- `src/Farm/ai_analytics_revisited/` appears to be the best candidate location for the **Python analytics outputs and reusable AI logic**.
- `src/Farm/DATA/analysis_outputs/` likely stores result artifacts, generated tables, and analytical outputs.
- `source/sections/` and the report structure should be treated as the **academic source of truth** for how the system is described in the thesis.

---

## Integration philosophy Claude should follow

Claude should integrate AI into the dashboard in a way that is:

1. **Consistent with the actual report and codebase**
2. **Safe and maintainable**
3. **Incremental instead of overengineered**
4. **Honest about what is real-time vs offline vs batch-generated**

### What should be integrated into the dashboard

The dashboard should prioritize these analytics features:

- **Anomaly detection panel**
  - show recent anomalies
  - show anomaly score / anomaly label
  - highlight affected variable(s)
  - distinguish likely sensor issue vs environmental abnormality when possible

- **Forecasting panel**
  - short-horizon forecasts for temperature, humidity, CO2, and ammonia
  - show current value, predicted near-future value, and trend direction
  - keep the horizon short and practical

- **Risk scoring panel**
  - compute and display a single interpretable environmental risk score
  - map to levels such as Normal / Warning / Critical
  - show contributing sensor variables

- **Historical analytics panel**
  - show charts, recent trends, model outputs, and generated analytical summaries
  - reuse existing outputs where appropriate instead of rebuilding everything from scratch

- **Exploratory clustering panel (optional)**
  - only include if already present in the code and easy to expose
  - clearly mark as exploratory
  - do not present clustering as a core validation result or operational decision rule

### What should NOT be overclaimed

Claude must avoid implementing or marketing features that the current project does not support well, such as:

- disease prediction
- mortality prediction
- feed optimization
- behavior intelligence
- flock health diagnosis from labels that do not exist
- autonomous control claims that are stronger than the actual code and hardware

---

## Recommended technical direction

Claude should inspect the existing `WEB_INTEGRATION` stack first and then choose the **least disruptive workable integration pattern**.

### Preferred integration order

Claude should prefer this decision order:

1. **Reuse existing backend if one already exists in `WEB_INTEGRATION`**
2. If the backend is JavaScript/Node-based, expose AI analytics through one of these patterns:
   - run Python scripts as child processes and return structured JSON
   - or create a lightweight local Python API service only if necessary
3. Keep data flow simple and observable
4. Avoid heavy infrastructure unless the repo already uses it

### Preferred data flow

A good integration path is:

1. dashboard/backend receives or reads latest sensor data
2. backend prepares structured input for analytics
3. Python analytics module runs on recent data window or stored historical data
4. outputs are normalized to JSON
5. frontend consumes results through API endpoints
6. dashboard renders cards, trends, warnings, and historical views

### Data contract Claude should aim for

Claude should normalize incoming records to a structure similar to:

```json
{
  "timestamp": "2026-03-31T10:15:00Z",
  "temperature": 28.4,
  "humidity": 63.2,
  "co2": 845,
  "ammonia": 6.8,
  "weight": 1.42
}
```

If weight is not part of the live dashboard feed, that is acceptable. The environmental AI pipeline can be integrated first and weight analytics can remain report-oriented or historical until a stable live data path exists.

---

## What Claude Code should deliver

Claude should not stop at high-level ideas. It should produce concrete implementation work.

### Minimum expected deliverables

1. **Repo inspection summary**
   - identify frontend app entry
   - identify backend/server entry
   - identify where live data currently comes from
   - identify where AI code already exists and what is reusable

2. **Integration plan**
   - explain chosen architecture
   - explain why it fits the repo
   - list file-by-file changes before editing

3. **Backend integration**
   - add AI analytics endpoints such as:
     - `GET /api/analytics/summary`
     - `GET /api/analytics/anomalies`
     - `GET /api/analytics/forecast`
     - `GET /api/analytics/risk`
   - or adapt existing route patterns if the repo already has a different convention

4. **Python integration layer**
   - wrap current Python analytics into reusable CLI or function entry points
   - ensure outputs are JSON-serializable
   - return stable schema
   - handle errors gracefully

5. **Frontend dashboard integration**
   - add analytics cards/charts/panels to the online dashboard
   - include loading state, error state, and stale-data state
   - clearly distinguish live telemetry from AI-derived outputs

6. **Persistence / caching**
   - avoid recomputing heavy analytics on every UI refresh if not necessary
   - cache most recent analytics results if appropriate

7. **Documentation**
   - explain how to run locally
   - explain dependencies
   - explain how to test endpoints and dashboard features

### Stretch deliverables if the repo supports them

- analytics refresh scheduler
- CSV/history upload for retrospective analytics
- downloadable AI summary card or report snapshot
- alert escalation rules informed by anomaly + risk score together

---

## Constraints Claude must respect

Claude should follow these constraints strictly:

- Do not rewrite the whole dashboard from scratch.
- Do not migrate the stack unless absolutely necessary.
- Do not invent datasets or labels.
- Do not silently change the thesis framing.
- Keep the AI integration aligned with the report’s conservative position.
- Separate **environmental analytics** from **weight validation** unless a real shared live pipeline already exists.
- If a result is exploratory, label it as exploratory.
- If a computation depends on historical data windows, explain that clearly in the UI and docs.

---

## How Claude should reason about existing AI modules

Claude should inspect the Python code under `src/Farm/ai_analytics_revisited/` and related modules first, and determine:

- what functions already run successfully
- what outputs are already saved under `plots/`, `results/`, and `tables/`
- which pieces are batch-oriented versus reusable in dashboard requests
- whether analytics should be computed:
  - on demand,
  - on a scheduled refresh,
  - or from previously generated outputs

Claude should favor **wrapping existing working logic** rather than reimplementing models from scratch.

---

## Expected UI behavior

Claude should aim for the following user-visible dashboard experience:

### Analytics summary strip

A top-level analytics summary should show:

- current risk level
- number of anomalies in recent window
- forecast outlook status
- last analytics refresh timestamp

### Anomaly card

Should show:

- recent anomaly events
- severity
- affected parameter(s)
- timestamp
- optional explanation string

### Forecast card

Should show:

- recent trend line
- next short horizon prediction
- direction arrow or compact status label
- per-variable forecast where applicable

### Risk card

Should show:

- composite risk score
- severity band
- contributing variables
- practical recommended action text if available

### Historical analytics page

Should show:

- charts from recent environmental history
- anomaly overlay
- forecast overlay
- risk trend over time

---

## Testing expectations Claude should include

Claude should add or describe tests for:

- backend endpoint response shape
- invalid data handling
- missing sensor values
- empty dataset behavior
- frontend rendering when analytics data is unavailable
- Python process failure handling
- stale cache / stale result handling

Claude should also validate that the system still works when AI analytics are temporarily unavailable, so the baseline dashboard continues to function.

---

## Copy-paste prompt for Claude Code

Paste the following directly into Claude Code:

```md
You are working inside my existing SmartFlock repository. Your job is to integrate the current AI analytics pipeline into the online dashboard in a way that is realistic, maintainable, and consistent with the report and existing codebase.

## Project context you must follow

This project is a poultry farm smart IoT platform with:
- Arduino Nano-based sensing and data acquisition
- cloud-connected monitoring
- online dashboard visualization
- threshold-based alerting
- near-real-time monitoring
- AI analytics that are incremental and decision-support oriented, not overclaimed

The measured variables include:
- temperature
- humidity
- CO2
- ammonia
- poultry weight

The report and prior work position the AI layer conservatively. You must NOT overclaim:
- disease prediction
- mortality prediction
- behavior intelligence
- feed optimization
- fully autonomous control
unless the existing repo already contains genuine supporting data, labels, and implementation.

The analytics that ARE valid to integrate are:
- anomaly detection
- short-horizon forecasting
- interpretable risk scoring
- exploratory environmental state clustering (optional, low emphasis)

## Repository structure to respect

Important areas of the repo include:
- `WEB_INTEGRATION/` for the online dashboard and integration layer
- `WEB_INTEGRATION/frontend/` for the frontend app
- `src/Farm/ai_analytics_revisited/` for AI analytics outputs/code
- `src/Farm/DATA/analysis_outputs/` for generated analysis artifacts
- `source/sections/` and report materials as the academic source of truth for system framing

Do not rewrite the whole project. Work with the existing structure.

## Your objectives

1. Inspect the repository and identify:
   - frontend entry points
   - backend/server entry points
   - where sensor data currently enters the dashboard flow
   - reusable AI analytics code and outputs

2. Design the least disruptive integration architecture.
   Prefer reusing the existing backend. If the backend is Node/Express, then either:
   - call Python analytics from the backend as child processes and exchange JSON, or
   - introduce a very small Python API only if necessary.
   Do not introduce unnecessary infrastructure.

3. Implement dashboard-ready AI analytics integration for:
   - anomaly detection
   - short-horizon forecasting
   - interpretable risk scoring
   - optional exploratory clustering if already easy to expose

4. Keep environmental analytics and weight analytics logically separate unless the existing code already has a genuine shared live pipeline.

5. Add backend endpoints or equivalent integration points for analytics such as:
   - analytics summary
   - recent anomalies
   - forecast data
   - risk score data

6. Update the frontend dashboard to show:
   - analytics summary strip
   - anomaly panel
   - forecast panel
   - risk panel
   - historical analytics views if feasible

7. Make the UI robust:
   - loading state
   - empty state
   - error state
   - stale-data indication
   - graceful fallback when AI service is unavailable

8. Reuse existing Python analytics code where possible rather than rebuilding models.

9. Normalize outputs to a stable JSON schema.

10. Add documentation explaining:
   - architecture
   - file changes
   - run steps
   - dependencies
   - testing steps

## Required working style

Before editing, inspect the repo and give me:
- a short architecture summary
- the exact files you plan to modify
- the integration strategy you chose and why

Then implement in small, reviewable steps.
Do not make unsupported academic claims in comments, labels, or UI text.
Use language like:
- analytics
- monitoring insights
- anomaly alerts
- short-term forecast
- risk score
- decision support
Avoid inflated language like disease diagnosis or smart health prediction unless the repo already truly supports it.

## Expected output quality

I want actual implementation, not just suggestions.
At the end, provide:
- changed file list
- run instructions
- test instructions
- known limitations
- next recommended improvements

Now inspect the repository and start with the integration plan.
```

---

## Suggested way to use this with Claude Code

You can use the prompt above in one of two ways:

### Option 1: Use it directly

Paste only the **copy-paste prompt** section into Claude Code.

### Option 2: Use this whole file as the operating brief

Give Claude this entire `.md` file and say:

> Use this file as the implementation brief. Inspect the repo, decide the safest architecture, and integrate the AI analytics into the online dashboard without overclaiming unsupported AI features.

---

## Final note

This prompt is intentionally strict because your project is already in a good place academically: it has a real IoT monitoring base, credible validation of sensing components, and realistic AI extensions. The best integration is one that makes the dashboard **more useful and more insightful** while staying faithful to what the system actually does.
