import { Router } from "express";
import {
  getTransactionsByDateRange,
  addTransaction,
  deleteTransaction,
  type TransactionWithCategory,
} from "../../db/transactions.js";

const router = Router();

router.get("/", (req, res) => {
  const { start, end, type, category_id } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required (YYYY-MM-DD)" });
    return;
  }

  let transactions = getTransactionsByDateRange(start as string, end as string);

  if (type) {
    transactions = transactions.filter((t) => t.type === type);
  }
  if (category_id) {
    const catId = parseInt(category_id as string);
    transactions = transactions.filter((t) => t.category_id === catId);
  }

  res.json(transactions);
});

router.post("/", (req, res) => {
  const { type, amount, description, category_id, date, payment_method } = req.body;

  if (!type || !amount) {
    res.status(400).json({ error: "type and amount are required" });
    return;
  }

  if (!["expense", "earning"].includes(type)) {
    res.status(400).json({ error: "type must be 'expense' or 'earning'" });
    return;
  }

  if (payment_method && !["debit", "credit"].includes(payment_method)) {
    res.status(400).json({ error: "payment_method must be 'debit' or 'credit'" });
    return;
  }

  const tx = addTransaction(type, amount, description, category_id, date, payment_method);
  res.status(201).json(tx);
});

router.get("/export", (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required" });
    return;
  }

  const transactions = getTransactionsByDateRange(start as string, end as string);
  const header = "data,tipo,valor,categoria,descricao,pagamento";
  const rows = transactions.map((t) => {
    const desc = (t.description ?? "").replace(/"/g, '""');
    const cat = (t.category_name ?? "").replace(/"/g, '""');
    const pm = t.payment_method ?? "";
    return `${t.date},${t.type},${t.amount},"${cat}","${desc}",${pm}`;
  });
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="tostao_${start}_${end}.csv"`);
  res.send(csv);
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteTransaction(id);
  if (!deleted) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
