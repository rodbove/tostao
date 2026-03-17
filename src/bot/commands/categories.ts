import { Context } from "grammy";
import { getAllCategories } from "../../db/categories.js";

export async function categoriesCommand(ctx: Context): Promise<void> {
  const categories = getAllCategories();

  const expenses = categories.filter((c) => c.type === "expense");
  const earnings = categories.filter((c) => c.type === "earning");

  let msg = "Categorias:\n\n";

  msg += "Gastos:\n";
  for (const c of expenses) {
    msg += `  ${c.icon} ${c.name}\n`;
  }

  msg += "\nGanhos:\n";
  for (const c of earnings) {
    msg += `  ${c.icon} ${c.name}\n`;
  }

  await ctx.reply(msg);
}
