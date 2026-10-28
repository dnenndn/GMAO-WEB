"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function CommandeBlBarChart({
  data,
}: {
  data: { label: string; nombre: number; montant: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="nombre" name="Nombre" fill="#2563a8" />
        <Bar yAxisId="right" dataKey="montant" name="Montant (DT)" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}
