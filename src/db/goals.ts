import { getDb } from "./schema.js";

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

export function getAllGoals(): Goal[] {
  return getDb().prepare("SELECT * FROM goals ORDER BY created_at DESC").all() as Goal[];
}

export function getGoalById(id: number): Goal | undefined {
  return getDb().prepare("SELECT * FROM goals WHERE id = ?").get(id) as Goal | undefined;
}

export function addGoal(name: string, targetAmount: number, deadline?: string): Goal {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO goals (name, target_amount, deadline) VALUES (?, ?, ?)"
  ).run(name, targetAmount, deadline ?? null);
  return db.prepare("SELECT * FROM goals WHERE id = ?").get(result.lastInsertRowid) as Goal;
}

export function updateGoalAmount(id: number, amount: number): boolean {
  const db = getDb();
  const result = db.prepare(
    "UPDATE goals SET current_amount = current_amount + ? WHERE id = ?"
  ).run(amount, id);
  return result.changes > 0;
}

export function deleteGoal(id: number): boolean {
  return getDb().prepare("DELETE FROM goals WHERE id = ?").run(id).changes > 0;
}
