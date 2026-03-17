import { Router } from "express";
import { getBudgetProgress, setBudget, deleteBudget } from "../../db/budgets.js";

const router = Router();

router.get("/progress", (req, res) => {
  const { month } = req.query;
  if (!month) {
    res.status(400).json({ error: "month query param required (YYYY-MM)" });
    return;
  }
  res.json(getBudgetProgress(month as string));
});

router.post("/", (req, res) => {
  const { category_id, monthly_limit, month } = req.body;
  if (!category_id || !monthly_limit || !month) {
    res.status(400).json({ error: "category_id, monthly_limit, and month are required" });
    return;
  }
  res.status(201).json(setBudget(category_id, monthly_limit, month));
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteBudget(id);
  if (!deleted) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
