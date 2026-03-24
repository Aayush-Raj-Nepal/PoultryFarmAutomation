import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import ChartCard from "../components/ChartCard";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";

const timeRanges = [
  { label: "Last 1h", value: 1 },
  { label: "Last 6h", value: 6 },
  { label: "Last 24h", value: 24 },
  { label: "Last 7d", value: 168 },
];

const Analytics = () => {
  const { get, loading } = useApi();
  const [data, setData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [range, setRange] = useState(timeRanges[2]); // Default 24h

  const fetchAnalytics = async () => {
    try {
      const [readingsRes, predictionRes] = await Promise.all([
        get(`/readings?hours=${range.value}&limit=500`),
        get("/analytics/prediction"),
      ]);
      setData(readingsRes);
      setPrediction(predictionRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const exportCSV = () => {
    const headers = ["Time", "Temp", "Hum", "CO2", "Light", "Weight"];
    const csvContent = [
      headers.join(","),
      ...(Array.isArray(data)
        ? data.map((r) =>
            [
              r.recorded_at,
              r.temperature_c,
              r.humidity_pct,
              r.co2_ppm,
              r.light_lux,
              r.weight_kg,
            ].join(","),
          )
        : []),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poultry_data_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep dive into environmental trends and predictive insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1">
            {timeRanges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  range.value === r.value
                    ? "bg-card shadow-sm"
                    : "hover:bg-card/50 text-muted-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-primary/5 border-primary/20">
          <CardHeader
            title="Predictive Insight"
            subtitle="Linear regression projection for next 30 minutes"
            icon={Lightbulb}
          />
          <div className="flex flex-col md:flex-row items-center gap-8 py-4">
            <div className="flex-1 space-y-4">
              <p className="text-sm">
                Based on current trends, CO2 levels are predicted to reach
                <span className="font-bold text-primary mx-1">
                  {prediction?.predicted_co2_30min || "--"} ppm
                </span>
                within the next half hour.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Trend Slope
                  </span>
                  <span className="text-xl font-black">
                    {prediction?.trend_slope > 0 ? "+" : ""}
                    {prediction?.trend_slope || "0.00"}
                  </span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Status
                  </span>
                  <Badge
                    variant={
                      prediction?.status === "stable" ? "success" : "warning"
                    }
                  >
                    {prediction?.status || "Analyzing"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="p-4 bg-card rounded-2xl border border-primary/10 shadow-sm">
              <h4 className="text-xs font-bold mb-2 text-muted-foreground">
                RECOMMENDATION
              </h4>
              <p className="text-sm italic">
                "
                {prediction?.recommendation ||
                  "Gathering more data for precise prediction..."}
                "
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Stability Index"
            subtitle="Overall environmental stability"
            icon={TrendingUp}
          />
          <div className="mt-4">
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[85%] rounded-full shadow-lg shadow-primary/30" />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase">
              <span>Low Stability</span>
              <span>85% (Good)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            The farm environment shows high stability in temperature with minor
            fluctuations in humidity during the dawn hours.
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Temperature Trend"
          subtitle="Sensor readings in Celsius"
          data={Array.isArray(data) ? data : []}
          dataKey="temperature_c"
          color="#f97316"
          unit="°C"
          threshold={32}
        />
        <ChartCard
          title="Humidity Trend"
          subtitle="Relative humidity percentage"
          data={Array.isArray(data) ? data : []}
          dataKey="humidity_pct"
          color="#3b82f6"
          unit="%"
          threshold={75}
        />
        <ChartCard
          title="CO2 Concentration"
          subtitle="Carbon Dioxide in ppm"
          data={Array.isArray(data) ? data : []}
          dataKey="co2_ppm"
          color="#10b981"
          unit="ppm"
          threshold={2000}
        />
        <ChartCard
          title="Ammonia (NH3) Trend"
          subtitle="Ammonia levels in ppm"
          data={Array.isArray(data) ? data : []}
          dataKey="nh3_ppm"
          color="#a855f7"
          unit="ppm"
          threshold={25}
        />
        <ChartCard
          title="Light (Lux) Trend"
          subtitle="Environment light intensity"
          data={Array.isArray(data) ? data : []}
          dataKey="light_lux"
          color="#eab308"
          unit="lux"
          threshold={300}
        />
        <ChartCard
          title="Poultry Growth (Weight)"
          subtitle="Average feed-to-weight estimation"
          data={Array.isArray(data) ? data : []}
          dataKey="weight_kg"
          color="#6366f1"
          unit="kg"
        />
      </div>
    </div>
  );
};

export default Analytics;
