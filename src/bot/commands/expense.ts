import { Context, InlineKeyboard } from "grammy";
import { getCategoriesByType } from "../../db/categories.js";
import { addTransaction } from "../../db/transactions.js";
import { formatCurrency } from "../../utils.js";

// In-memory state for multi-step expense flow per user
const pendingExpenses = new Map<number, { amount: number; description?: string }>();

export async function expenseCommand(ctx: Context): Promise<void> {
  const text = ctx.match as string | undefined;

  if (text) {
    // Direct usage: /expense 50 lunch
    const match = text.match(/^(\d+(?:[.,]\d{1,2})?)\s*(.*)$/);
    if (match) {
      const amount = parseFloat(match[1].replace(",", "."));
      const description = match[2] || undefined;
      return showCategoryPicker(ctx, amount, description);
    }
  }

  await ctx.reply("Quanto voce gastou? (envie o valor, ex: 50 ou 12.50)");
  const userId = ctx.from?.id;
  if (userId) pendingExpenses.set(userId, { amount: 0 });
}

export async function handleExpenseAmount(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId || !pendingExpenses.has(userId)) return false;

  const pending = pendingExpenses.get(userId)!;
  if (pending.amount === 0) {
    const text = ctx.message?.text?.trim();
    if (!text) return false;

    const amount = parseFloat(text.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("Valor invalido. Envie um numero, ex: 50 ou 12.50");
      return true;
    }

    pendingExpenses.delete(userId);
    await showCategoryPicker(ctx, amount);
    return true;
  }

  return false;
}

async function showCategoryPicker(
  ctx: Context,
  amount: number,
  description?: string,
): Promise<void> {
  const categories = getCategoriesByType("expense");
  const keyboard = new InlineKeyboard();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    keyboard.text(
      `${cat.icon} ${cat.name}`,
      `exp:${amount}:${cat.id}:${description ?? ""}`,
    );
    if (i % 2 === 1) keyboard.row();
  }
  keyboard.row().text("Sem categoria", `exp:${amount}:0:${description ?? ""}`);

  await ctx.reply(
    `Gasto de ${formatCurrency(amount)}. Qual categoria?`,
    { reply_markup: keyboard },
  );
}

export async function handleExpenseCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("exp:")) return;

  const [, amountStr, catIdStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const categoryId = parseInt(catIdStr) || undefined;
  const description = descParts.join(":") || undefined;

  const tx = addTransaction("expense", amount, description, categoryId);
  const categories = getCategoriesByType("expense");
  const cat = categories.find((c) => c.id === categoryId);
  const catLabel = cat ? `${cat.icon} ${cat.name}` : "";

  await ctx.editMessageText(
    `Gasto registrado: ${formatCurrency(tx.amount)}${catLabel ? ` | ${catLabel}` : ""}${description ? ` | ${description}` : ""}`,
  );
  await ctx.answerCallbackQuery();
}
