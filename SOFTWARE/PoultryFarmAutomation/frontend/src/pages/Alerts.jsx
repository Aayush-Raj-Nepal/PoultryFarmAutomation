import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  MoreVertical,
  Check,
  Trash2,
} from "lucide-react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "../lib/utils";

const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

const Alerts = ({ embedded = false }) => {
  const { get, post, del, loading } = useApi();
  const { isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchAlerts = async () => {
    try {
      const res = await get("/alerts");
      setAlerts(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await post(`/alerts/${id}/${action}`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await del(`/alerts/${id}`);
      setSelectedIds((current) => current.filter((item) => item !== id));
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;

    try {
      await post("/alerts/bulk", { ids: selectedIds, action });
      setSelectedIds([]);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const filteredAlerts = Array.isArray(alerts)
    ? alerts
        .filter((a) => filter === "all" || a.severity === filter)
        .filter(
          (a) =>
            a.message.toLowerCase().includes(search.toLowerCase()) ||
            a.sensor.toLowerCase().includes(search.toLowerCase()),
        )
    : [];

  const stats = {
    critical: Array.isArray(alerts)
      ? alerts.filter((a) => a.severity === "critical" && a.status === "active")
          .length
      : 0,
    high: Array.isArray(alerts)
      ? alerts.filter((a) => a.severity === "high" && a.status === "active")
          .length
      : 0,
    active: Array.isArray(alerts)
      ? alerts.filter((a) => a.status === "active").length
      : 0,
  };

  const allVisibleSelected =
    filteredAlerts.length > 0 &&
    filteredAlerts.every((alert) => selectedIds.includes(alert.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filteredAlerts.some((alert) => alert.id === id)),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...filteredAlerts.map((alert) => alert.id)]),
    ]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Active Alerts
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Real-time environmental risk management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex gap-4 mr-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Critical Issues
                </span>
                <span className="text-lg font-black text-destructive">
                  {stats.critical}
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Active Alerts
                </span>
                <span className="text-lg font-black">{stats.active}</span>
              </div>
            </div>
            <button className="p-2 hover:bg-muted rounded-full transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>
      )}

      <Card className="p-4 md:p-6 shadow-xl border-white/10 glass-morphism">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="Search alerts or sensors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted/50 border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2">
            {["all", "critical", "high", "medium", "low"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl border transition-all uppercase tracking-wider",
                  filter === s
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-background text-muted-foreground border-border hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isAuthenticated && (
          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length
                ? `${selectedIds.length} alert${selectedIds.length === 1 ? "" : "s"} selected`
                : "Select one or more alerts to run batch actions."}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction("acknowledge")}
                disabled={!selectedIds.length}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary disabled:opacity-40"
              >
                Acknowledge Selected
              </button>
              <button
                onClick={() => handleBulkAction("resolve")}
                disabled={!selectedIds.length}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-green-500/10 text-green-700 disabled:opacity-40"
              >
                Resolve Selected
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={!selectedIds.length}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive disabled:opacity-40"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                {isAuthenticated && (
                  <th className="px-4 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-border"
                    />
                  </th>
                )}
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Sensor/Metric</th>
                <th className="px-6 py-4">Status & Time</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAuthenticated ? 6 : 5}
                    className="px-6 py-12 text-center text-muted-foreground italic"
                  >
                    <CheckCircle2
                      className="mx-auto mb-2 opacity-20"
                      size={48}
                    />
                    No active alerts found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    {isAuthenticated && (
                      <td className="px-4 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(alert.id)}
                          onChange={() => toggleSelection(alert.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : alert.severity === "high"
                              ? "destructive"
                              : alert.severity === "medium"
                                ? "warning"
                                : "primary"
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm">
                          {alert.sensor}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {alert.message}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              alert.status === "active"
                                ? "bg-destructive animate-pulse"
                                : "bg-muted-foreground",
                            )}
                          />
                          {alert.status}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(alert.recorded_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {alert.status === "acknowledged" ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">Ack'ed</span>
                          <span className="text-[10px] text-muted-foreground">
                            {alert.acknowledged_at
                              ? format(new Date(alert.acknowledged_at), "HH:mm")
                              : ""}
                          </span>
                        </div>
                      ) : alert.status === "resolved" ? (
                        <div className="flex flex-col text-green-600">
                          <span className="text-xs font-bold">Resolved</span>
                          <span className="text-[10px]">
                            {alert.resolved_at
                              ? format(new Date(alert.resolved_at), "HH:mm")
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase italic px-3 py-1 bg-muted/50 rounded-lg">
                          Pending...
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isAuthenticated ? (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {alert.status === "active" && (
                            <button
                              onClick={() =>
                                handleAction(alert.id, "acknowledge")
                              }
                              className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                              title="Acknowledge"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {(alert.status === "active" ||
                            alert.status === "acknowledged") && (
                            <button
                              onClick={() => handleAction(alert.id, "resolve")}
                              className="p-2 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                              title="Resolve"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(alert.id)}
                            className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <MoreVertical
                          className="text-muted-foreground ml-auto opacity-20"
                          size={20}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!isAuthenticated && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl h-fit">
              <ShieldAlert className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Administrative Access Restricted
              </h3>
              <p className="text-sm text-muted-foreground italic">
                Log in as an administrator to manage, acknowledge, or resolve
                these alerts.
              </p>
            </div>
          </div>
          <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            Go to Admin Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Alerts;
