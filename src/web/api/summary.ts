import { Router } from "express";
import {
  getSummaryByCategory,
  getTotals,
  getBalance,
  getTransactionsByDateRange,
} from "../../db/transactions.js";

const router = Router();

router.get("/totals", (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required" });
    return;
  }

  const totals = getTotals(start as string, end as string);
  res.json({ ...totals, net: totals.earnings - totals.expenses });
});

router.get("/balance", (_req, res) => {
  res.json(getBalance());
});

router.get("/by-category", (req, res) => {
  const { start, end, type } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required" });
    return;
  }

  const t = (type as string) || "expense";
  if (!["expense", "earning"].includes(t)) {
    res.status(400).json({ error: "type must be 'expense' or 'earning'" });
    return;
  }

  res.json(getSummaryByCategory(t as "expense" | "earning", start as string, end as string));
});

router.get("/daily", (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required" });
    return;
  }

  const transactions = getTransactionsByDateRange(start as string, end as string);

  const dailyMap = new Map<string, { expenses: number; earnings: number }>();

  for (const tx of transactions) {
    const entry = dailyMap.get(tx.date) ?? { expenses: 0, earnings: 0 };
    if (tx.type === "expense") entry.expenses += tx.amount;
    else entry.earnings += tx.amount;
    dailyMap.set(tx.date, entry);
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(daily);
});

export default router;
