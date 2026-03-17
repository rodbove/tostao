import { Context } from "grammy";
import { getLastTransaction, deleteTransaction } from "../../db/transactions.js";
import { formatCurrency } from "../../utils.js";

export async function undoCommand(ctx: Context): Promise<void> {
  const last = getLastTransaction();

  if (!last) {
    await ctx.reply("Nenhum registro para desfazer.");
    return;
  }

  const sign = last.type === "earning" ? "+" : "-";
  const icon = last.category_icon ?? "";
  const desc = last.description ? ` ${last.description}` : "";

  deleteTransaction(last.id);

  await ctx.reply(
    `Registro removido: ${icon} ${sign}${formatCurrency(last.amount)}${desc} (${last.date})`,
  );
}
