import React from "react";
import {
  BellRing,
  Activity,
  Settings,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import Overview from "./Overview";
import Analytics from "./Analytics";
import { useAuth } from "../context/AuthContext";

const actions = [
  {
    key: "alerts",
    title: "Alerts",
    text: "Open the live alert queue and run batch actions.",
    icon: BellRing,
  },
  {
    key: "status",
    title: "Device Status",
    text: "Inspect API, database, device heartbeat, and AI status.",
    icon: Activity,
  },
  {
    key: "settings",
    title: "Settings",
    text: "Adjust thresholds and farm information.",
    icon: Settings,
    auth: true,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const openPanel = (panel) => {
    navigate(`/?panel=${panel}`);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-secondary-foreground">
              <LayoutDashboard size={14} />
              Main Dashboard
            </div>
            <h1 className="mt-4 text-4xl font-extrabold">SmartFlock Control Desk</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              One-page view for live flock conditions, raw sensor trends, and AI
              analytics. Secondary tools open as panels without leaving the
              dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
            {actions
              .filter((item) => !item.auth || isAuthenticated)
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => openPanel(item.key)}
                  className="text-left"
                >
                  <Card className="h-full min-h-[120px] hover:border-primary/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                          <item.icon size={18} />
                        </div>
                        <h2 className="text-lg font-bold">{item.title}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                  </Card>
                </button>
              ))}
          </div>
        </div>
      </section>

      <Overview embedded />
      <Analytics embedded />
    </div>
  );
};

export default Dashboard;
