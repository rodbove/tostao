import { getDb } from "./schema.js";

export type AccountType = "checking" | "savings_cdb" | "emergency" | "credit_card" | "vr" | "va" | "multi_benefit";
export type CardType = "debit" | "credit" | "benefit";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  closing_day: number | null;
  created_at: string;
}

export interface Card {
  id: number;
  name: string;
  account_id: number;
  type: CardType;
  created_at: string;
}

export interface CardWithAccount extends Card {
  account_name: string;
  account_type: AccountType;
}

// --- Accounts ---

export function getAllAccounts(): Account[] {
  const db = getDb();
  return db.prepare("SELECT * FROM accounts ORDER BY id").all() as Account[];
}

export function getAccountById(id: number): Account | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account | undefined;
}

export function getAccountsByType(...types: AccountType[]): Account[] {
  const db = getDb();
  const placeholders = types.map(() => "?").join(",");
  return db.prepare(`SELECT * FROM accounts WHERE type IN (${placeholders}) ORDER BY id`).all(...types) as Account[];
}

export function createAccount(name: string, type: AccountType, balance = 0, closingDay?: number): Account {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO accounts (name, type, balance, closing_day) VALUES (?, ?, ?, ?)"
  ).run(name, type, balance, closingDay ?? null);
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(result.lastInsertRowid) as Account;
}

export function setAccountBalance(id: number, balance: number): Account | undefined {
  const db = getDb();
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(balance, id);
  return getAccountById(id);
}

export function updateAccount(id: number, name: string, closingDay?: number): Account | undefined {
  const db = getDb();
  db.prepare("UPDATE accounts SET name = ?, closing_day = ? WHERE id = ?").run(name, closingDay ?? null, id);
  return getAccountById(id);
}

export function deleteAccount(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Cards ---

export function getAllCards(): CardWithAccount[] {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, a.name as account_name, a.type as account_type
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    ORDER BY c.id
  `).all() as CardWithAccount[];
}

export function getCardById(id: number): CardWithAccount | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, a.name as account_name, a.type as account_type
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    WHERE c.id = ?
  `).get(id) as CardWithAccount | undefined;
}

export function getCardsByAccountType(...types: AccountType[]): CardWithAccount[] {
  const db = getDb();
  const placeholders = types.map(() => "?").join(",");
  return db.prepare(`
    SELECT c.*, a.name as account_name, a.type as account_type
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    WHERE a.type IN (${placeholders})
    ORDER BY c.id
  `).all(...types) as CardWithAccount[];
}

export function createCard(name: string, accountId: number, type: CardType): Card {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO cards (name, account_id, type) VALUES (?, ?, ?)"
  ).run(name, accountId, type);
  return db.prepare("SELECT * FROM cards WHERE id = ?").get(result.lastInsertRowid) as Card;
}

export function deleteCard(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM cards WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Credit Card Bill ---

/**
 * Calculate credit card bill for a given account and month.
 * Uses closing_day to determine the billing cycle.
 * If closing_day = 10: bill for march = purchases from feb 11 to mar 10
 */
export function getCreditCardBill(accountId: number, month: string): number {
  const db = getDb();
  const account = getAccountById(accountId);
  if (!account || account.type !== "credit_card") return 0;

  const closingDay = account.closing_day ?? 28;
  const [year, mon] = month.split("-").map(Number);

  // Cycle: previous month (closingDay+1) to this month (closingDay)
  const prevMonth = mon === 1 ? 12 : mon - 1;
  const prevYear = mon === 1 ? year - 1 : year;
  const cycleStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(closingDay + 1).padStart(2, "0")}`;
  const cycleEnd = `${year}-${String(mon).padStart(2, "0")}-${String(closingDay).padStart(2, "0")}`;

  // Get cards belonging to this credit card account
  const cards = db.prepare("SELECT id FROM cards WHERE account_id = ?").all(accountId) as { id: number }[];
  if (cards.length === 0) return 0;
  const cardIds = cards.map((c) => c.id);
  const placeholders = cardIds.map(() => "?").join(",");

  // Sum of non-installment credit purchases in the billing cycle
  const directRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE payment_type = 'credit'
      AND is_installment = 0
      AND card_id IN (${placeholders})
      AND date BETWEEN ? AND ?
  `).get(...cardIds, cycleStart, cycleEnd) as { total: number };

  // Sum of installments due this month for cards in this account
  const installmentRow = db.prepare(`
    SELECT COALESCE(SUM(i.amount), 0) as total
    FROM installments i
    JOIN transactions t ON i.transaction_id = t.id
    WHERE t.card_id IN (${placeholders})
      AND i.due_month = ?
  `).get(...cardIds, month) as { total: number };

  return directRow.total + installmentRow.total;
}
