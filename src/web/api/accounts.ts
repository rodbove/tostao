import { Router } from "express";
import { getAllAccounts, setAccountBalance, getCreditCardBill } from "../../db/accounts.js";

const router = Router();

router.get("/", (_req, res) => {
  const accounts = getAllAccounts();

  // Auto-calculate credit card bill for current month
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const result = accounts.map((a) => {
    if (a.type === "credit_card") {
      return { ...a, current_bill: getCreditCardBill(month) };
    }
    return a;
  });

  res.json(result);
});

router.put("/:id/balance", (req, res) => {
  const id = parseInt(req.params.id);
  const { balance } = req.body;

  if (typeof balance !== "number") {
    res.status(400).json({ error: "balance is required and must be a number" });
    return;
  }

  const account = setAccountBalance(id, balance);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(account);
});

export default router;
