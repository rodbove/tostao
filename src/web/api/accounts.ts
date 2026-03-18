import { Router } from "express";
import {
  getAllAccounts, getAllCards, getCardsByAccountType,
  setAccountBalance, getCreditCardBill,
  createAccount, createCard, deleteAccount, deleteCard,
  updateAccount,
  type AccountType, type CardType,
} from "../../db/accounts.js";

const router = Router();

const VALID_ACCOUNT_TYPES = ["checking", "savings_cdb", "emergency", "credit_card", "vr", "va", "multi_benefit"];
const VALID_CARD_TYPES = ["debit", "credit", "benefit"];

// GET /api/accounts — list all accounts with credit card bills
router.get("/", (_req, res) => {
  const accounts = getAllAccounts();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const result = accounts.map((a) => {
    if (a.type === "credit_card") {
      return { ...a, current_bill: getCreditCardBill(a.id, month) };
    }
    return a;
  });

  res.json(result);
});

// POST /api/accounts — create account
router.post("/", (req, res) => {
  const { name, type, balance, closing_day } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: "name and type are required" });
    return;
  }
  if (!VALID_ACCOUNT_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}` });
    return;
  }

  const account = createAccount(name, type as AccountType, balance ?? 0, closing_day);
  res.status(201).json(account);
});

// PUT /api/accounts/:id — update account name/closing_day
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, closing_day } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const account = updateAccount(id, name, closing_day);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(account);
});

// PUT /api/accounts/:id/balance — update balance
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

// DELETE /api/accounts/:id
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteAccount(id);
  if (!deleted) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json({ ok: true });
});

// --- Cards ---

// GET /api/accounts/cards — list all cards
router.get("/cards", (_req, res) => {
  res.json(getAllCards());
});

// POST /api/accounts/cards — create card
router.post("/cards", (req, res) => {
  const { name, account_id, type } = req.body;

  if (!name || !account_id || !type) {
    res.status(400).json({ error: "name, account_id, and type are required" });
    return;
  }
  if (!VALID_CARD_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_CARD_TYPES.join(", ")}` });
    return;
  }

  const card = createCard(name, account_id, type as CardType);
  res.status(201).json(card);
});

// DELETE /api/accounts/cards/:id
router.delete("/cards/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteCard(id);
  if (!deleted) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
