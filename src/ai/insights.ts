import { ask } from "./client.js";
import { MONTHLY_INSIGHTS_SYSTEM, ANOMALY_SYSTEM } from "./prompts.js";
import { getSummaryByCategory, getTotals } from "../db/transactions.js";
import { formatCurrency, monthStartStr, monthEndStr } from "../utils.js";

export async function generateMonthlyInsights(
  year: number,
  month: number,
): Promise<string | null> {
  const current = new Date(year, month - 1, 1);
  const previous = new Date(year, month - 2, 1);

  const curStart = monthStartStr(current);
  const curEnd = monthEndStr(current);
  const prevStart = monthStartStr(previous);
  const prevEnd = monthEndStr(previous);

  const curTotals = getTotals(curStart, curEnd);
  const prevTotals = getTotals(prevStart, prevEnd);
  const curExpenses = getSummaryByCategory("expense", curStart, curEnd);
  const curEarnings = getSummaryByCategory("earning", curStart, curEnd);
  const prevExpenses = getSummaryByCategory("expense", prevStart, prevEnd);

  let prompt = `Relatorio mensal: ${year}-${String(month).padStart(2, "0")}\n\n`;

  prompt += `Mes atual:\n`;
  prompt += `- Ganhos: ${formatCurrency(curTotals.earnings)}\n`;
  prompt += `- Gastos: ${formatCurrency(curTotals.expenses)}\n`;
  prompt += `- Saldo: ${formatCurrency(curTotals.earnings - curTotals.expenses)}\n\n`;

  prompt += `Mes anterior:\n`;
  prompt += `- Ganhos: ${formatCurrency(prevTotals.earnings)}\n`;
  prompt += `- Gastos: ${formatCurrency(prevTotals.expenses)}\n`;
  prompt += `- Saldo: ${formatCurrency(prevTotals.earnings - prevTotals.expenses)}\n\n`;

  if (curExpenses.length > 0) {
    prompt += "Gastos por categoria (mes atual):\n";
    for (const e of curExpenses) {
      prompt += `- ${e.category_name}: ${formatCurrency(e.total)} (${e.count}x)\n`;
    }
    prompt += "\n";
  }

  if (curEarnings.length > 0) {
    prompt += "Ganhos por categoria (mes atual):\n";
    for (const e of curEarnings) {
      prompt += `- ${e.category_name}: ${formatCurrency(e.total)} (${e.count}x)\n`;
    }
    prompt += "\n";
  }

  if (prevExpenses.length > 0) {
    prompt += "Gastos por categoria (mes anterior):\n";
    for (const e of prevExpenses) {
      prompt += `- ${e.category_name}: ${formatCurrency(e.total)} (${e.count}x)\n`;
    }
    prompt += "\n";
  }

  prompt += "Gere o relatorio mensal com analise e recomendacoes.";

  return ask(prompt, MONTHLY_INSIGHTS_SYSTEM, "sonnet");
}

export async function detectAnomalies(): Promise<string | null> {
  const now = new Date();
  const curStart = monthStartStr(now);
  const curEnd = monthEndStr(now);

  // Compare current month so far vs last 3 months average
  const curExpenses = getSummaryByCategory("expense", curStart, curEnd);

  const avgExpenses = new Map<string, number>();
  for (let i = 1; i <= 3; i++) {
    const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const pastStart = monthStartStr(past);
    const pastEnd = monthEndStr(past);
    const cats = getSummaryByCategory("expense", pastStart, pastEnd);
    for (const c of cats) {
      avgExpenses.set(c.category_name, (avgExpenses.get(c.category_name) ?? 0) + c.total / 3);
    }
  }

  let prompt = "Gastos do mes atual vs media dos ultimos 3 meses:\n\n";

  for (const c of curExpenses) {
    const avg = avgExpenses.get(c.category_name) ?? 0;
    prompt += `- ${c.category_name}: ${formatCurrency(c.total)} (media: ${formatCurrency(avg)})\n`;
  }

  // Categories that had spending before but not this month
  for (const [name, avg] of avgExpenses) {
    if (!curExpenses.find((c) => c.category_name === name)) {
      prompt += `- ${name}: R$0.00 (media: ${formatCurrency(avg)})\n`;
    }
  }

  return ask(prompt, ANOMALY_SYSTEM, "haiku");
}
