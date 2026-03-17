import { getDb } from "./schema.js";

export type AccountType = "checking" | "savings_cdb" | "emergency" | "credit_card";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  created_at: string;
}

export function getAllAccounts(): Account[] {
  const db = getDb();
  return db.prepare("SELECT * FROM accounts ORDER BY id").all() as Account[];
}

export function getAccountById(id: number): Account | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account | undefined;
}

export function getAccountByType(type: AccountType): Account | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM accounts WHERE type = ?").get(type) as Account | undefined;
}

export function setAccountBalance(id: number, balance: number): Account | undefined {
  const db = getDb();
  db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(balance, id);
  return getAccountById(id);
}

export function getCreditCardBill(month: string): number {
  const db = getDb();
  const start = `${month}-01`;
  // Last day of month
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND payment_method = 'credit' AND date BETWEEN ? AND ?
  `).get(start, end) as { total: number };

  return row.total;
}
