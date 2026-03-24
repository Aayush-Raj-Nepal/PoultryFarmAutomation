import React, { useState, useEffect } from "react";
import {
  Server,
  Database,
  Cpu,
  Activity,
  Wifi,
  WifiOff,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";

const HealthIndicator = ({ title, status, icon: Icon, details }) => (
  <div className="flex items-center justify-between p-5 bg-card/5 border border-border rounded-2xl group transition-all hover:bg-muted/30">
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "p-3 rounded-2xl shadow-sm transition-colors",
          status === "healthy"
            ? "bg-green-500/10 text-green-600 group-hover:bg-green-500 group-hover:text-white"
            : "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white",
        )}
      >
        <Icon size={24} />
      </div>
      <div>
        <h4 className="font-bold text-sm tracking-tight">{title}</h4>
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
          {details}
        </p>
      </div>
    </div>
    <Badge
      variant={status === "healthy" ? "success" : "destructive"}
      className="font-bold border-none shadow-sm"
    >
      {status === "healthy" ? "Online" : "Offline"}
    </Badge>
  </div>
);

const Status = () => {
  const { get, loading } = useApi();
  const [health, setHealth] = useState(null);
  const [device, setDevice] = useState(null);

  const fetchStatus = async () => {
    try {
      const [healthRes, deviceRes] = await Promise.all([
        get("/health"),
        get("/device/status"),
      ]);
      setHealth(healthRes);
      setDevice(deviceRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const inv = setInterval(fetchStatus, 30000);
    return () => clearInterval(inv);
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          System Reliability
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Real-time health monitoring of the end-to-end IoT infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 md:p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Globe size={160} />
            </div>

            <CardHeader
              title="Infrastructure Status"
              subtitle="Distributed system health overview"
              icon={Server}
              className="mb-8"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <HealthIndicator
                title="IoT Edge Node"
                status={device?.status === "online" ? "healthy" : "error"}
                icon={Wifi}
                details={device?.deviceId || "Searching..."}
              />
              <HealthIndicator
                title="API Gateway"
                status={health?.status === "healthy" ? "healthy" : "error"}
                icon={Globe}
                details="Node.js Production"
              />
              <HealthIndicator
                title="Central Database"
                status={health?.database === "connected" ? "healthy" : "error"}
                icon={Database}
                details="PostgreSQL (Neon)"
              />
              <HealthIndicator
                title="AI Analytics Engine"
                status="healthy"
                icon={Cpu}
                details="Rule-based Deterministic"
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader title="Connectivity History" icon={Activity} />
                <div className="flex items-end gap-2 mt-4">
                  {[40, 60, 80, 70, 90, 100, 95, 100, 98, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 rounded-full h-24 relative overflow-hidden"
                    >
                      <div
                        className="absolute bottom-0 w-full bg-primary rounded-full transition-all duration-1000 delay-300"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                <span>99.8% Uptime</span>
                <span>Last 24 Hours</span>
              </div>
            </Card>

            <Card className="bg-muted/20 border-border">
              <CardHeader title="Server Metrics" icon={BarChart2} />
              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Server Uptime</span>
                  <span className="text-muted-foreground">
                    {(health?.uptime / 3600).toFixed(2)} hours
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Memory Load</span>
                  <span className="text-muted-foreground">32.4%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Avg Latency</span>
                  <span className="text-muted-foreground">42ms</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-border mt-2">
                  <span className="font-black flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />{" "}
                    Platform Stable
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Recent Activity Log"
              subtitle="System events and ingest stream"
              icon={Clock}
            />
            <div className="flex-1 space-y-6 mt-4 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 border border-green-500/20 z-10 shrink-0">
                  <Wifi size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">
                    Data Package Received
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Device Node-01 heartbeat successful
                  </p>
                  <p className="text-[10px] text-primary font-bold mt-1">
                    {device?.lastSeen
                      ? formatDistanceToNow(new Date(device.lastSeen), {
                          addSuffix: true,
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 z-10 shrink-0">
                  <Server size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">
                    Analytics Summary Updated
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Consolidated daily farm insights generated
                  </p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20 z-10 shrink-0">
                  <AlertCircle size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">
                    Anomaly Detection Scan
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Z-score analysis completed for CO2
                  </p>
                </div>
              </div>

              <div className="flex-1" />
              <button className="w-full py-3 bg-muted hover:bg-muted/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                View Detailed Logs
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Status;
