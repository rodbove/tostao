import { Router } from "express";
import { getFinancialAdvice, planGoal, planBudget } from "../../ai/advice.js";
import { generateMonthlyInsights, detectAnomalies } from "../../ai/insights.js";
import { getAiClient } from "../../ai/client.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ available: !!getAiClient() });
});

router.post("/advice", async (req, res) => {
  if (!getAiClient()) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const { question } = req.body;
    const advice = await getFinancialAdvice(question);
    if (!advice) {
      res.status(500).json({ error: "Failed to generate advice" });
      return;
    }
    res.json({ advice });
  } catch (err) {
    console.error("AI advice error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

router.get("/monthly", async (req, res) => {
  if (!getAiClient()) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const report = await generateMonthlyInsights(year, month);
    if (!report) {
      res.status(500).json({ error: "Failed to generate report" });
      return;
    }
    res.json({ report });
  } catch (err) {
    console.error("AI insights error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

router.get("/anomalies", async (_req, res) => {
  if (!getAiClient()) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const result = await detectAnomalies();
    const hasAnomalies = result && result.trim() !== "OK";
    res.json({ anomalies: hasAnomalies ? result : null });
  } catch (err) {
    console.error("AI anomaly error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

router.post("/plan-goal", async (req, res) => {
  if (!getAiClient()) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const { description, deadline } = req.body;
    if (!description) {
      res.status(400).json({ error: "description is required" });
      return;
    }
    const suggestion = await planGoal(description, deadline);
    if (!suggestion) {
      res.status(500).json({ error: "Failed to generate goal plan" });
      return;
    }
    res.json({ suggestion });
  } catch (err) {
    console.error("AI goal plan error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

router.post("/plan-budget", async (_req, res) => {
  if (!getAiClient()) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const suggestion = await planBudget();
    if (!suggestion) {
      res.status(500).json({ error: "Failed to generate budget plan" });
      return;
    }
    res.json({ suggestion });
  } catch (err) {
    console.error("AI budget plan error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
