import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import transactionsRouter from "./api/transactions.js";
import summaryRouter from "./api/summary.js";
import categoriesRouter from "./api/categories.js";
import goalsRouter from "./api/goals.js";
import budgetsRouter from "./api/budgets.js";
import insightsRouter from "./api/insights.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer(port: number): ReturnType<typeof express> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // API routes
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/summary", summaryRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/budgets", budgetsRouter);
  app.use("/api/insights", insightsRouter);

  // Serve web UI static files (after build)
  const staticPath = path.resolve(__dirname, "../../web-ui/dist");
  const indexPath = path.join(staticPath, "index.html");

  if (fs.existsSync(indexPath)) {
    app.use(express.static(staticPath));

    // SPA fallback — only for non-API routes
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(indexPath);
    });
  } else {
    console.log("Web UI not built — run 'npm run build' in web-ui/ to enable. API still available.");
  }

  app.listen(port, () => {
    console.log(`Web server running on port ${port}`);
  });

  return app;
}
