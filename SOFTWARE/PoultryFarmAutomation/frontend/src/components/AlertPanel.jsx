export default function AlertPanel({ alerts }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-semibold">Smart Alerts</h2>
      {!alerts.length ? (
        <div className="text-sm text-slate-500">No active alerts</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, idx) => (
            <div key={idx} className="rounded-xl border p-3">
              <div className="font-semibold">
                {a.sensor} • {a.severity}
              </div>
              <div className="text-sm">{a.message}</div>
              <div className="mt-1 text-xs text-slate-500">
                {a.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
