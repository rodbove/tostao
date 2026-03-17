import { Context } from "grammy";
import { getFinancialAdvice } from "../../ai/advice.js";
import { getAiClient } from "../../ai/client.js";

export async function adviceCommand(ctx: Context): Promise<void> {
  if (!getAiClient()) {
    await ctx.reply("ANTHROPIC_API_KEY nao configurada. Defina a variavel de ambiente para usar este comando.");
    return;
  }

  const question = (ctx.match as string | undefined)?.trim() || undefined;

  await ctx.reply("Analisando suas financas...");

  try {
    const advice = await getFinancialAdvice(question);
    if (!advice) {
      await ctx.reply("Nao foi possivel gerar o conselho. Tente novamente mais tarde.");
      return;
    }
    await ctx.reply(advice);
  } catch (err) {
    console.error("AI advice error:", err);
    await ctx.reply("Erro ao consultar IA. Tente novamente mais tarde.");
  }
}
