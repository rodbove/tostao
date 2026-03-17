import { Context } from "grammy";

export async function startCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `Fala! Eu sou o Tostao, seu bot de financas pessoais.

Registre gastos e ganhos rapidamente:
• Envie "50 almoco" para registrar um gasto de R$50
• Envie "+3000 salario" para registrar um ganho

Comandos disponiveis:
/expense - Registrar um gasto
/earning - Registrar um ganho
/today - Resumo de hoje
/week - Resumo da semana
/month - Resumo do mes
/balance - Saldo geral
/goal - Ver/criar metas de economia
/budget - Ver orcamento mensal
/budgetset - Definir orcamento por categoria
/advice - Conselho financeiro com IA
/insights - Relatorio mensal com IA
/anomalies - Detectar gastos incomuns
/export - Exportar CSV do mes (/export all para tudo)
/categories - Ver categorias
/undo - Desfazer ultimo registro
/help - Ver esta mensagem`
  );
}

export async function helpCommand(ctx: Context): Promise<void> {
  return startCommand(ctx);
}
