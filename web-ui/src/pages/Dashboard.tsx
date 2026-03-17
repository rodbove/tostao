import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { api, type Totals, type CategorySummary, type DailyData } from "../api/client";
import { formatCurrency, monthStartStr, monthEndStr, monthLabel } from "../utils";

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function Dashboard() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategorySummary[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);

  const start = monthStartStr();
  const end = monthEndStr();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      api.getTotals(start, end).then(setTotals),
      api.getByCategory(start, end, "expense").then(setExpensesByCategory),
      api.getDaily(start, end).then(setDaily),
    ]).catch((err) => setError(`Erro ao carregar dados: ${err.message}`));
  }, [start, end]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold capitalize">{monthLabel()}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card label="Ganhos" value={totals?.earnings ?? 0} color="text-emerald-600" />
        <Card label="Gastos" value={totals?.expenses ?? 0} color="text-red-500" />
        <Card
          label="Saldo"
          value={totals?.net ?? 0}
          color={(totals?.net ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses by category */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Gastos por categoria</h2>
          {expensesByCategory.length === 0 ? (
            <p className="text-gray-400 text-sm">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ category_name, total }) =>
                    `${category_name}: ${formatCurrency(total)}`
                  }
                >
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily spending */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Gastos diarios</h2>
          {daily.length === 0 ? (
            <p className="text-gray-400 text-sm">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="expenses" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="earnings" fill="#10b981" name="Ganhos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
