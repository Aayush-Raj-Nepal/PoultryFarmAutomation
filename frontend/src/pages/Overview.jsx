import React, { useState, useEffect } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Scale,
  Heart,
  AlertCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info,
  Activity,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color,
  trend,
  loading,
}) => (
  <Card className="relative overflow-hidden group">
    <div
      className={cn(
        "absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500",
        color,
      )}
    />
    <div className="flex items-start justify-between mb-4">
      <div
        className={cn(
          "p-3 rounded-2xl",
          color.replace("bg-", "bg-").replace("500", "500/10"),
          color.replace("bg-", "text-"),
        )}
      >
        <Icon size={24} />
      </div>
      {trend && (
        <Badge
          variant={trend > 0 ? "success" : "destructive"}
          className="flex items-center gap-1"
        >
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </Badge>
      )}
    </div>
    {loading ? (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-8 w-24 bg-muted rounded" />
      </div>
    ) : (
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
          <span className="text-sm font-semibold text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
    )}
  </Card>
);

const Overview = () => {
  const { get, loading } = useApi();
  const [latest, setLatest] = useState(null);
  const [deviceSt, setDeviceSt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const fetchData = async () => {
    try {
      const [latestRes, statusRes, summaryRes, alertsRes] = await Promise.all([
        get("/readings/latest"),
        get("/device/status"),
        get("/analytics/summary"),
        get("/alerts"),
      ]);
      setLatest(latestRes);
      setDeviceSt(statusRes);
      setSummary(summaryRes);
      setAlerts(alertsRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const getComfortColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Poultry Dashboard
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Clock size={14} />
            Last updated:{" "}
            {latest?.recorded_at
              ? formatDistanceToNow(new Date(latest.recorded_at), {
                  addSuffix: true,
                })
              : "Never"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={deviceSt?.status === "online" ? "success" : "destructive"}
            className="px-3 py-1"
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-2",
                deviceSt?.status === "online"
                  ? "bg-green-500"
                  : "bg-destructive",
              )}
            />
            {deviceSt?.status === "online" ? "Device Online" : "Device Offline"}
          </Badge>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-muted rounded-full transition-transform active:rotate-180"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Temperature"
          value={latest?.temperature_c || "--"}
          unit="°C"
          icon={Thermometer}
          color="bg-orange-500"
          loading={loading && !latest}
        />
        <StatCard
          title="Humidity"
          value={latest?.humidity_pct || "--"}
          unit="%"
          icon={Droplets}
          color="bg-blue-500"
          loading={loading && !latest}
        />
        <StatCard
          title="CO2 Levels"
          value={latest?.co2_ppm || "--"}
          unit="ppm"
          icon={Wind}
          color="bg-emerald-500"
          loading={loading && !latest}
        />
        <StatCard
          title="Feed Weight"
          value={latest?.weight_kg || "--"}
          unit="kg"
          icon={Scale}
          color="bg-purple-500"
          loading={loading && !latest}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Farm Health Gauge */}
        <Card className="lg:col-span-1 flex flex-col justify-center items-center text-center p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Heart size={20} className="text-destructive fill-destructive" />
            Poultry Comfort Score
          </h3>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-muted/20"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={552.9}
                strokeDashoffset={
                  552.9 - (552.9 * (latest?.comfort_score || 0)) / 100
                }
                className={cn(
                  "transition-all duration-1000",
                  getComfortColor(latest?.comfort_score || 0),
                )}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black">
                {latest?.comfort_score || 0}%
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Health Index
              </span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <div className="bg-muted/50 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Alerts (24h)
              </p>
              <p className="text-xl font-bold">{summary?.alerts_24h || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Anomalies
              </p>
              <p className="text-xl font-bold">0</p>
            </div>
          </div>
        </Card>

        {/* Quick Insights / Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader
              title="Intelligence Insights"
              subtitle="AI-powered analysis of current farm conditions"
              icon={Info}
              className="mb-4"
            />
            <div className="space-y-4">
              {latest?.comfort_score < 80 ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex gap-4">
                  <div className="p-2 bg-destructive/20 rounded-full h-fit">
                    <AlertCircle size={20} className="text-destructive" />
                  </div>
                  <div>
                    <h4 className="font-bold text-destructive">
                      Action Required: Sub-optimal Environment
                    </h4>
                    <p className="text-sm text-destructive-foreground/80 mt-1">
                      Current environmental conditions are affecting poultry
                      comfort. CO2 levels are rising while temperature remains
                      on the high side.
                    </p>
                    <button className="mt-3 text-xs font-bold px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors">
                      View Recommendations
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex gap-4">
                  <div className="p-2 bg-green-500/20 rounded-full h-fit">
                    <Heart size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-700">
                      Environment is Healthy
                    </h4>
                    <p className="text-sm text-green-600/80 mt-1">
                      All sensors are reporting values within the safe
                      thresholds. Poultry growth conditions are currently
                      optimal.
                    </p>
                  </div>
                </div>
              )}

              {Array.isArray(alerts) &&
                alerts
                  .filter((a) => a.status === "active")
                  .slice(0, 3)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-destructive" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {alert.sensor}
                          </span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {alert.message}
                          </span>
                        </div>
                      </div>
                      <Badge variant="destructive">{alert.severity}</Badge>
                    </div>
                  ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <p className="text-xs font-bold text-muted-foreground mb-1">
                    CO2 TREND
                  </p>
                  <p className="text-sm">
                    Stable at 850ppm. No immediate ventilation risk detected.
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <p className="text-xs font-bold text-muted-foreground mb-1">
                    FEED EFFICIENCY
                  </p>
                  <p className="text-sm">
                    Consumption rate matches the expected growth curve for day
                    14.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="System Reliability" icon={Activity} />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm font-medium">IoT Node 01 - ESP32</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm font-medium">PostgreSQL Database</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm font-medium">
                  Cloudflare Worker Gateway
                </span>
                <Badge variant="success">Operational</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Overview;
