import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { api, type DailyData } from "../api/client";
import { formatCurrency, monthStartStr, monthEndStr } from "../utils";

type View = "daily" | "weekly" | "monthly";

export default function Timeline() {
  const [view, setView] = useState<View>("daily");
  const [daily, setDaily] = useState<DailyData[]>([]);

  // Fetch last 3 months of data
  const end = monthEndStr();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
  const start = monthStartStr(threeMonthsAgo);

  useEffect(() => {
    api.getDaily(start, end).then(setDaily);
  }, [start, end]);

  const grouped = groupData(daily, view);

  // Cumulative savings line
  let cumulative = 0;
  const savingsData = grouped.map((d) => {
    cumulative += d.earnings - d.expenses;
    return { ...d, savings: cumulative };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["daily", "weekly", "monthly"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                view === v
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "daily" ? "Diario" : v === "weekly" ? "Semanal" : "Mensal"}
            </button>
          ))}
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Ganhos vs Gastos</h2>
        {grouped.length === 0 ? (
          <p className="text-gray-400 text-sm">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grouped}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="earnings" fill="#10b981" name="Ganhos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cumulative savings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Saldo acumulado</h2>
        {savingsData.length === 0 ? (
          <p className="text-gray-400 text-sm">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={savingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                fill="#3b82f680"
                name="Saldo acumulado"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface GroupedData {
  label: string;
  expenses: number;
  earnings: number;
}

function groupData(daily: DailyData[], view: View): GroupedData[] {
  if (view === "daily") {
    return daily.map((d) => ({
      label: d.date.slice(5), // MM-DD
      expenses: d.expenses,
      earnings: d.earnings,
    }));
  }

  const map = new Map<string, { expenses: number; earnings: number }>();

  for (const d of daily) {
    const date = new Date(d.date + "T12:00:00");
    let key: string;

    if (view === "weekly") {
      const dayOfWeek = date.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(date);
      monday.setDate(date.getDate() - diff);
      key = monday.toISOString().slice(5, 10);
    } else {
      key = d.date.slice(0, 7); // YYYY-MM
    }

    const entry = map.get(key) ?? { expenses: 0, earnings: 0 };
    entry.expenses += d.expenses;
    entry.earnings += d.earnings;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({ label, ...data }));
}
