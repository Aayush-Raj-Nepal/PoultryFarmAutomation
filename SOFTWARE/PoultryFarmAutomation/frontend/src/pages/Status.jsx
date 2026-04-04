import React, { useEffect, useState } from "react";
import { Activity, Clock, Database, Server, Wifi } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";

const StatusRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-right">{value}</span>
  </div>
);

const formatIdleDuration = (idleDuration) => {
  if (!idleDuration || typeof idleDuration !== "object") {
    return idleDuration || "--";
  }

  const parts = [
    idleDuration.days ? `${idleDuration.days}d` : null,
    idleDuration.hours ? `${idleDuration.hours}h` : null,
    idleDuration.minutes ? `${idleDuration.minutes}m` : null,
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(" ");
  }

  if (idleDuration.seconds) {
    return `${Math.floor(idleDuration.seconds)}s`;
  }

  return "--";
};

const Status = ({ embedded = false }) => {
  const { get } = useApi();
  const [health, setHealth] = useState(null);
  const [device, setDevice] = useState(null);
  const [summary, setSummary] = useState(null);

  const fetchStatus = async () => {
    try {
      const [healthRes, deviceRes, summaryRes] = await Promise.all([
        get("/health"),
        get("/device/status"),
        get("/analytics/summary"),
      ]);
      setHealth(healthRes);
      setDevice(deviceRes);
      setSummary(summaryRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Status</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Current backend, database, device, and analytics service status.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader title="API Server" icon={Server} />
          <div className="mt-4 flex items-center justify-between">
            <Badge variant={health?.status === "healthy" ? "success" : "destructive"}>
              {health?.status || "unknown"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {health?.environment || "unknown"}
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Database" icon={Database} />
          <div className="mt-4 flex items-center justify-between">
            <Badge
              variant={health?.database === "connected" ? "success" : "destructive"}
            >
              {health?.database || "unknown"}
            </Badge>
            <span className="text-xs text-muted-foreground">PostgreSQL</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Device" icon={Wifi} />
          <div className="mt-4 flex items-center justify-between">
            <Badge variant={device?.status === "online" ? "success" : "destructive"}>
              {device?.status || "unknown"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {device?.deviceId || "unknown"}
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader title="AI Summary" icon={Activity} />
          <div className="mt-4 flex items-center justify-between">
            <Badge variant={summary?.status === "success" ? "success" : "warning"}>
              {summary?.status || "unknown"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {summary?.data_source || "unknown"}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Backend Details"
            subtitle="Values returned by the running API"
            icon={Server}
          />
          <div className="mt-4">
            <StatusRow
              label="Server uptime"
              value={
                typeof health?.uptime === "number"
                  ? `${(health.uptime / 3600).toFixed(2)} hours`
                  : "--"
              }
            />
            <StatusRow
              label="Latest ingest"
              value={
                health?.latest_ingest
                  ? formatDistanceToNow(new Date(health.latest_ingest), {
                      addSuffix: true,
                    })
                  : "No readings yet"
              }
            />
            <StatusRow label="Environment" value={health?.environment || "--"} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Device And Analytics"
            subtitle="Current live device heartbeat and AI refresh state"
            icon={Clock}
          />
          <div className="mt-4">
            <StatusRow
              label="Device last seen"
              value={
                device?.lastSeen
                  ? formatDistanceToNow(new Date(device.lastSeen), {
                      addSuffix: true,
                    })
                  : "No device heartbeat"
              }
            />
            <StatusRow
              label="Idle duration"
              value={formatIdleDuration(device?.idleDuration)}
            />
            <StatusRow
              label="AI generated at"
              value={
                summary?.generated_at
                  ? formatDistanceToNow(new Date(summary.generated_at), {
                      addSuffix: true,
                    })
                  : "Unavailable"
              }
            />
            <StatusRow
              label="AI cache hit"
              value={summary?.cache?.hit ? "yes" : "no"}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Status;
