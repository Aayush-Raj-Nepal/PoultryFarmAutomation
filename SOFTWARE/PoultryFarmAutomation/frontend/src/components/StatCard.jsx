export default function StatCard({ title, value, unit, subtitle }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold">
        {value}{" "}
        <span className="text-base font-medium text-slate-500">{unit}</span>
      </div>
      <div className="mt-2 text-xs text-slate-400">{subtitle}</div>
    </div>
  );
}
