import { getDb } from "./schema.js";

export type PaymentType = "debit" | "credit" | "pix" | "boleto" | "benefit";

export interface Transaction {
  id: number;
  type: "expense" | "earning";
  amount: number;
  description: string | null;
  category_id: number | null;
  payment_type: PaymentType | null;
  card_id: number | null;
  account_id: number | null;
  is_installment: number;
  date: string;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_icon: string | null;
  card_name: string | null;
  account_name: string | null;
}

export interface AddTransactionOpts {
  type: "expense" | "earning";
  amount: number;
  description?: string;
  categoryId?: number;
  date?: string;
  paymentType?: PaymentType;
  cardId?: number;
  accountId?: number;
  installments?: number;
}

export function addTransaction(opts: AddTransactionOpts): Transaction {
  const db = getDb();
  const isInstallment = (opts.installments ?? 0) > 1 ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO transactions (type, amount, description, category_id, date, payment_type, card_id, account_id, is_installment)
    VALUES (?, ?, ?, ?, COALESCE(?, date('now')), ?, ?, ?, ?)
  `);
  const result = stmt.run(
    opts.type,
    opts.amount,
    opts.description ?? null,
    opts.categoryId ?? null,
    opts.date ?? null,
    opts.paymentType ?? null,
    opts.cardId ?? null,
    opts.accountId ?? null,
    isInstallment,
  );

  const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid) as Transaction;

  // Create installment records
  if (isInstallment && opts.installments) {
    const n = opts.installments;
    const perMonth = Math.round((opts.amount / n) * 100) / 100;
    const txDate = new Date(tx.date);
    const insertInstallment = db.prepare(`
      INSERT INTO installments (transaction_id, installment_number, total_installments, amount, due_month)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < n; i++) {
      const d = new Date(txDate.getFullYear(), txDate.getMonth() + i, 1);
      const dueMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Last installment absorbs rounding difference
      const amt = i === n - 1 ? Math.round((opts.amount - perMonth * (n - 1)) * 100) / 100 : perMonth;
      insertInstallment.run(tx.id, i + 1, n, amt, dueMonth);
    }
  }

  // Update account balance for debit/pix/boleto/benefit expenses
  if (opts.type === "expense" && opts.paymentType && opts.paymentType !== "credit") {
    const targetAccountId = opts.accountId ?? (opts.cardId ? getCardAccountId(opts.cardId) : null);
    if (targetAccountId) {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(opts.amount, targetAccountId);
    }
  }

  // Update account balance for earnings
  if (opts.type === "earning" && opts.accountId) {
    db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(opts.amount, opts.accountId);
  }

  return tx;
}

function getCardAccountId(cardId: number): number | null {
  const db = getDb();
  const row = db.prepare("SELECT account_id FROM cards WHERE id = ?").get(cardId) as { account_id: number } | undefined;
  return row?.account_id ?? null;
}

export function deleteTransaction(id: number): boolean {
  const db = getDb();
  // Installments cascade-delete via FK
  const result = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getLastTransaction(): TransactionWithCategory | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon,
           cr.name as card_name, a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cards cr ON t.card_id = cr.id
    LEFT JOIN accounts a ON t.account_id = a.id
    ORDER BY t.created_at DESC LIMIT 1
  `).get() as TransactionWithCategory | undefined;
}

export function getTransactionsByDate(date: string): TransactionWithCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon,
           cr.name as card_name, a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cards cr ON t.card_id = cr.id
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.date = ?
    ORDER BY t.created_at DESC
  `).all(date) as TransactionWithCategory[];
}

export function getTransactionsByDateRange(start: string, end: string): TransactionWithCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon,
           cr.name as card_name, a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cards cr ON t.card_id = cr.id
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.date BETWEEN ? AND ?
    ORDER BY t.date DESC, t.created_at DESC
  `).all(start, end) as TransactionWithCategory[];
}

export function getInstallmentsForTransaction(txId: number) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM installments WHERE transaction_id = ? ORDER BY installment_number"
  ).all(txId) as { id: number; transaction_id: number; installment_number: number; total_installments: number; amount: number; due_month: string }[];
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
      COALESCE(c.icon, '?') as category_icon,
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
