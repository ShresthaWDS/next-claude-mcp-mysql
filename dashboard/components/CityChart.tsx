"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function CityChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-[420px] bg-white text-gray-800 rounded-2xl shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        City Population Chart
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Population" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
