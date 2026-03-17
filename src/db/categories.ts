import { getDb } from "./schema.js";

export interface Category {
  id: number;
  name: string;
  type: "expense" | "earning";
  icon: string | null;
  created_at: string;
}

export function getAllCategories(): Category[] {
  return getDb().prepare("SELECT * FROM categories ORDER BY type, name").all() as Category[];
}

export function getCategoriesByType(type: "expense" | "earning"): Category[] {
  return getDb().prepare("SELECT * FROM categories WHERE type = ? ORDER BY name").all(type) as Category[];
}

export function getCategoryById(id: number): Category | undefined {
  return getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined;
}

export function findCategoryByName(name: string, type: "expense" | "earning"): Category | undefined {
  return getDb().prepare(
    "SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND type = ?"
  ).get(name, type) as Category | undefined;
}

export function addCategory(name: string, type: "expense" | "earning", icon?: string): Category {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO categories (name, type, icon) VALUES (?, ?, ?)"
  ).run(name, type, icon ?? null);
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid) as Category;
}

export function deleteCategory(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return result.changes > 0;
}
