import { useEffect, useState } from "react";
import { api, type Goal, type BudgetProgress } from "../api/client";
import { formatCurrency, formatDate } from "../utils";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    api.getGoals().then(setGoals);
    api.getBudgetProgress(month).then(setBudgets);
  }, [month]);

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(newTarget);
    if (!newName || isNaN(target) || target <= 0) return;

    const goal = await api.createGoal(newName, target, newDeadline || undefined);
    setGoals((prev) => [goal, ...prev]);
    setNewName("");
    setNewTarget("");
    setNewDeadline("");
    setShowNewGoal(false);
  }

  async function handleDeposit(goalId: number) {
    const input = prompt("Quanto depositar?");
    if (!input) return;
    const amount = parseFloat(input.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;

    await api.depositGoal(goalId, amount);
    const updated = await api.getGoals();
    setGoals(updated);
  }

  async function handleDeleteGoal(goalId: number) {
    await api.deleteGoal(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas & Orcamento</h1>
        <button
          onClick={() => setShowNewGoal(!showNewGoal)}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700"
        >
          + Nova meta
        </button>
      </div>

      {showNewGoal && (
        <form onSubmit={handleCreateGoal} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nome da meta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              required
            />
            <input
              type="number"
              placeholder="Valor alvo"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              min="1"
              step="0.01"
              required
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm hover:bg-emerald-700">
            Criar
          </button>
        </form>
      )}

      {/* Goals */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">Metas de economia</h2>
        {goals.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma meta cadastrada</p>
        ) : (
          goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
            return (
              <div key={g.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{g.name}</span>
                    {g.deadline && (
                      <span className="text-xs text-gray-400 ml-2">prazo: {formatDate(g.deadline)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeposit(g.id)}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                    >
                      + depositar
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      excluir
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Budget progress */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">Orcamento de {month}</h2>
        {budgets.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum orcamento definido (use /budgetset no bot)</p>
        ) : (
          budgets.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{b.category_icon} {b.category_name}</span>
                {b.percentage >= 100 && (
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded">ESTOURADO</span>
                )}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                <div
                  className={`h-3 rounded-full transition-all ${b.percentage >= 100 ? "bg-red-500" : b.percentage >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}</span>
                <span>{b.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
