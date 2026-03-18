import { ask } from "./client.js";
import { FINANCE_ADVISOR_SYSTEM, GOAL_PLANNER_SYSTEM, BUDGET_PLANNER_SYSTEM } from "./prompts.js";
import { getSummaryByCategory, getTotals, getBalance } from "../db/transactions.js";
import { getBudgetProgress } from "../db/budgets.js";
import { getAllGoals } from "../db/goals.js";
import { getAllAccounts } from "../db/accounts.js";
import { formatCurrency, monthStartStr, monthEndStr } from "../utils.js";

function getFinancialContext(): string {
  const start = monthStartStr();
  const end = monthEndStr();

  const totals = getTotals(start, end);
  const balance = getBalance();
  const expenses = getSummaryByCategory("expense", start, end);
  const earnings = getSummaryByCategory("earning", start, end);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const budgets = getBudgetProgress(month);
  const goals = getAllGoals();
  const accounts = getAllAccounts();

  // Also get last 3 months for averages
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
  const avgStart = monthStartStr(threeMonthsAgo);
  const avgTotals = getTotals(avgStart, end);
  const monthsSpan = 3;
  const avgMonthlyEarnings = avgTotals.earnings / monthsSpan;
  const avgMonthlyExpenses = avgTotals.expenses / monthsSpan;

  let context = `Dados financeiros do mes atual (${start} a ${end}):\n\n`;

  context += `Saldo geral (historico): ${formatCurrency(balance.balance)}\n`;
  context += `Ganhos este mes: ${formatCurrency(totals.earnings)}\n`;
  context += `Gastos este mes: ${formatCurrency(totals.expenses)}\n`;
  context += `Saldo do mes: ${formatCurrency(totals.earnings - totals.expenses)}\n\n`;

  context += `Medias mensais (ultimos 3 meses):\n`;
  context += `- Ganhos: ${formatCurrency(avgMonthlyEarnings)}\n`;
  context += `- Gastos: ${formatCurrency(avgMonthlyExpenses)}\n`;
  context += `- Economia media: ${formatCurrency(avgMonthlyEarnings - avgMonthlyExpenses)}\n\n`;

  if (accounts.length > 0) {
    context += "Contas:\n";
    for (const a of accounts) {
      context += `- ${a.name} (${a.type}): ${formatCurrency(a.balance)}\n`;
    }
    context += "\n";
  }

  if (expenses.length > 0) {
    context += "Gastos por categoria:\n";
    for (const e of expenses) {
      context += `- ${e.category_name}: ${formatCurrency(e.total)} (${e.count} transacoes)\n`;
    }
    context += "\n";
  }

  if (earnings.length > 0) {
    context += "Ganhos por categoria:\n";
    for (const e of earnings) {
      context += `- ${e.category_name}: ${formatCurrency(e.total)} (${e.count} transacoes)\n`;
    }
    context += "\n";
  }

  if (budgets.length > 0) {
    context += "Orcamentos:\n";
    for (const b of budgets) {
      context += `- ${b.category_name}: ${formatCurrency(b.spent)} / ${formatCurrency(b.monthly_limit)} (${b.percentage.toFixed(0)}%)\n`;
    }
    context += "\n";
  }

  if (goals.length > 0) {
    context += "Metas de economia:\n";
    for (const g of goals) {
      const pct = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(0) : "0";
      const deadlineStr = g.deadline ? ` — prazo: ${g.deadline}` : "";
      context += `- ${g.name}: ${formatCurrency(g.current_amount)} / ${formatCurrency(g.target_amount)} (${pct}%)${deadlineStr}\n`;
    }
    context += "\n";
  }

  return context;
}

export async function getFinancialAdvice(question?: string): Promise<string | null> {
  const context = getFinancialContext();

  const prompt = question
    ? `${context}\nPergunta do usuario: ${question}`
    : `${context}\nDe conselhos gerais sobre as financas do usuario baseado nos dados acima.`;

  return ask(prompt, FINANCE_ADVISOR_SYSTEM, "sonnet");
}

export async function planGoal(description: string, deadline?: string): Promise<string | null> {
  const context = getFinancialContext();

  let prompt = `${context}\nO usuario quer criar uma nova meta:\n`;
  prompt += `Descricao: ${description}\n`;
  if (deadline) {
    prompt += `Expectativa de prazo: ${deadline}\n`;
  } else {
    prompt += `Sem prazo definido — sugira um prazo realista.\n`;
  }
  prompt += `\nAnalise a viabilidade e sugira valores e prazo realistas.`;

  return ask(prompt, GOAL_PLANNER_SYSTEM, "sonnet");
}

export async function planBudget(): Promise<string | null> {
  const context = getFinancialContext();

  const prompt = `${context}\nCom base nos dados acima, crie um plano de orcamento mensal que considere as metas de economia ativas e distribua o gasto livre entre as categorias.`;

  return ask(prompt, BUDGET_PLANNER_SYSTEM, "sonnet");
}
