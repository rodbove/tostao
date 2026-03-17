import { Router } from "express";
import { getAllGoals, addGoal, updateGoalAmount, deleteGoal } from "../../db/goals.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAllGoals());
});

router.post("/", (req, res) => {
  const { name, target_amount, deadline } = req.body;
  if (!name || !target_amount) {
    res.status(400).json({ error: "name and target_amount are required" });
    return;
  }
  res.status(201).json(addGoal(name, target_amount, deadline));
});

router.post("/:id/deposit", (req, res) => {
  const id = parseInt(req.params.id);
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "positive amount is required" });
    return;
  }
  const updated = updateGoalAmount(id, amount);
  if (!updated) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteGoal(id);
  if (!deleted) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
