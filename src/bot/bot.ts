import { Bot } from "grammy";
import { authMiddleware } from "./middleware.js";
import { startCommand, helpCommand } from "./commands/start.js";
import { expenseCommand, handleExpenseAmount, handleExpenseCallback } from "./commands/expense.js";
import { earningCommand, handleEarningAmount, handleEarningCallback } from "./commands/earning.js";
import { todayCommand, weekCommand, monthCommand, balanceCommand } from "./commands/summary.js";
import { categoriesCommand } from "./commands/categories.js";
import { undoCommand } from "./commands/undo.js";
import { goalCommand, handleGoalAmount, handleGoalCallback } from "./commands/goals.js";
import { budgetCommand, budgetSetCommand, handleBudgetCallback, handleBudgetAmount } from "./commands/budget.js";
import { adviceCommand } from "./commands/advice.js";
import { insightsCommand, anomalyCommand } from "./commands/insights.js";
import { parseQuickInput } from "./quick-input.js";
import { addTransaction } from "../db/transactions.js";
import { findCategoryByName } from "../db/categories.js";
import { formatCurrency } from "../utils.js";

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.use(authMiddleware);

  // Commands
  bot.command("start", startCommand);
  bot.command("help", helpCommand);
  bot.command("expense", expenseCommand);
  bot.command("earning", earningCommand);
  bot.command("today", todayCommand);
  bot.command("week", weekCommand);
  bot.command("month", monthCommand);
  bot.command("balance", balanceCommand);
  bot.command("categories", categoriesCommand);
  bot.command("undo", undoCommand);
  bot.command("goal", goalCommand);
  bot.command("budget", budgetCommand);
  bot.command("budgetset", budgetSetCommand);
  bot.command("advice", adviceCommand);
  bot.command("insights", insightsCommand);
  bot.command("anomalies", anomalyCommand);

  // Callback queries (inline keyboard buttons)
  bot.callbackQuery(/^exp:/, handleExpenseCallback);
  bot.callbackQuery(/^ear:/, handleEarningCallback);
  bot.callbackQuery(/^goal_/, handleGoalCallback);
  bot.callbackQuery(/^budget_cat:/, handleBudgetCallback);

  // Free text: try pending flows first, then quick input
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();

    // Check if we're in a pending flow
    if (await handleExpenseAmount(ctx)) return;
    if (await handleEarningAmount(ctx)) return;
    if (await handleGoalAmount(ctx)) return;
    if (await handleBudgetAmount(ctx)) return;

    // Try quick input
    const parsed = parseQuickInput(text);
    if (parsed) {
      const category = findCategoryByName(parsed.description, parsed.type);
      const tx = addTransaction(
        parsed.type,
        parsed.amount,
        parsed.description,
        category?.id,
      );

      const sign = parsed.type === "earning" ? "+" : "-";
      const catLabel = category ? ` ${category.icon} ${category.name}` : "";

      await ctx.reply(
        `${sign}${formatCurrency(tx.amount)} ${parsed.description}${catLabel}`,
      );
      return;
    }

    // Unknown message
    await ctx.reply("Nao entendi. Use /help para ver os comandos disponiveis.");
  });

  return bot;
}
