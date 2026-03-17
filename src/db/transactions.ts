import { getDb } from "./schema.js";

export type PaymentMethod = "debit" | "credit";

export interface Transaction {
  id: number;
  type: "expense" | "earning";
  amount: number;
  description: string | null;
  category_id: number | null;
  payment_method: PaymentMethod | null;
  date: string;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_icon: string | null;
}

export function addTransaction(
  type: "expense" | "earning",
  amount: number,
  description?: string,
  categoryId?: number,
  date?: string,
  paymentMethod?: PaymentMethod,
): Transaction {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO transactions (type, amount, description, category_id, date, payment_method)
    VALUES (?, ?, ?, ?, COALESCE(?, date('now')), ?)
  `);
  const result = stmt.run(type, amount, description ?? null, categoryId ?? null, date ?? null, paymentMethod ?? null);
  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid) as Transaction;
}

export function deleteTransaction(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getLastTransaction(): TransactionWithCategory | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.created_at DESC LIMIT 1
  `).get() as TransactionWithCategory | undefined;
}

export function getTransactionsByDate(date: string): TransactionWithCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date = ?
    ORDER BY t.created_at DESC
  `).all(date) as TransactionWithCategory[];
}

export function getTransactionsByDateRange(start: string, end: string): TransactionWithCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date BETWEEN ? AND ?
    ORDER BY t.date DESC, t.created_at DESC
  `).all(start, end) as TransactionWithCategory[];
}

export interface SummaryByCategory {
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
}

export function getSummaryByCategory(
  type: "expense" | "earning",
  start: string,
  end: string,
): SummaryByCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      COALESCE(c.name, 'Sem categoria') as category_name,
      COALESCE(c.icon, '❓') as category_icon,
      SUM(t.amount) as total,
      COUNT(*) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.type = ? AND t.date BETWEEN ? AND ?
    GROUP BY c.id
    ORDER BY total DESC
  `).all(type, start, end) as SummaryByCategory[];
}

export function getTotals(start: string, end: string): { expenses: number; earnings: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
      COALESCE(SUM(CASE WHEN type = 'earning' THEN amount ELSE 0 END), 0) as earnings
    FROM transactions
    WHERE date BETWEEN ? AND ?
  `).get(start, end) as { expenses: number; earnings: number };
  return row;
}

export function getBalance(): { expenses: number; earnings: number; balance: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
      COALESCE(SUM(CASE WHEN type = 'earning' THEN amount ELSE 0 END), 0) as earnings
    FROM transactions
  `).get() as { expenses: number; earnings: number };
  return { ...row, balance: row.earnings - row.expenses };
}
