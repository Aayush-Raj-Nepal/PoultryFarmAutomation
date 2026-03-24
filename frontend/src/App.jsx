import { useEffect, useState } from "react";
import axios from "axios";
import StatCard from "./components/StatCard";
import AlertPanel from "./components/AlertPanel";
import ChartCard from "./components/ChartCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:10000";

export default function App() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [prediction, setPrediction] = useState(null);

  async function loadData() {
    try {
      const [latestRes, historyRes, summaryRes, alertsRes, predictionRes] =
        await Promise.all([
          axios.get(`${API}/api/readings/latest`),
          axios.get(`${API}/api/readings?limit=120`),
          axios.get(`${API}/api/analytics/summary`),
          axios.get(`${API}/api/analytics/alerts`),
          axios.get(`${API}/api/analytics/prediction`),
        ]);

      setLatest(latestRes.data);
      setHistory(historyRes.data);
      setSummary(summaryRes.data);
      setAlerts(alertsRes.data.slice(0, 5));
      setPrediction(predictionRes.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  const chartData = history.map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: Number(r.temperature_c),
    humidity: Number(r.humidity_pct),
    co2: Number(r.co2_ppm),
    light: Number(r.light_lux),
    weight: Number(r.weight_kg),
  }));

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-4xl">
              Poultry Farm Smart IoT Dashboard
            </h1>
            <p className="text-sm text-slate-500 md:text-base">
              AI Powered Data Analytics and Smart Monitoring
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 shadow">
            <div className="text-sm font-medium">
              {latest
                ? `Last update: ${new Date(latest.recorded_at).toLocaleString()}`
                : "Loading..."}
            </div>
          </div>
        </div>

        {latest && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Temperature"
              value={latest.temperature_c}
              unit="°C"
              subtitle="Live"
            />
            <StatCard
              title="Humidity"
              value={latest.humidity_pct}
              unit="%"
              subtitle="Live"
            />
            <StatCard
              title="CO2"
              value={latest.co2_ppm}
              unit="ppm"
              subtitle="Live"
            />
            <StatCard
              title="Light"
              value={latest.light_lux}
              unit="lux"
              subtitle="Live"
            />
            <StatCard
              title="Feed Weight"
              value={latest.weight_kg}
              unit="kg"
              subtitle="Live"
            />
            <StatCard
              title="Comfort Score"
              value={latest.comfort_score}
              unit="/100"
              subtitle="AI-based derived score"
            />
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertPanel alerts={alerts} />
          </div>
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">Prediction</h2>
            {prediction ? (
              <div className="space-y-2 text-sm">
                <div>
                  Predicted CO2 after short interval:{" "}
                  <span className="font-semibold">
                    {prediction.predicted_co2_30min} ppm
                  </span>
                </div>
                <div>
                  Trend status:{" "}
                  <span className="font-semibold">{prediction.status}</span>
                </div>
                <div className="text-slate-500">
                  {prediction.recommendation}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                Loading prediction...
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Temperature Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Humidity Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="humidity" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="CO2 Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="co2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Feed Weight Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="weight" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {summary && (
          <div className="mt-6 rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">24-Hour Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4 xl:grid-cols-7">
              <div>
                Avg Temp:{" "}
                <span className="font-semibold">{summary.avg_temp}</span>
              </div>
              <div>
                Avg Humidity:{" "}
                <span className="font-semibold">{summary.avg_humidity}</span>
              </div>
              <div>
                Avg Light:{" "}
                <span className="font-semibold">{summary.avg_light}</span>
              </div>
              <div>
                Avg CO2:{" "}
                <span className="font-semibold">{summary.avg_co2}</span>
              </div>
              <div>
                Avg Weight:{" "}
                <span className="font-semibold">{summary.avg_weight}</span>
              </div>
              <div>
                Max CO2:{" "}
                <span className="font-semibold">{summary.max_co2}</span>
              </div>
              <div>
                Min Weight:{" "}
                <span className="font-semibold">{summary.min_weight}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
