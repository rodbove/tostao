import { Context, InlineKeyboard } from "grammy";
import { getCategoriesByType } from "../../db/categories.js";
import { getBudgetProgress, setBudget } from "../../db/budgets.js";
import { formatCurrency } from "../../utils.js";

const pendingBudgets = new Map<number, { categoryId?: number }>();

export async function budgetCommand(ctx: Context): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const progress = getBudgetProgress(month);

  if (progress.length > 0) {
    let msg = `Orcamento de ${month}:\n\n`;
    for (const b of progress) {
      const bar = progressBar(b.percentage);
      const status = b.percentage >= 100 ? " ESTOURADO" : "";
      msg += `${b.category_icon} ${b.category_name}\n`;
      msg += `${bar} ${b.percentage.toFixed(0)}%${status}\n`;
      msg += `${formatCurrency(b.spent)} / ${formatCurrency(b.monthly_limit)}\n\n`;
    }
    msg += "Use /budget set para definir um novo orcamento.";
    await ctx.reply(msg);
    return;
  }

  await ctx.reply("Nenhum orcamento definido. Use /budget set para criar.");
}

export async function budgetSetCommand(ctx: Context): Promise<void> {
  const categories = getCategoriesByType("expense");
  const keyboard = new InlineKeyboard();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    keyboard.text(`${cat.icon} ${cat.name}`, `budget_cat:${cat.id}`);
    if (i % 2 === 1) keyboard.row();
  }

  const userId = ctx.from?.id;
  if (userId) pendingBudgets.set(userId, {});

  await ctx.reply("Para qual categoria?", { reply_markup: keyboard });
}

export async function handleBudgetCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("budget_cat:")) return;

  const categoryId = parseInt(data.split(":")[1]);
  const userId = ctx.from?.id;
  if (userId) pendingBudgets.set(userId, { categoryId });

  await ctx.editMessageText("Qual o limite mensal? (ex: 500)");
  await ctx.answerCallbackQuery();
}

export async function handleBudgetAmount(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId || !pendingBudgets.has(userId)) return false;

  const pending = pendingBudgets.get(userId)!;
  if (!pending.categoryId) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  const amount = parseFloat(text.replace(",", "."));
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Valor invalido. Envie um numero, ex: 500");
    return true;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  setBudget(pending.categoryId, amount, month);
  pendingBudgets.delete(userId);

  await ctx.reply(`Orcamento de ${formatCurrency(amount)} definido para ${month}.`);
  return true;
}

function progressBar(pct: number): string {
  const clamped = Math.min(100, pct);
  const filled = Math.round(clamped / 10);
  const empty = 10 - filled;
  return "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
}
