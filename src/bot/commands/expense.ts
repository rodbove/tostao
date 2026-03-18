import { Context, InlineKeyboard } from "grammy";
import { getCategoriesByType } from "../../db/categories.js";
import { addTransaction, type PaymentType } from "../../db/transactions.js";
import { getAllCards, getAccountsByType, type CardWithAccount } from "../../db/accounts.js";
import { formatCurrency } from "../../utils.js";

// In-memory state for multi-step expense flow per user
const pendingExpenses = new Map<number, { amount: number; description?: string }>();
// Pending installment input: user must type a number
const pendingInstallments = new Map<number, {
  amount: number;
  categoryId?: number;
  description?: string;
  cardId: number;
}>();

export async function expenseCommand(ctx: Context): Promise<void> {
  const text = ctx.match as string | undefined;

  if (text) {
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
  if (!userId) return false;

  // Handle pending installment number input
  if (pendingInstallments.has(userId)) {
    const text = ctx.message?.text?.trim();
    if (!text) return false;
    const n = parseInt(text);
    if (isNaN(n) || n < 2 || n > 48) {
      await ctx.reply("Numero de parcelas invalido (2-48). Tente novamente:");
      return true;
    }
    const pending = pendingInstallments.get(userId)!;
    pendingInstallments.delete(userId);

    const tx = addTransaction({
      type: "expense",
      amount: pending.amount,
      description: pending.description,
      categoryId: pending.categoryId,
      paymentType: "credit",
      cardId: pending.cardId,
      installments: n,
    });

    const perMonth = Math.round((pending.amount / n) * 100) / 100;
    await ctx.reply(
      `Gasto parcelado registrado: ${formatCurrency(tx.amount)} em ${n}x de ${formatCurrency(perMonth)}`,
    );
    return true;
  }

  // Handle pending amount input
  if (!pendingExpenses.has(userId)) return false;

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

// Step 2: After category selection → show payment options
export async function handleExpenseCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("exp:")) return;

  const [, amountStr, catIdStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const description = descParts.join(":") || undefined;

  // Build payment method keyboard with registered cards + pix/boleto
  const cards = getAllCards();
  const keyboard = new InlineKeyboard();

  // Group cards by type
  const creditCards = cards.filter((c) => c.type === "credit");
  const debitCards = cards.filter((c) => c.type === "debit");
  const benefitCards = cards.filter((c) => c.type === "benefit");

  for (const card of debitCards) {
    keyboard.text(`💳 ${card.name}`, `exppay:${amountStr}:${catIdStr}:debit:${card.id}:${description ?? ""}`).row();
  }
  for (const card of creditCards) {
    keyboard.text(`💳 ${card.name}`, `exppay:${amountStr}:${catIdStr}:credit:${card.id}:${description ?? ""}`).row();
  }
  for (const card of benefitCards) {
    keyboard.text(`🎫 ${card.name}`, `exppay:${amountStr}:${catIdStr}:benefit:${card.id}:${description ?? ""}`).row();
  }

  keyboard.text("Pix", `exppay:${amountStr}:${catIdStr}:pix:0:${description ?? ""}`);
  keyboard.text("Boleto", `exppay:${amountStr}:${catIdStr}:boleto:0:${description ?? ""}`);
  keyboard.row();
  keyboard.text("Sem especificar", `exppay:${amountStr}:${catIdStr}:none:0:${description ?? ""}`);

  await ctx.editMessageText(
    `Gasto de ${formatCurrency(amount)}. Como voce pagou?`,
    { reply_markup: keyboard },
  );
  await ctx.answerCallbackQuery();
}

// Step 3: After payment selection
export async function handleExpensePaymentCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("exppay:")) return;

  const [, amountStr, catIdStr, pt, cardIdStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const categoryId = parseInt(catIdStr) || undefined;
  const cardId = parseInt(cardIdStr) || undefined;
  const description = descParts.join(":") || undefined;

  // If pix or boleto → need to pick account
  if (pt === "pix" || pt === "boleto") {
    const accounts = getAccountsByType("checking");
    if (accounts.length === 1) {
      // Only one checking account, use it directly
      const tx = addTransaction({
        type: "expense",
        amount,
        description,
        categoryId,
        paymentType: pt as PaymentType,
        accountId: accounts[0].id,
      });
      await ctx.editMessageText(formatConfirmation(tx.amount, categoryId, description, pt, accounts[0].name));
      await ctx.answerCallbackQuery();
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const acc of accounts) {
      keyboard.text(`🏦 ${acc.name}`, `expacc:${amountStr}:${catIdStr}:${pt}:${acc.id}:${description ?? ""}`).row();
    }

    await ctx.editMessageText(
      `Gasto de ${formatCurrency(amount)} no ${pt}. De qual conta?`,
      { reply_markup: keyboard },
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // If credit card → ask installment
  if (pt === "credit" && cardId) {
    const keyboard = new InlineKeyboard()
      .text("A vista", `expinst:${amountStr}:${catIdStr}:${cardId}:1:${description ?? ""}`)
      .text("Parcelado", `expinst:${amountStr}:${catIdStr}:${cardId}:ask:${description ?? ""}`);

    await ctx.editMessageText(
      `Gasto de ${formatCurrency(amount)} no credito. A vista ou parcelado?`,
      { reply_markup: keyboard },
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Direct: debit card, benefit card, or "none"
  const paymentType = pt === "none" ? undefined : (pt as PaymentType);
  const tx = addTransaction({
    type: "expense",
    amount,
    description,
    categoryId,
    paymentType,
    cardId,
  });

  const cardName = cardId ? getAllCards().find((c) => c.id === cardId)?.name : undefined;
  await ctx.editMessageText(formatConfirmation(tx.amount, categoryId, description, pt, cardName));
  await ctx.answerCallbackQuery();
}

// Step 3b: Account selection for pix/boleto
export async function handleExpenseAccountCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("expacc:")) return;

  const [, amountStr, catIdStr, pt, accIdStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const categoryId = parseInt(catIdStr) || undefined;
  const accountId = parseInt(accIdStr);
  const description = descParts.join(":") || undefined;

  const tx = addTransaction({
    type: "expense",
    amount,
    description,
    categoryId,
    paymentType: pt as PaymentType,
    accountId,
  });

  const accName = getAccountsByType("checking").find((a) => a.id === accountId)?.name;
  await ctx.editMessageText(formatConfirmation(tx.amount, categoryId, description, pt, accName));
  await ctx.answerCallbackQuery();
}

// Step 4: Installment handling for credit
export async function handleExpenseInstallmentCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("expinst:")) return;

  const [, amountStr, catIdStr, cardIdStr, installStr, ...descParts] = data.split(":");
  const amount = parseFloat(amountStr);
  const categoryId = parseInt(catIdStr) || undefined;
  const cardId = parseInt(cardIdStr);
  const description = descParts.join(":") || undefined;

  if (installStr === "ask") {
    // Show common installment options
    const keyboard = new InlineKeyboard()
      .text("2x", `expinst:${amountStr}:${catIdStr}:${cardIdStr}:2:${description ?? ""}`)
      .text("3x", `expinst:${amountStr}:${catIdStr}:${cardIdStr}:3:${description ?? ""}`)
      .text("6x", `expinst:${amountStr}:${catIdStr}:${cardIdStr}:6:${description ?? ""}`)
      .row()
      .text("10x", `expinst:${amountStr}:${catIdStr}:${cardIdStr}:10:${description ?? ""}`)
      .text("12x", `expinst:${amountStr}:${catIdStr}:${cardIdStr}:12:${description ?? ""}`);

    await ctx.editMessageText(
      `Gasto de ${formatCurrency(amount)} parcelado. Em quantas vezes?`,
      { reply_markup: keyboard },
    );
    await ctx.answerCallbackQuery();
    return;
  }

  const installments = parseInt(installStr);
  const tx = addTransaction({
    type: "expense",
    amount,
    description,
    categoryId,
    paymentType: "credit",
    cardId,
    installments: installments > 1 ? installments : undefined,
  });

  const cardName = getAllCards().find((c) => c.id === cardId)?.name;
  let msg = formatConfirmation(tx.amount, categoryId, description, "credit", cardName);
  if (installments > 1) {
    const perMonth = Math.round((amount / installments) * 100) / 100;
    msg += ` | ${installments}x de ${formatCurrency(perMonth)}`;
  }

  await ctx.editMessageText(msg);
  await ctx.answerCallbackQuery();
}

function formatConfirmation(
  amount: number,
  categoryId: number | undefined,
  description: string | undefined,
  paymentType: string,
  sourceName?: string,
): string {
  const categories = getCategoriesByType("expense");
  const cat = categories.find((c) => c.id === categoryId);
  const catLabel = cat ? ` | ${cat.icon} ${cat.name}` : "";
  const descLabel = description ? ` | ${description}` : "";

  const ptLabels: Record<string, string> = {
    debit: "Debito",
    credit: "Credito",
    pix: "Pix",
    boleto: "Boleto",
    benefit: "Beneficio",
    none: "",
  };
  const ptLabel = ptLabels[paymentType] ?? "";
  const sourceLabel = sourceName ? ` (${sourceName})` : "";

  return `Gasto registrado: ${formatCurrency(amount)}${catLabel}${descLabel}${ptLabel ? ` | ${ptLabel}${sourceLabel}` : ""}`;
}
