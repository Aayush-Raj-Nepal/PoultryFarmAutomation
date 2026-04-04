import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader } from "./Card";
import { cn } from "../lib/utils";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-sm border border-border p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
          {format(new Date(label), "MMM dd, HH:mm:ss")}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-bold">
            {payload[0].value}
            {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const ChartCard = ({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
  threshold,
  area = true,
}) => {
  const ChartComp = area ? AreaChart : LineChart;
  const DataComp = area ? Area : Line;

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader title={title} subtitle={subtitle} className="mb-2" />
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComp
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis dataKey="recorded_at" hide />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            {threshold && (
              <ReferenceLine
                y={threshold}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
              />
            )}
            <DataComp
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              dot={false}
              animationDuration={1500}
            />
          </ChartComp>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ChartCard;
