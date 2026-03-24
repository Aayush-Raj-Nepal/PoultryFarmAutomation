export default function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="h-72 w-full">{children}</div>
    </div>
  );
}
