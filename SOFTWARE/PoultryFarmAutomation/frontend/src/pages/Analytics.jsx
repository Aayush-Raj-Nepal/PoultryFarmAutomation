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

const Analytics = ({ embedded = false }) => {
  const { get, loading } = useApi();
  const [data, setData] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [risk, setRisk] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [trendRange, setTrendRange] = useState(timeRanges[2]); // Default 24h

  const normalizeReadings = (readings) => {
    if (!Array.isArray(readings)) {
      return [];
    }

    return readings.map((reading) => ({
      ...reading,
      temperature_c:
        reading.temperature_c == null ? null : Number(reading.temperature_c),
      humidity_pct:
        reading.humidity_pct == null ? null : Number(reading.humidity_pct),
      co2_ppm: reading.co2_ppm == null ? null : Number(reading.co2_ppm),
      nh3_ppm: reading.nh3_ppm == null ? null : Number(reading.nh3_ppm),
      light_lux: reading.light_lux == null ? null : Number(reading.light_lux),
      weight_kg: reading.weight_kg == null ? null : Number(reading.weight_kg),
    }));
  };

  const fetchTrendData = async () => {
    try {
      const readings = await get(
        `/readings/trends?hours=${trendRange.value}&limit=500`,
      );
      setData(normalizeReadings(readings));
    } catch (err) {
      console.error(err);
      setData([]);
    }
  };

  const fetchAiInsights = async () => {
    const results = await Promise.allSettled([
      get("/analytics/forecast?horizon=30"),
      get("/analytics/risk"),
      get("/analytics/anomalies?hours=24"),
    ]);

    const [forecastRes, riskRes, anomaliesRes] = results;

    if (forecastRes.status === "fulfilled") {
      setForecast(forecastRes.value);
    } else {
      console.error(forecastRes.reason);
      setForecast({
        status: "error",
        message: "Forecast is currently unavailable.",
        forecasts: {},
      });
    }

    if (riskRes.status === "fulfilled") {
      setRisk(riskRes.value);
    } else {
      console.error(riskRes.reason);
      setRisk({
        status: "error",
        message: "Risk scoring is currently unavailable.",
        contributing_factors: [],
      });
    }

    if (anomaliesRes.status === "fulfilled") {
      setAnomalies(anomaliesRes.value);
    } else {
      console.error(anomaliesRes.reason);
      setAnomalies({
        status: "error",
        message: "Anomaly detection is currently unavailable.",
        anomalies: [],
      });
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, [trendRange]);

  useEffect(() => {
    fetchAiInsights();
  }, []);

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

  const co2Forecast = forecast?.forecasts?.co2;
  const anomalyItems = Array.isArray(anomalies?.anomalies)
    ? anomalies.anomalies.slice(-3).reverse()
    : [];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {!embedded && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Advanced Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Deep dive into environmental trends and predictive insights.
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1">
            {timeRanges.map((r) => (
              <button
                key={r.value}
                onClick={() => setTrendRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  trendRange.value === r.value
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

      <Card className="border-border/80">
        <CardHeader
          title="Raw Sensor Trends"
          subtitle={`Live database readings for ${trendRange.label.toLowerCase()}`}
          icon={TrendingUp}
        />
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Temperature Trend"
          subtitle="Raw sensor readings in Celsius"
          data={Array.isArray(data) ? data : []}
          dataKey="temperature_c"
          color="#f97316"
          unit="°C"
          threshold={32}
        />
        <ChartCard
          title="Humidity Trend"
          subtitle="Raw sensor readings in relative humidity"
          data={Array.isArray(data) ? data : []}
          dataKey="humidity_pct"
          color="#3b82f6"
          unit="%"
          threshold={75}
        />
        <ChartCard
          title="CO2 Concentration"
          subtitle="Raw sensor readings in ppm"
          data={Array.isArray(data) ? data : []}
          dataKey="co2_ppm"
          color="#10b981"
          unit="ppm"
          threshold={2000}
        />
        <ChartCard
          title="Ammonia (NH3) Trend"
          subtitle="Raw sensor readings in ppm"
          data={Array.isArray(data) ? data : []}
          dataKey="nh3_ppm"
          color="#a855f7"
          unit="ppm"
          threshold={25}
        />
        <ChartCard
          title="Light (Lux) Trend"
          subtitle="Raw light readings"
          data={Array.isArray(data) ? data : []}
          dataKey="light_lux"
          color="#eab308"
          unit="lux"
          threshold={300}
        />
        <ChartCard
          title="Weight Trend"
          subtitle="Raw weight readings"
          data={Array.isArray(data) ? data : []}
          dataKey="weight_kg"
          color="#6366f1"
          unit="kg"
        />
      </div>

      {/* AI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-primary/5 border-primary/20">
          <CardHeader
            title="Predictive Insight"
            subtitle="Default AI analytics window from the backend"
            icon={Lightbulb}
          />
          <div className="flex flex-col md:flex-row items-center gap-8 py-4">
            <div className="flex-1 space-y-4">
              <p className="text-sm">
                Based on the live multi-sensor forecaster, CO2 is projected to
                reach
                <span className="font-bold text-primary mx-1">
                  {co2Forecast?.predicted || "--"} ppm
                </span>
                within the next half hour.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Direction
                  </span>
                  <span className="text-xl font-black">
                    {co2Forecast?.trend || "analyzing"}
                  </span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Forecast MAE
                  </span>
                  <Badge variant={forecast?.status === "success" ? "success" : "warning"}>
                    {co2Forecast?.mae ?? "--"}
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
                {forecast?.status === "success"
                  ? `Current CO2 is ${co2Forecast?.current ?? "--"} ppm and the near-term trend is ${co2Forecast?.trend || "stable"}.`
                  : forecast?.message ||
                    "Gathering more data for precise prediction..."}
                "
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Risk Overview"
            subtitle="Interpretable AI risk scoring"
            icon={AlertTriangle}
          />
          <div className="mt-4">
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-lg shadow-primary/30"
                style={{
                  width: `${Math.max(
                    8,
                    Math.min(100, Math.round((risk?.risk_score || 0) * 100)),
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase">
              <span>Low Risk</span>
              <span>
                {risk?.risk_level || "Unknown"} ({risk?.risk_score ?? "--"})
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            {risk?.recommendation ||
              "Risk scoring will populate once the AI module has enough recent sensor data."}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Recent Anomalies"
            subtitle="Latest AI-flagged abnormal readings"
            icon={AlertTriangle}
          />
          <div className="space-y-3">
            {anomalyItems.length ? (
              anomalyItems.map((item) => (
                <div
                  key={`${item.timestamp}-${item.score}`}
                  className="rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold uppercase tracking-wide">
                      {item.severity}
                    </span>
                    <Badge variant={item.severity === "critical" ? "destructive" : "warning"}>
                      score {item.score?.toFixed?.(2) ?? item.score}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">{item.explanation}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {anomalies?.message || "No recent anomalies detected in the selected time window."}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Top Risk Contributors"
            subtitle="Variables driving the current risk score"
            icon={TrendingUp}
          />
          <div className="space-y-3">
            {Array.isArray(risk?.contributing_factors) &&
            risk.contributing_factors.length ? (
              risk.contributing_factors.map((factor) => (
                <div
                  key={factor.sensor}
                  className="rounded-2xl border border-border p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide">
                      {factor.sensor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current value {factor.value}
                    </p>
                  </div>
                  <Badge variant="warning">
                    {factor.risk_contribution?.toFixed?.(2) ?? factor.risk_contribution}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {risk?.message || "No elevated contributing factors right now."}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
