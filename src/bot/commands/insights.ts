import { Context } from "grammy";
import { generateMonthlyInsights, detectAnomalies } from "../../ai/insights.js";
import { getAiClient } from "../../ai/client.js";

export async function insightsCommand(ctx: Context): Promise<void> {
  if (!getAiClient()) {
    await ctx.reply("ANTHROPIC_API_KEY nao configurada.");
    return;
  }

  await ctx.reply("Gerando relatorio...");

  try {
    const now = new Date();
    const report = await generateMonthlyInsights(now.getFullYear(), now.getMonth() + 1);
    if (!report) {
      await ctx.reply("Nao foi possivel gerar o relatorio.");
      return;
    }

    // Split long messages (Telegram 4096 char limit)
    if (report.length > 4000) {
      const mid = report.lastIndexOf("\n", 4000);
      await ctx.reply(report.slice(0, mid));
      await ctx.reply(report.slice(mid + 1));
    } else {
      await ctx.reply(report);
    }
  } catch (err) {
    console.error("AI insights error:", err);
    await ctx.reply("Erro ao gerar relatorio. Tente novamente mais tarde.");
  }
}

export async function anomalyCommand(ctx: Context): Promise<void> {
  if (!getAiClient()) {
    await ctx.reply("ANTHROPIC_API_KEY nao configurada.");
    return;
  }

  try {
    const result = await detectAnomalies();
    if (!result || result.trim() === "OK") {
      await ctx.reply("Nenhuma anomalia detectada nos seus gastos recentes.");
      return;
    }
    await ctx.reply(`Anomalias detectadas:\n\n${result}`);
  } catch (err) {
    console.error("AI anomaly error:", err);
    await ctx.reply("Erro ao verificar anomalias.");
  }
}
