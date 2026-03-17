import { Context } from "grammy";
import { InputFile } from "grammy";
import { getTransactionsByDateRange, type TransactionWithCategory } from "../../db/transactions.js";
import { monthStartStr, monthEndStr } from "../../utils.js";

export async function exportCommand(ctx: Context): Promise<void> {
  const arg = (ctx.match as string | undefined)?.trim();

  let start: string;
  let end: string;

  if (arg === "all") {
    start = "2000-01-01";
    end = "2099-12-31";
  } else {
    start = monthStartStr();
    end = monthEndStr();
  }

  const transactions = getTransactionsByDateRange(start, end);

  if (transactions.length === 0) {
    await ctx.reply("Nenhuma transacao para exportar.");
    return;
  }

  const csv = toCsv(transactions);
  const buffer = Buffer.from(csv, "utf-8");
  const filename = arg === "all" ? "tostao_all.csv" : `tostao_${start}_${end}.csv`;

  await ctx.replyWithDocument(new InputFile(buffer, filename), {
    caption: `${transactions.length} transacoes exportadas`,
  });
}

function toCsv(transactions: TransactionWithCategory[]): string {
  const header = "data,tipo,valor,categoria,descricao";
  const rows = transactions.map((t) => {
    const desc = (t.description ?? "").replace(/"/g, '""');
    const cat = (t.category_name ?? "").replace(/"/g, '""');
    return `${t.date},${t.type},${t.amount},"${cat}","${desc}"`;
  });
  return [header, ...rows].join("\n");
}
