function formatValue(value, digits = 1) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(num);
}

function getAlertTone(severity) {
  const normalized = String(severity || "").toLowerCase();

  if (normalized === "high") {
    return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
  }

  if (normalized === "medium") {
    return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
}

export default function LatestReadingPanel({ latest, formattedTimestamp }) {
  if (!latest) {
    return (
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
          Latest Reading
        </div>
        <div className="mt-3 text-sm text-slate-500">Loading latest data...</div>
      </div>
    );
  }

  const metrics = [
    { label: "Temperature", value: formatValue(latest.temperature_c), unit: "°C" },
    { label: "Humidity", value: formatValue(latest.humidity_pct), unit: "%" },
    { label: "CO2", value: formatValue(latest.co2_ppm, 0), unit: "ppm" },
    { label: "Light", value: formatValue(latest.light_lux, 0), unit: "lux" },
    { label: "Feed Weight", value: formatValue(latest.weight_kg, 2), unit: "kg" },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-[28px] bg-slate-950 text-slate-50 shadow-xl">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(250,204,21,0.18),_transparent_26%)] p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Latest Reading
            </div>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
              Most recent farm conditions
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Refreshed from the newest database entry and formatted for the current
              browser locale.
            </p>
            <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              {formattedTimestamp}
            </div>
          </div>

          <div className="grid min-w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {metric.value}
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    {metric.unit}
                  </span>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">
                Comfort Score
              </div>
              <div className="mt-2 text-3xl font-semibold text-cyan-50">
                {formatValue(latest.comfort_score, 0)}
                <span className="ml-1 text-sm font-medium text-cyan-100/80">
                  /100
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Record Timestamp
            </div>
            <div className="mt-1 text-sm text-slate-200">
              {formattedTimestamp.replace("Last update:", "").trim()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {latest.alerts?.length ? (
              latest.alerts.map((alert, index) => (
                <span
                  key={`${alert.sensor}-${index}`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getAlertTone(alert.severity)}`}
                  title={alert.message}
                >
                  {alert.sensor}: {alert.severity}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                No active alerts
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
