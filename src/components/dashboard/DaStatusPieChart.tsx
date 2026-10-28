"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// One color per real statut, matching the app's established status
// palette elsewhere rather than cycling a 2-color array across 5 real
// slices (the previous bug — repeating red/green/red/green/red made
// the chart genuinely hard to read once all 5 real DA statuses were
// correctly represented, not just the original 2).
const STATUT_COLORS: Record<string, string> = {
  "Clôturée": "#3D6B35",
  "Confirmée": "#A8451B",
  "En cours": "#6B6259",
  "Refusée": "#B3261E",
  "Reportée": "#C97A0C",
};
const FALLBACK_COLOR = "#8A8177";

export function DaStatusPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted">
        Aucune demande d&apos;achat.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="38%"
          cy="50%"
          outerRadius="80%"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUT_COLORS[entry.name] ?? FALLBACK_COLOR} />
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
