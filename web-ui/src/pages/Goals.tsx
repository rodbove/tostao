import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { api, type Goal, type BudgetProgress } from "../api/client";
import { formatCurrency, formatDate } from "../utils";

function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-ink-light leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1 [&_strong]:text-ink">
      <Markdown>{children}</Markdown>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  // AI goal creation
  const [showAiGoal, setShowAiGoal] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiDeadline, setAiDeadline] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // AI budget planning
  const [budgetSuggestion, setBudgetSuggestion] = useState<string | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

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

  async function handleAiPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!aiDescription) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const data = await api.planGoal(aiDescription, aiDeadline || undefined);
      setAiSuggestion(data.suggestion);
    } catch {
      setAiSuggestion("Erro ao gerar sugestao.");
    }
    setAiLoading(false);
  }

  async function handleBudgetPlan() {
    setBudgetLoading(true);
    setBudgetSuggestion(null);
    try {
      const data = await api.planBudget();
      setBudgetSuggestion(data.suggestion);
    } catch {
      setBudgetSuggestion("Erro ao gerar plano de orcamento.");
    }
    setBudgetLoading(false);
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
        <h1 className="text-2xl font-bold text-ink">Metas & Orcamento</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAiGoal(!showAiGoal); setShowNewGoal(false); }}
            className="border border-gold text-gold px-3 py-1.5 rounded text-sm hover:bg-gold/10"
          >
            + Meta com IA
          </button>
          <button
            onClick={() => { setShowNewGoal(!showNewGoal); setShowAiGoal(false); }}
            className="bg-green text-white px-3 py-1.5 rounded text-sm hover:bg-green-dark"
          >
            + Nova meta
          </button>
        </div>
      </div>

      {/* Manual goal creation */}
      {showNewGoal && (
        <form onSubmit={handleCreateGoal} className="bg-paper rounded-lg border border-cream-dark p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nome da meta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
              required
            />
            <input
              type="number"
              placeholder="Valor alvo"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
              min="1"
              step="0.01"
              required
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
            />
          </div>
          <button type="submit" className="bg-green text-white px-4 py-1.5 rounded text-sm hover:bg-green-dark">
            Criar
          </button>
        </form>
      )}

      {/* AI-assisted goal creation */}
      {showAiGoal && (
        <div className="bg-paper rounded-lg border border-cream-dark p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-light">Criar meta com ajuda da IA</h3>
          <form onSubmit={handleAiPlan} className="space-y-3">
            <input
              type="text"
              placeholder="O que voce quer conquistar? (ex: viagem, carro, reserva)"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              className="w-full border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
              required
            />
            <input
              type="text"
              placeholder="Expectativa de prazo (ex: 6 meses, fim do ano, ou deixe vazio)"
              value={aiDeadline}
              onChange={(e) => setAiDeadline(e.target.value)}
              className="w-full border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="bg-green text-white px-4 py-1.5 rounded text-sm hover:bg-green-dark disabled:opacity-50"
            >
              {aiLoading ? "Analisando..." : "Analisar com IA"}
            </button>
          </form>
          {aiSuggestion && (
            <div className="mt-3 border-t border-cream-dark pt-3">
              <Md>{aiSuggestion}</Md>
            </div>
          )}
        </div>
      )}

      {/* Goals */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-light">Metas de economia</h2>
        {goals.length === 0 ? (
          <p className="text-ink-light text-sm">Nenhuma meta cadastrada</p>
        ) : (
          goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
            return (
              <div key={g.id} className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-ink">{g.name}</span>
                    {g.deadline && (
                      <span className="text-xs text-ink-light ml-2">prazo: {formatDate(g.deadline)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeposit(g.id)}
                      className="text-green hover:text-green-dark text-xs font-medium"
                    >
                      + depositar
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="text-ink-light hover:text-red-accent text-xs"
                    >
                      excluir
                    </button>
                  </div>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-3 mb-1">
                  <div
                    className="bg-gold h-3 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-ink-light">
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-light">Orcamento de {month}</h2>
          <button
            onClick={handleBudgetPlan}
            disabled={budgetLoading}
            className="text-sm text-gold hover:text-gold-light font-medium disabled:opacity-50"
          >
            {budgetLoading ? "Planejando..." : budgetSuggestion ? "Replanejar com IA" : "Planejar com IA"}
          </button>
        </div>

        {budgetSuggestion && (
          <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
            <Md>{budgetSuggestion}</Md>
          </div>
        )}

        {budgets.length === 0 && !budgetSuggestion ? (
          <p className="text-ink-light text-sm">Nenhum orcamento definido (use /budgetset no bot)</p>
        ) : (
          budgets.map((b) => (
            <div key={b.id} className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-ink">{b.category_icon} {b.category_name}</span>
                {b.percentage >= 100 && (
                  <span className="text-xs font-semibold text-red-accent bg-red-accent/10 px-2 py-0.5 rounded">ESTOURADO</span>
                )}
              </div>
              <div className="w-full bg-cream-dark rounded-full h-3 mb-1">
                <div
                  className={`h-3 rounded-full transition-all ${b.percentage >= 100 ? "bg-red-accent" : b.percentage >= 80 ? "bg-gold" : "bg-green"}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-ink-light">
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
