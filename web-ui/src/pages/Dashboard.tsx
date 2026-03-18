import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { api, type Totals, type CategorySummary, type DailyData, type Account } from "../api/client";
import { formatCurrency, monthStartStr, monthEndStr, monthLabel } from "../utils";

const COLORS = [
  "#1a6b4a", "#c9a84c", "#b04a3a", "#3b82f6", "#8b5cf6",
  "#0f4a32", "#e8d598", "#6b5d4d", "#14b8a6", "#f59e0b",
];

const ACCOUNT_ICONS: Record<string, string> = {
  checking: "\uD83C\uDFE6",
  savings_cdb: "\uD83D\uDCC8",
  emergency: "\uD83D\uDEE1\uFE0F",
  credit_card: "\uD83D\uDCB3",
  vr: "\uD83C\uDF7D\uFE0F",
  va: "\uD83D\uDED2",
  multi_benefit: "\uD83C\uDF1F",
};

export default function Dashboard() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategorySummary[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingAccount, setEditingAccount] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const start = monthStartStr();
  const end = monthEndStr();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      api.getTotals(start, end).then(setTotals),
      api.getByCategory(start, end, "expense").then(setExpensesByCategory),
      api.getDaily(start, end).then(setDaily),
      api.getAccounts().then(setAccounts),
    ]).catch((err) => setError(`Erro ao carregar dados: ${err.message}`));
  }, [start, end]);

  async function saveBalance(id: number) {
    const balance = parseFloat(editValue.replace(",", "."));
    if (isNaN(balance) || balance < 0) return;
    const updated = await api.updateAccountBalance(id, balance);
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? { ...a, balance: updated.balance } : a)));
    setEditingAccount(null);
    setEditValue("");
  }

  const netWorth = accounts.reduce((sum, a) => {
    if (a.type === "credit_card") return sum - (a.current_bill ?? 0);
    return sum + a.balance;
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{monthLabel()}</h1>

      {error && (
        <div className="bg-red-accent/10 border border-red-accent/30 rounded-lg p-3 text-sm text-red-accent">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card label="Ganhos" value={totals?.earnings ?? 0} color="text-green" />
        <Card label="Gastos" value={totals?.expenses ?? 0} color="text-red-accent" />
        <Card
          label="Saldo do mes"
          value={totals?.net ?? 0}
          color={(totals?.net ?? 0) >= 0 ? "text-green" : "text-red-accent"}
        />
      </div>

      {/* Accounts overview */}
      {accounts.length > 0 && (
        <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-light">Contas</h2>
            <span className={`text-sm font-bold ${netWorth >= 0 ? "text-green" : "text-red-accent"}`}>
              Patrimonio: {formatCurrency(netWorth)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.map((a) => (
              <div key={a.id} className="border border-cream-dark rounded-lg p-3 bg-cream/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{ACCOUNT_ICONS[a.type] ?? ""}</span>
                  <span className="text-xs text-ink-light truncate">{a.name}</span>
                </div>
                {a.type === "credit_card" ? (
                  <div>
                    <p className="text-sm font-bold text-red-accent">
                      Fatura: {formatCurrency(a.current_bill ?? 0)}
                    </p>
                    {editingAccount === a.id ? (
                      <div className="flex gap-1 mt-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Limite"
                          className="w-full border border-cream-dark rounded px-1.5 py-0.5 text-xs bg-paper"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && saveBalance(a.id)}
                        />
                        <button onClick={() => saveBalance(a.id)} className="text-xs text-green font-medium">OK</button>
                      </div>
                    ) : (
                      <p
                        className="text-xs text-ink-light cursor-pointer hover:text-ink"
                        onClick={() => { setEditingAccount(a.id); setEditValue(String(a.balance)); }}
                      >
                        Limite: {formatCurrency(a.balance)}
                      </p>
                    )}
                  </div>
                ) : editingAccount === a.id ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full border border-cream-dark rounded px-1.5 py-0.5 text-xs bg-paper"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && saveBalance(a.id)}
                    />
                    <button onClick={() => saveBalance(a.id)} className="text-xs text-green font-medium">OK</button>
                  </div>
                ) : (
                  <p
                    className={`text-sm font-bold cursor-pointer hover:opacity-70 ${a.balance >= 0 ? "text-green" : "text-red-accent"}`}
                    onClick={() => { setEditingAccount(a.id); setEditValue(String(a.balance)); }}
                  >
                    {formatCurrency(a.balance)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses by category */}
        <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-light mb-3">Gastos por categoria</h2>
          {expensesByCategory.length === 0 ? (
            <p className="text-ink-light text-sm">Sem dados</p>
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(props: any) =>
                    `${props.category_name}: ${formatCurrency(props.total)}`
                  }
                >
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily spending */}
        <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-light mb-3">Gastos diarios</h2>
          {daily.length === 0 ? (
            <p className="text-ink-light text-sm">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfca" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b5d4d" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5d4d" }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="expenses" fill="#b04a3a" name="Gastos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="earnings" fill="#1a6b4a" name="Ganhos" radius={[4, 4, 0, 0]} />
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
    <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
      <p className="text-sm text-ink-light">{label}</p>
      <p className={`text-xl font-bold font-display ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
