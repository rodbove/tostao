import { Context, InlineKeyboard } from "grammy";
import { getAllAccounts, setAccountBalance, getCreditCardBill, type Account } from "../../db/accounts.js";
import { formatCurrency } from "../../utils.js";

const pendingBalanceUpdate = new Map<number, { accountId: number }>();

const TYPE_LABELS: Record<string, string> = {
  checking: "Conta Corrente",
  savings_cdb: "CDB",
  emergency: "Reserva de Emergencia",
  credit_card: "Cartao de Credito",
};

const TYPE_ICONS: Record<string, string> = {
  checking: "\uD83C\uDFE6",
  savings_cdb: "\uD83D\uDCC8",
  emergency: "\uD83D\uDEE1\uFE0F",
  credit_card: "\uD83D\uDCB3",
};

function formatAccountLine(a: Account, creditBill?: number): string {
  const icon = TYPE_ICONS[a.type] ?? "";
  if (a.type === "credit_card") {
    const bill = creditBill ?? 0;
    return `${icon} ${a.name}: Fatura ${formatCurrency(bill)} | Limite disponivel: ${formatCurrency(a.balance)}`;
  }
  return `${icon} ${a.name}: ${formatCurrency(a.balance)}`;
}

export async function accountsCommand(ctx: Context): Promise<void> {
  const accounts = getAllAccounts();

  if (accounts.length === 0) {
    await ctx.reply("Nenhuma conta cadastrada.");
    return;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const creditBill = getCreditCardBill(month);

  let total = 0;
  const lines: string[] = [];

  for (const a of accounts) {
    lines.push(formatAccountLine(a, a.type === "credit_card" ? creditBill : undefined));
    if (a.type !== "credit_card") {
      total += a.balance;
    } else {
      total -= creditBill;
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
  if (!userId || !pendingBalanceUpdate.has(userId)) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

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
