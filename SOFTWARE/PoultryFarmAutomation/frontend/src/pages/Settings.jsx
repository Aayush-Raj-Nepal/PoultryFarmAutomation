import React, { useState, useEffect } from "react";
import {
  Save,
  Home,
  Thermometer,
  Droplets,
  Wind,
  ShieldCheck,
  Sun,
  Activity,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";

const Settings = ({ embedded = false }) => {
  const { get, put } = useApi();
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

  if (!settings)
    return (
      <div className="p-8 text-center animate-pulse">Loading settings...</div>
    );

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      {(!embedded || status.msg) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {!embedded && (
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                System Settings
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                Configure thresholds and farm information used by the live dashboard.
              </p>
            </div>
          )}
          {status.msg && (
            <Badge
              variant={status.type === "success" ? "success" : "destructive"}
              className="animate-bounce"
            >
              {status.msg}
            </Badge>
          )}
        </div>
      )}

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

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Sun size={16} className="text-yellow-500" /> Light Range
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localSettings.thresholds.light_min}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            light_min: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="number"
                      value={localSettings.thresholds.light_max}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            light_max: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 p-2 bg-muted rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs font-bold">lux</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <Activity size={16} className="text-purple-500" /> Ammonia
                    (NH3) Limit
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localSettings.thresholds.nh3_max}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          thresholds: {
                            ...p.thresholds,
                            nh3_max: Number(e.target.value),
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

        <Card className="h-fit">
          <CardHeader
            title="Admin Notes"
            subtitle="What this page currently controls"
            icon={ShieldCheck}
          />
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <p>
              Threshold values affect comfort scoring and rule-based alert
              generation for new readings.
            </p>
            <p>
              Farm identity values are displayed with the latest reading payload
              and can be used in future operator-facing views.
            </p>
            <p>
              No demo-only actions or destructive maintenance controls are shown
              here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
