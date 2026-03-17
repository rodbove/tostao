import { getDb } from "./schema.js";

export interface Budget {
  id: number;
  category_id: number;
  monthly_limit: number;
  month: string;
}

export interface BudgetWithCategory extends Budget {
  category_name: string;
  category_icon: string;
}

export interface BudgetProgress extends BudgetWithCategory {
  spent: number;
  remaining: number;
  percentage: number;
}

export function getBudgetsForMonth(month: string): BudgetWithCategory[] {
  return getDb().prepare(`
    SELECT b.*, c.name as category_name, c.icon as category_icon
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.month = ?
    ORDER BY c.name
  `).all(month) as BudgetWithCategory[];
}

export function getBudgetProgress(month: string): BudgetProgress[] {
  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  return getDb().prepare(`
    SELECT
      b.*,
      c.name as category_name,
      c.icon as category_icon,
      COALESCE(SUM(t.amount), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id
      AND t.type = 'expense'
      AND t.date BETWEEN ? AND ?
    WHERE b.month = ?
    GROUP BY b.id
    ORDER BY c.name
  `).all(start, end, month).map((row: any) => ({
    ...row,
    remaining: Math.max(0, row.monthly_limit - row.spent),
    percentage: Math.min(100, (row.spent / row.monthly_limit) * 100),
  })) as BudgetProgress[];
}

export function setBudget(categoryId: number, monthlyLimit: number, month: string): Budget {
  const db = getDb();
  db.prepare(`
    INSERT INTO budgets (category_id, monthly_limit, month)
    VALUES (?, ?, ?)
    ON CONFLICT(category_id, month)
    DO UPDATE SET monthly_limit = excluded.monthly_limit
  `).run(categoryId, monthlyLimit, month);

  return db.prepare(
    "SELECT * FROM budgets WHERE category_id = ? AND month = ?"
  ).get(categoryId, month) as Budget;
}

export function deleteBudget(id: number): boolean {
  return getDb().prepare("DELETE FROM budgets WHERE id = ?").run(id).changes > 0;
}
