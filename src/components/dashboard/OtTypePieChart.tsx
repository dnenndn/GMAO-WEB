"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TYPE_COLORS = [
  "#A8451B", "#3D6B35", "#C97A0C", "#6B6259", "#B3261E",
  "#5B7C99", "#8A6D9E", "#8A8177",
];

export function OtTypePieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted">
        Aucun OT clôturé.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie data={data} dataKey="value" nameKey="name" cx="38%" cy="50%" outerRadius="80%">
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const numericValue = Number(value ?? 0);
            return [`${numericValue} (${((numericValue / total) * 100).toFixed(1)}%)`, name];
          }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconSize={9}
          wrapperStyle={{ fontSize: 12, lineHeight: "20px" }}
          formatter={(value, entry: any) =>
            `${value} — ${entry.payload.value} (${((entry.payload.value / total) * 100).toFixed(0)}%)`
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
