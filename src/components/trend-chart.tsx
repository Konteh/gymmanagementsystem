"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";

export function TrendChart({
  data,
  color = "#16A6A0",
}: {
  data: { date: string; amount: number }[];
  color?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4EAF2" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => value.slice(5)}
            tick={{ fill: "#5B6B82", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => money(Number(value))}
            tick={{ fill: "#5B6B82", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value) => money(Number(value ?? 0))}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E4EAF2",
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="amount" stroke={color} strokeWidth={2} fill="url(#fillTrend)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
