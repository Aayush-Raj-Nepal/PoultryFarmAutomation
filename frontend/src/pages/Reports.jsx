import React, { useState, useEffect } from "react";
import {
  FileText,
  PieChart,
  Calendar,
  Download,
  CheckCircle,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Search,
} from "lucide-react";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { useApi } from "../hooks/useApi";
import { format } from "date-fns";

const SummaryRow = ({ label, value, unit, icon: Icon, color }) => (
  <div className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase">
        {unit}
      </span>
    </div>
  </div>
);

const Reports = () => {
  const { get, loading } = useApi();
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState("Today");

  const fetchReport = async () => {
    try {
      const res = await get("/analytics/summary");
      setSummary(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Performance Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Consolidated monitoring reports and historical summaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-4 py-2 bg-muted rounded-xl text-xs font-bold appearance-none outline-none border border-border focus:ring-2 focus:ring-primary/20 transition-all font-sans"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 transition-transform active:scale-95">
            <Download size={16} /> Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader
              title="Environment Summary"
              subtitle="Average readings for the selected period"
              icon={PieChart}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border mt-4 overflow-hidden rounded-2xl border border-border">
              <div className="bg-card">
                <SummaryRow
                  label="Average Temperature"
                  value={summary?.avg_temp || "--"}
                  unit="°C"
                  icon={TrendingUp}
                  color="text-orange-500 bg-orange-500"
                />
                <SummaryRow
                  label="Average Humidity"
                  value={summary?.avg_humidity || "--"}
                  unit="%"
                  icon={TrendingDown}
                  color="text-blue-500 bg-blue-500"
                />
              </div>
              <div className="bg-card">
                <SummaryRow
                  label="Average CO2 Level"
                  value={summary?.avg_co2 || "--"}
                  unit="ppm"
                  icon={Search}
                  color="text-emerald-500 bg-emerald-500"
                />
                <SummaryRow
                  label="Total Readings"
                  value={summary?.total_readings || "0"}
                  unit="points"
                  icon={CheckCircle}
                  color="text-purple-500 bg-purple-500"
                />
              </div>
            </div>

            <div className="mt-8 p-6 bg-primary/5 rounded-3xl border border-primary/10">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-primary">
                <FileText size={18} />
                Executive Observation
              </h4>
              <p className="text-sm italic leading-relaxed text-muted-foreground">
                "During this period, the farm maintained an environmental
                stability index of 85%. Temperature remained consistent,
                however, we noticed a 15% increase in average CO2 levels during
                the evening hours. Recommendation: Increase exhaust fan duty
                cycle between 6 PM and 9 PM to maintain optimal air exchange."
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Risk & Alerts Audit"
              subtitle="Analysis of critical issues flagged by the system"
              icon={AlertOctagon}
            />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase text-destructive tracking-widest mb-1">
                  Critical
                </p>
                <p className="text-2xl font-black text-destructive">03</p>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">
                  Warnings
                </p>
                <p className="text-2xl font-black text-amber-600 font-sans">
                  {summary?.alerts_24h || 0}
                </p>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">
                  Resolved
                </p>
                <p className="text-2xl font-black text-green-600 font-sans">
                  12
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Most Frequent Alert
              </p>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-medium">CO2 Levels High</span>
                <Badge variant="destructive">5 occurrences</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="h-full">
            <CardHeader title="Historical Metadata" icon={Calendar} />
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  Report ID
                </p>
                <p className="text-xs font-bold font-mono">PFR-2024-0324-001</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  Generated At
                </p>
                <p className="text-xs font-bold">
                  {format(new Date(), "PPP p")}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  Project Phase
                </p>
                <p className="text-xs font-bold">Day 14 (Broiler Growth)</p>
              </div>
              <div className="pt-6 border-t border-border">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">
                  Export Options
                </h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-xs font-bold group">
                    CSV Log (Full Data)
                    <Download
                      size={14}
                      className="group-hover:translate-y-0.5 transition-transform"
                    />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-xs font-bold group">
                    Excel Summary
                    <Download
                      size={14}
                      className="group-hover:translate-y-0.5 transition-transform"
                    />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-xs font-bold group">
                    System Event Log
                    <Download
                      size={14}
                      className="group-hover:translate-y-0.5 transition-transform"
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
