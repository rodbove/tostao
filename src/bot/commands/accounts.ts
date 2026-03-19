import { Context, InlineKeyboard } from "grammy";
import {
  getAllAccounts, getAllCards, setAccountBalance, getCreditCardBill,
  createAccount, createCard, deleteAccount, deleteCard,
  type Account, type AccountType, type CardType,
} from "../../db/accounts.js";
import { formatCurrency } from "../../utils.js";

const pendingBalanceUpdate = new Map<number, { accountId: number }>();
const pendingNewAccount = new Map<number, { step: "name" | "closing_day"; type: AccountType; name?: string }>();
const pendingNewCard = new Map<number, { step: "name"; accountId: number; type: CardType }>();

const TYPE_ICONS: Record<string, string> = {
  checking: "\uD83C\uDFE6",
  savings_cdb: "\uD83D\uDCC8",
  emergency: "\uD83D\uDEE1\uFE0F",
  credit_card: "\uD83D\uDCB3",
  vr: "\uD83C\uDF7D\uFE0F",
  va: "\uD83D\uDED2",
  multi_benefit: "\uD83C\uDF1F",
};

const TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings_cdb: "CDB / Investimento",
  emergency: "Reserva de emergencia",
  credit_card: "Cartao de credito",
  vr: "Vale refeicao",
  va: "Vale alimentacao",
  multi_benefit: "Multi-beneficios",
};

function formatAccountLine(a: Account, creditBill?: number): string {
  const icon = TYPE_ICONS[a.type] ?? "";
  if (a.type === "credit_card") {
    const bill = creditBill ?? 0;
    return `${icon} ${a.name}: Fatura ${formatCurrency(bill)} | Limite: ${formatCurrency(a.balance)}`;
  }
  return `${icon} ${a.name}: ${formatCurrency(a.balance)}`;
}

export async function accountsCommand(ctx: Context): Promise<void> {
  const accounts = getAllAccounts();
  const cards = getAllCards();

  if (accounts.length === 0) {
    await ctx.reply("Nenhuma conta cadastrada.");
    return;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let total = 0;
  const lines: string[] = [];

  for (const a of accounts) {
    const bill = a.type === "credit_card" ? getCreditCardBill(a.id, month) : undefined;
    lines.push(formatAccountLine(a, bill));

    // Show cards under this account
    const accountCards = cards.filter((c) => c.account_id === a.id);
    for (const card of accountCards) {
      lines.push(`  \uD83D\uDCB3 ${card.name} (${card.type})`);
    }

    if (a.type !== "credit_card") {
      total += a.balance;
    } else {
      total -= (bill ?? 0);
    }
  }

  lines.push("");
  lines.push(`Patrimonio liquido: ${formatCurrency(total)}`);

  await ctx.reply(`Suas contas:\n\n${lines.join("\n")}`);
}

export async function setBalanceCommand(ctx: Context): Promise<void> {
  const accounts = getAllAccounts();

  const keyboard = new InlineKeyboard();
  for (const a of accounts) {
    const icon = TYPE_ICONS[a.type] ?? "";
    keyboard.text(`${icon} ${a.name}`, `setbal:${a.id}`).row();
  }

  await ctx.reply("Qual conta deseja atualizar?", { reply_markup: keyboard });
}

export async function handleSetBalanceCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("setbal:")) return;

  const accountId = parseInt(data.split(":")[1]);
  const userId = ctx.from?.id;
  if (userId) {
    pendingBalanceUpdate.set(userId, { accountId });
  }

  await ctx.editMessageText("Envie o novo saldo (ex: 5000 ou 1234.56)");
  await ctx.answerCallbackQuery();
}

export async function handleSetBalanceAmount(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  // Handle pending new account name/closing_day
  if (pendingNewAccount.has(userId)) {
    const pending = pendingNewAccount.get(userId)!;
    if (pending.step === "name") {
      pending.name = text;
      if (pending.type === "credit_card") {
        pending.step = "closing_day";
        await ctx.reply("Qual o dia de fechamento da fatura? (1-28)");
        return true;
      }
      pendingNewAccount.delete(userId);
      const account = createAccount(pending.name!, pending.type);
      const icon = TYPE_ICONS[account.type] ?? "";
      await ctx.reply(`${icon} Conta criada: ${account.name} (${TYPE_LABELS[account.type]})`);
      return true;
    }
    if (pending.step === "closing_day") {
      const day = parseInt(text);
      if (isNaN(day) || day < 1 || day > 28) {
        await ctx.reply("Dia invalido (1-28). Tente novamente:");
        return true;
      }
      pendingNewAccount.delete(userId);
      const account = createAccount(pending.name!, pending.type, 0, day);
      const icon = TYPE_ICONS[account.type] ?? "";
      await ctx.reply(`${icon} Conta criada: ${account.name} (fechamento dia ${day})`);
      return true;
    }
  }

  // Handle pending new card name
  if (pendingNewCard.has(userId)) {
    const pending = pendingNewCard.get(userId)!;
    pendingNewCard.delete(userId);
    const card = createCard(text, pending.accountId, pending.type);
    await ctx.reply(`💳 Cartao criado: ${card.name}`);
    return true;
  }

  // Handle pending balance update
  if (!pendingBalanceUpdate.has(userId)) return false;

  const amount = parseFloat(text.replace(",", "."));
  if (isNaN(amount) || amount < 0) {
    await ctx.reply("Valor invalido. Envie um numero, ex: 5000 ou 1234.56");
    return true;
  }

  const { accountId } = pendingBalanceUpdate.get(userId)!;
  pendingBalanceUpdate.delete(userId);

  const account = setAccountBalance(accountId, amount);
  if (!account) {
    await ctx.reply("Conta nao encontrada.");
    return true;
  }

  const icon = TYPE_ICONS[account.type] ?? "";
  await ctx.reply(`${icon} ${account.name} atualizado: ${formatCurrency(account.balance)}`);
  return true;
}

// --- New Account ---

export async function newAccountCommand(ctx: Context): Promise<void> {
  const keyboard = new InlineKeyboard();
  const types: [string, AccountType][] = [
    ["🏦 Conta corrente", "checking"],
    ["📈 CDB / Investimento", "savings_cdb"],
    ["🛡️ Reserva de emergencia", "emergency"],
    ["💳 Cartao de credito", "credit_card"],
    ["🍽️ Vale refeicao", "vr"],
    ["🛒 Vale alimentacao", "va"],
    ["🌟 Multi-beneficios", "multi_benefit"],
  ];

  for (const [label, type] of types) {
    keyboard.text(label, `newacc:${type}`).row();
  }

  await ctx.reply("Que tipo de conta voce quer criar?", { reply_markup: keyboard });
}

export async function handleNewAccountCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("newacc:")) return;

  const type = data.split(":")[1] as AccountType;
  const userId = ctx.from?.id;
  if (userId) {
    pendingNewAccount.set(userId, { step: "name", type });
  }

  await ctx.editMessageText(`Criando conta ${TYPE_LABELS[type]}. Qual o nome? (ex: "Nubank", "Itau")`);
  await ctx.answerCallbackQuery();
}

// --- New Card ---

export async function newCardCommand(ctx: Context): Promise<void> {
  const accounts = getAllAccounts();
  if (accounts.length === 0) {
    await ctx.reply("Nenhuma conta cadastrada. Crie uma conta primeiro com /newaccount");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const a of accounts) {
    const icon = TYPE_ICONS[a.type] ?? "";
    keyboard.text(`${icon} ${a.name}`, `newcard_acc:${a.id}:${a.type}`).row();
  }

  await ctx.reply("Vincular cartao a qual conta?", { reply_markup: keyboard });
}

export async function handleNewCardAccountCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("newcard_acc:")) return;

  const [, accIdStr, accType] = data.split(":");
  const accountId = parseInt(accIdStr);

  // Determine card type based on account type
  let cardType: CardType;
  if (accType === "credit_card") {
    cardType = "credit";
  } else if (accType === "vr" || accType === "va" || accType === "multi_benefit") {
    cardType = "benefit";
  } else {
    cardType = "debit";
  }

  const userId = ctx.from?.id;
  if (userId) {
    pendingNewCard.set(userId, { step: "name", accountId, type: cardType });
  }

  await ctx.editMessageText(`Qual o nome do cartao? (ex: "Nubank Credito", "Alelo VR")`);
  await ctx.answerCallbackQuery();
}

// --- Delete Account ---

export async function deleteAccountCommand(ctx: Context): Promise<void> {
  const accounts = getAllAccounts();
  if (accounts.length === 0) {
    await ctx.reply("Nenhuma conta cadastrada.");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const a of accounts) {
    const icon = TYPE_ICONS[a.type] ?? "";
    keyboard.text(`${icon} ${a.name}`, `delacc:${a.id}`).row();
  }

  await ctx.reply("Qual conta deseja excluir? (cartoes vinculados serao removidos)", { reply_markup: keyboard });
}

export async function handleDeleteAccountCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("delacc:")) return;

  const id = parseInt(data.split(":")[1]);
  const deleted = deleteAccount(id);

  if (deleted) {
    await ctx.editMessageText("Conta excluida.");
  } else {
    await ctx.editMessageText("Conta nao encontrada.");
  }
  await ctx.answerCallbackQuery();
}

// --- Delete Card ---

export async function deleteCardCommand(ctx: Context): Promise<void> {
  const cards = getAllCards();
  if (cards.length === 0) {
    await ctx.reply("Nenhum cartao cadastrado.");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const c of cards) {
    keyboard.text(`💳 ${c.name} (${c.account_name})`, `delcard:${c.id}`).row();
  }

  await ctx.reply("Qual cartao deseja excluir?", { reply_markup: keyboard });
}

export async function handleDeleteCardCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("delcard:")) return;

  const id = parseInt(data.split(":")[1]);
  const deleted = deleteCard(id);

  if (deleted) {
    await ctx.editMessageText("Cartao excluido.");
  } else {
    await ctx.editMessageText("Cartao nao encontrado.");
  }
  await ctx.answerCallbackQuery();
}
