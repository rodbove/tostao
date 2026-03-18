import { Context, InlineKeyboard } from "grammy";
import { getAllGoals, addGoal, updateGoalAmount, deleteGoal, getGoalById } from "../../db/goals.js";
import { planGoal } from "../../ai/advice.js";
import { formatCurrency } from "../../utils.js";

interface PendingGoal {
  step: "choose_mode" | "name" | "amount" | "deadline" | "ai_description" | "ai_deadline" | "ai_confirm";
  name?: string;
  target?: number;
  aiDescription?: string;
  aiDeadline?: string;
  aiSuggestion?: string;
}

const pendingGoals = new Map<number, PendingGoal>();

export async function goalCommand(ctx: Context): Promise<void> {
  const text = (ctx.match as string | undefined)?.trim();

  if (!text) {
    return showGoals(ctx);
  }

  if (text === "new") {
    const userId = ctx.from?.id;
    if (!userId) return;

    const keyboard = new InlineKeyboard()
      .text("Manual", "goal_mode:manual")
      .text("Com ajuda da IA", "goal_mode:ai");

    pendingGoals.set(userId, { step: "choose_mode" });
    await ctx.reply("Como voce quer definir a meta?", { reply_markup: keyboard });
    return;
  }
}

async function showGoals(ctx: Context): Promise<void> {
  const goals = getAllGoals();

  if (goals.length === 0) {
    await ctx.reply("Nenhuma meta cadastrada. Use /goal new para criar uma.");
    return;
  }

  let msg = "Suas metas:\n\n";
  for (const g of goals) {
    const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    const bar = progressBar(pct);
    const deadlineStr = g.deadline ? ` (prazo: ${g.deadline})` : "";
    msg += `${g.name}${deadlineStr}\n`;
    msg += `${bar} ${pct.toFixed(0)}%\n`;
    msg += `${formatCurrency(g.current_amount)} / ${formatCurrency(g.target_amount)}\n\n`;
  }

  const keyboard = new InlineKeyboard();
  for (const g of goals) {
    keyboard.text(`+ ${g.name}`, `goal_add:${g.id}`);
    keyboard.text(`x ${g.name}`, `goal_del:${g.id}`);
    keyboard.row();
  }

  await ctx.reply(msg, { reply_markup: keyboard });
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
}

export async function handleGoalAmount(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId || !pendingGoals.has(userId)) return false;

  const pending = pendingGoals.get(userId)!;
  const text = ctx.message?.text?.trim();
  if (!text) return false;

  // Manual flow
  if (pending.step === "name") {
    pending.name = text;
    pending.step = "amount";
    await ctx.reply("Qual o valor da meta? (ex: 5000)");
    return true;
  }

  if (pending.step === "amount") {
    const amount = parseFloat(text.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("Valor invalido. Envie um numero, ex: 5000");
      return true;
    }
    pending.target = amount;
    pending.step = "deadline";

    const keyboard = new InlineKeyboard().text("Sem prazo", "goal_nodeadline");
    await ctx.reply("Qual o prazo? (YYYY-MM-DD) ou clique abaixo:", { reply_markup: keyboard });
    return true;
  }

  if (pending.step === "deadline") {
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
    if (!deadline) {
      await ctx.reply("Formato invalido. Use YYYY-MM-DD (ex: 2026-12-31)");
      return true;
    }

    const goal = addGoal(pending.name!, pending.target!, deadline);
    pendingGoals.delete(userId);
    await ctx.reply(`Meta criada: ${goal.name} — ${formatCurrency(goal.target_amount)} ate ${goal.deadline}`);
    return true;
  }

  // AI flow
  if (pending.step === "ai_description") {
    pending.aiDescription = text;
    pending.step = "ai_deadline";

    const keyboard = new InlineKeyboard().text("Sem prazo definido", "goal_ai_nodeadline");
    await ctx.reply("Voce tem uma expectativa de prazo? (ex: '6 meses', '2026-12-31', 'fim do ano')\nOu clique abaixo:", { reply_markup: keyboard });
    return true;
  }

  if (pending.step === "ai_deadline") {
    pending.aiDeadline = text;
    await processAiGoal(ctx, userId);
    return true;
  }

  return false;
}

async function processAiGoal(ctx: Context, userId: number): Promise<void> {
  const pending = pendingGoals.get(userId)!;

  await ctx.reply("Analisando seus dados financeiros...");

  const suggestion = await planGoal(pending.aiDescription!, pending.aiDeadline);
  if (!suggestion) {
    pendingGoals.delete(userId);
    await ctx.reply("Nao foi possivel gerar sugestao. Tente /goal new para criar manualmente.");
    return;
  }

  pending.aiSuggestion = suggestion;
  pending.step = "ai_confirm";

  // Try to extract suggested values from the AI response
  const amountMatch = suggestion.match(/Valor sugerido:\s*R\$\s*([\d.,]+)/i);
  const deadlineMatch = suggestion.match(/(\d{4}-\d{2}-\d{2})/);

  if (amountMatch) {
    pending.target = parseFloat(amountMatch[1].replace(".", "").replace(",", "."));
  }
  if (deadlineMatch) {
    pending.name = pending.aiDescription;
    // Store extracted deadline
    pending.aiDeadline = deadlineMatch[1];
  }

  const keyboard = new InlineKeyboard()
    .text("Criar meta com sugestao", "goal_ai_accept")
    .row()
    .text("Criar manualmente", "goal_ai_manual")
    .text("Cancelar", "goal_ai_cancel");

  await ctx.reply(suggestion + "\n\nDeseja criar a meta com esses valores?", { reply_markup: keyboard });
}

export async function handleGoalCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;
  const userId = ctx.from?.id;

  // Mode selection
  if (data === "goal_mode:manual") {
    if (userId) pendingGoals.set(userId, { step: "name" });
    await ctx.editMessageText("Qual o nome da meta?");
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "goal_mode:ai") {
    if (userId) pendingGoals.set(userId, { step: "ai_description" });
    await ctx.editMessageText("O que voce quer conquistar? Descreva seu objetivo:");
    await ctx.answerCallbackQuery();
    return;
  }

  // AI flow callbacks
  if (data === "goal_ai_nodeadline") {
    if (userId && pendingGoals.has(userId)) {
      const pending = pendingGoals.get(userId)!;
      pending.aiDeadline = undefined;
      await ctx.answerCallbackQuery();
      await processAiGoal(ctx, userId);
    }
    return;
  }

  if (data === "goal_ai_accept") {
    if (userId && pendingGoals.has(userId)) {
      const pending = pendingGoals.get(userId)!;
      const name = pending.aiDescription ?? "Meta";
      const target = pending.target ?? 1000;
      const deadline = pending.aiDeadline && /^\d{4}-\d{2}-\d{2}$/.test(pending.aiDeadline) ? pending.aiDeadline : undefined;

      const goal = addGoal(name, target, deadline);
      pendingGoals.delete(userId);
      await ctx.editMessageText(
        `Meta criada: ${goal.name} — ${formatCurrency(goal.target_amount)}${goal.deadline ? ` ate ${goal.deadline}` : ""}`,
      );
    }
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "goal_ai_manual") {
    if (userId) pendingGoals.set(userId, { step: "name" });
    await ctx.editMessageText("Qual o nome da meta?");
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "goal_ai_cancel") {
    if (userId) pendingGoals.delete(userId);
    await ctx.editMessageText("Criacao de meta cancelada.");
    await ctx.answerCallbackQuery();
    return;
  }

  if (data === "goal_nodeadline") {
    if (!userId || !pendingGoals.has(userId)) return;
    const pending = pendingGoals.get(userId)!;
    const goal = addGoal(pending.name!, pending.target!);
    pendingGoals.delete(userId);
    await ctx.editMessageText(`Meta criada: ${goal.name} — ${formatCurrency(goal.target_amount)}`);
    await ctx.answerCallbackQuery();
    return;
  }

  if (data.startsWith("goal_add:")) {
    const goalId = parseInt(data.split(":")[1]);
    const goal = getGoalById(goalId);
    if (!goal) {
      await ctx.answerCallbackQuery({ text: "Meta nao encontrada" });
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const amount of [50, 100, 200, 500, 1000]) {
      keyboard.text(formatCurrency(amount), `goal_deposit:${goalId}:${amount}`);
    }
    await ctx.editMessageText(`Quanto depositar em "${goal.name}"?`, { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
    return;
  }

  if (data.startsWith("goal_deposit:")) {
    const [, goalIdStr, amountStr] = data.split(":");
    const goalId = parseInt(goalIdStr);
    const amount = parseFloat(amountStr);
    updateGoalAmount(goalId, amount);
    const goal = getGoalById(goalId);
    if (goal) {
      const pct = (goal.current_amount / goal.target_amount) * 100;
      await ctx.editMessageText(
        `+${formatCurrency(amount)} depositado em "${goal.name}"\n${progressBar(pct)} ${pct.toFixed(0)}% — ${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}`
      );
    }
    await ctx.answerCallbackQuery();
    return;
  }

  if (data.startsWith("goal_del:")) {
    const goalId = parseInt(data.split(":")[1]);
    deleteGoal(goalId);
    await ctx.editMessageText("Meta removida.");
    await ctx.answerCallbackQuery();
    return;
  }
}
