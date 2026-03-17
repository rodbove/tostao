import { Context, NextFunction } from "grammy";

const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID;

export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ALLOWED_USER_ID) {
    console.warn("TELEGRAM_ALLOWED_USER_ID not set — allowing all users");
    return next();
  }

  const userId = ctx.from?.id?.toString();
  if (userId !== ALLOWED_USER_ID) {
    await ctx.reply("Acesso nao autorizado.");
    return;
  }

  return next();
}
