import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Trash2,
  Play,
  RefreshCw,
  Home,
  Thermometer,
  Droplets,
  Wind,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";

const Settings = () => {
  const { get, put, post, loading } = useApi();
  const [settings, setSettings] = useState(null);
  const [localSettings, setLocalSettings] = useState({
    thresholds: {},
    farm_info: {},
  });
  const [status, setStatus] = useState({ type: "", msg: "" });

  const fetchSettings = async () => {
    try {
      const res = await get("/admin/settings");
      setSettings(res);
      setLocalSettings(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key, value) => {
    try {
      await put("/admin/settings", { key, value });
      setStatus({
        type: "success",
        msg: `${key.replace("_", " ")} updated successfully!`,
      });
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
      fetchSettings();
    } catch (err) {
      setStatus({ type: "error", msg: "Failed to update settings" });
    }
  };

  const seedDemoData = async () => {
    if (
      !window.confirm("This will insert 100 historical data points. Proceed?")
    )
      return;
    try {
      await post("/admin/seed-demo-data");
      setStatus({ type: "success", msg: "Demo data seeded successfully!" });
    } catch (err) {
      setStatus({ type: "error", msg: "Failed to seed data" });
    }
  };

  if (!settings)
    return (
      <div className="p-8 text-center animate-pulse">Loading settings...</div>
    );

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Configure thresholds, farm meta-data, and demo tools.
          </p>
        </div>
        {status.msg && (
          <Badge
            variant={status.type === "success" ? "success" : "destructive"}
            className="animate-bounce"
          >
            {status.msg}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Thresholds Config */}
          <Card>
            <CardHeader
              title="Environment Thresholds"
              subtitle="Safety limits for automated alerting"
              icon={ShieldCheck}
            />
            <div className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Thermometer size={16} className="text-orange-500" />{" "}
                    Temperature Range
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localSettings.thresholds.temp_min}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            temp_min: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="number"
                      value={localSettings.thresholds.temp_max}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            temp_max: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs font-bold">°C</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Droplets size={16} className="text-blue-500" /> Humidity
                    Range
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localSettings.thresholds.humidity_min}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            humidity_min: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="number"
                      value={localSettings.thresholds.humidity_max}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            humidity_max: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Wind size={16} className="text-emerald-500" /> CO2 Limit
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localSettings.thresholds.co2_max}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            co2_max: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-24 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs font-bold">ppm</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleUpdate("thresholds", localSettings.thresholds)
                }
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
              >
                <Save size={18} /> Save Thresholds
              </button>
            </div>
          </Card>

          {/* Farm Info */}
          <Card>
            <CardHeader
              title="Farm Identity"
              subtitle="Management and display information"
              icon={Home}
            />
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">
                    Farm Name
                  </label>
                  <input
                    type="text"
                    value={localSettings.farm_info.name}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        farm_info: { ...p.farm_info, name: e.target.value },
                      }))
                    }
                    className="w-full p-3 bg-muted rounded-xl text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">
                    Location
                  </label>
                  <input
                    type="text"
                    value={localSettings.farm_info.location}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        farm_info: { ...p.farm_info, location: e.target.value },
                      }))
                    }
                    className="w-full p-3 bg-muted rounded-xl text-sm font-medium"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  handleUpdate("farm_info", localSettings.farm_info)
                }
                className="w-full py-3 bg-secondary text-secondary-foreground border border-border rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-muted transition-all"
              >
                <Save size={18} /> Update Farm Info
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Demo Tools */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader
              title="Defense Presentation Tools"
              subtitle="Simulation and demo actions"
              icon={Zap}
            />
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="p-4 bg-card rounded-2xl border border-border">
                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Database size={16} className="text-primary" />
                  Sample Data Seeding
                </h4>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Inject 100 random sensor readings into the database to
                  demonstrate chart interactivity and historical analysis.
                </p>
                <button
                  onClick={seedDemoData}
                  disabled={loading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 transition-all"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                  Run Sample Ingestion
                </button>
              </div>

              <div className="p-4 bg-card rounded-2xl border border-border">
                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Trash2 size={16} className="text-destructive" />
                  System Reset
                </h4>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Clear all historical readings and alerts. This action is
                  irreversible. Use only for project cleanup.
                </p>
                <button className="w-full py-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-destructive hover:text-white transition-all">
                  Clear All Data
                </button>
              </div>
            </div>
          </Card>

          <Card className="bg-muted text-center p-8 flex flex-col items-center justify-center opacity-70 border-dashed">
            <SettingsIcon
              size={48}
              className="text-muted-foreground/30 mb-4 animate-spin-slow"
            />
            <h4 className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
              More features coming soon
            </h4>
            <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">
              Advanced OTA updates and multi-node configuration module.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
