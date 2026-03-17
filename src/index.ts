import "dotenv/config";
import { createBot } from "./bot/bot.js";
import { getDb, closeDb } from "./db/schema.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

// Initialize database
getDb();
console.log("Database initialized");

// Start bot
const bot = createBot(token);

bot.start({
  onStart: () => console.log("Tostao bot is running"),
});

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    bot.stop();
    closeDb();
    process.exit(0);
  });
}
