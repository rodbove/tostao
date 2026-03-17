import { Context } from "grammy";
import {
  getTransactionsByDate,
  getSummaryByCategory,
  getTotals,
  getBalance,
  type TransactionWithCategory,
} from "../../db/transactions.js";
import { getBudgetProgress } from "../../db/budgets.js";
import { formatCurrency, todayStr, weekStartStr, monthStartStr, monthEndStr } from "../../utils.js";

function formatTransaction(t: TransactionWithCategory): string {
  const sign = t.type === "earning" ? "+" : "-";
  const icon = t.category_icon ?? "";
  const desc = t.description ? ` ${t.description}` : "";
  const pm = t.payment_method === "credit" ? " [credito]" : t.payment_method === "debit" ? " [debito]" : "";
  return `${icon} ${sign}${formatCurrency(t.amount)}${desc}${pm}`;
}

export async function todayCommand(ctx: Context): Promise<void> {
  const today = todayStr();
  const transactions = getTransactionsByDate(today);

  if (transactions.length === 0) {
    await ctx.reply("Nenhum registro hoje.");
    return;
  }

  const totals = getTotals(today, today);
  const lines = transactions.map(formatTransaction);

  await ctx.reply(
    `Hoje (${today}):\n\n${lines.join("\n")}\n\n` +
    `Gastos: ${formatCurrency(totals.expenses)}\n` +
    `Ganhos: ${formatCurrency(totals.earnings)}\n` +
    `Saldo: ${formatCurrency(totals.earnings - totals.expenses)}`,
  );
}

export async function weekCommand(ctx: Context): Promise<void> {
  const start = weekStartStr();
  const end = todayStr();

  const totals = getTotals(start, end);
  const expensesByCategory = getSummaryByCategory("expense", start, end);
  const earningsByCategory = getSummaryByCategory("earning", start, end);

  if (totals.expenses === 0 && totals.earnings === 0) {
    await ctx.reply("Nenhum registro esta semana.");
    return;
  }

  let msg = `Semana (${start} a ${end}):\n\n`;

  if (earningsByCategory.length > 0) {
    msg += "Ganhos:\n";
    for (const c of earningsByCategory) {
      msg += `  ${c.category_icon} ${c.category_name}: ${formatCurrency(c.total)} (${c.count}x)\n`;
    }
    msg += "\n";
  }

  if (expensesByCategory.length > 0) {
    msg += "Gastos:\n";
    for (const c of expensesByCategory) {
      msg += `  ${c.category_icon} ${c.category_name}: ${formatCurrency(c.total)} (${c.count}x)\n`;
    }
    msg += "\n";
  }

  msg += `Total gastos: ${formatCurrency(totals.expenses)}\n`;
  msg += `Total ganhos: ${formatCurrency(totals.earnings)}\n`;
  msg += `Saldo: ${formatCurrency(totals.earnings - totals.expenses)}`;

  await ctx.reply(msg);
}

export async function monthCommand(ctx: Context): Promise<void> {
  const start = monthStartStr();
  const end = monthEndStr();

  const totals = getTotals(start, end);
  const expensesByCategory = getSummaryByCategory("expense", start, end);
  const earningsByCategory = getSummaryByCategory("earning", start, end);

  if (totals.expenses === 0 && totals.earnings === 0) {
    await ctx.reply("Nenhum registro este mes.");
    return;
  }

  let msg = `Mes (${start} a ${end}):\n\n`;

  if (earningsByCategory.length > 0) {
    msg += "Ganhos:\n";
    for (const c of earningsByCategory) {
      msg += `  ${c.category_icon} ${c.category_name}: ${formatCurrency(c.total)} (${c.count}x)\n`;
    }
    msg += "\n";
  }

  if (expensesByCategory.length > 0) {
    msg += "Gastos:\n";
    for (const c of expensesByCategory) {
      msg += `  ${c.category_icon} ${c.category_name}: ${formatCurrency(c.total)} (${c.count}x)\n`;
    }
    msg += "\n";
  }

  msg += `Total gastos: ${formatCurrency(totals.expenses)}\n`;
  msg += `Total ganhos: ${formatCurrency(totals.earnings)}\n`;
  msg += `Saldo: ${formatCurrency(totals.earnings - totals.expenses)}`;

  // Budget progress
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const budgets = getBudgetProgress(month);
  if (budgets.length > 0) {
    msg += "\n\nOrcamento:\n";
    for (const b of budgets) {
      const filled = Math.round(Math.min(100, b.percentage) / 10);
      const empty = 10 - filled;
      const bar = "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
      const status = b.percentage >= 100 ? " ESTOURADO" : "";
      msg += `${b.category_icon} ${b.category_name}: ${bar} ${b.percentage.toFixed(0)}%${status}\n`;
      msg += `  ${formatCurrency(b.spent)} / ${formatCurrency(b.monthly_limit)}\n`;
    }
  }

  await ctx.reply(msg);
}

export async function balanceCommand(ctx: Context): Promise<void> {
  const { expenses, earnings, balance } = getBalance();

  await ctx.reply(
    `Saldo geral:\n\n` +
    `Total ganhos: ${formatCurrency(earnings)}\n` +
    `Total gastos: ${formatCurrency(expenses)}\n` +
    `Saldo: ${formatCurrency(balance)}`,
  );
}
