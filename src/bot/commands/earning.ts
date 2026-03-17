import { Context, InlineKeyboard } from "grammy";
import { getCategoriesByType } from "../../db/categories.js";
import { addTransaction } from "../../db/transactions.js";
import { formatCurrency } from "../../utils.js";

const pendingEarnings = new Map<number, { amount: number }>();

export async function earningCommand(ctx: Context): Promise<void> {
  const text = ctx.match as string | undefined;

  if (text) {
    const match = text.match(/^(\d+(?:[.,]\d{1,2})?)\s*(.*)$/);
    if (match) {
      const amount = parseFloat(match[1].replace(",", "."));
      const description = match[2] || undefined;
      return showEarningCategoryPicker(ctx, amount, description);
    }
  }

  await ctx.reply("Quanto voce recebeu? (envie o valor, ex: 3000)");
  const userId = ctx.from?.id;
  if (userId) pendingEarnings.set(userId, { amount: 0 });
}

export async function handleEarningAmount(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId || !pendingEarnings.has(userId)) return false;

  const pending = pendingEarnings.get(userId)!;
  if (pending.amount === 0) {
    const text = ctx.message?.text?.trim();
    if (!text) return false;

    const amount = parseFloat(text.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("Valor invalido. Envie um numero, ex: 3000");
      return true;
    }

    pendingEarnings.delete(userId);
    await showEarningCategoryPicker(ctx, amount);
    return true;
  }

  return false;
}

async function showEarningCategoryPicker(
  ctx: Context,
  amount: number,
  description?: string,
): Promise<void> {
  const categories = getCategoriesByType("earning");
  const keyboard = new InlineKeyboard();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    keyboard.text(
      `${cat.icon} ${cat.name}`,
      `ear:${amount}:${cat.id}:${description ?? ""}`,
    );
    if (i % 2 === 1) keyboard.row();
  }
  keyboard.row().text("Sem categoria", `ear:${amount}:0:${description ?? ""}`);

  await ctx.reply(
    `Ganho de ${formatCurrency(amount)}. Qual categoria?`,
    { reply_markup: keyboard },
  );
}

export async function handleEarningCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("ear:")) return;

  const [, amountStr, catIdStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const categoryId = parseInt(catIdStr) || undefined;
  const description = descParts.join(":") || undefined;

  const tx = addTransaction("earning", amount, description, categoryId);
  const categories = getCategoriesByType("earning");
  const cat = categories.find((c) => c.id === categoryId);
  const catLabel = cat ? `${cat.icon} ${cat.name}` : "";

  await ctx.editMessageText(
    `Ganho registrado: ${formatCurrency(tx.amount)}${catLabel ? ` | ${catLabel}` : ""}${description ? ` | ${description}` : ""}`,
  );
  await ctx.answerCallbackQuery();
}
