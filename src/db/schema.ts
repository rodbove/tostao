import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? "./data/tostao.db";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH, { fileMustExist: false });
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'earning')),
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('expense', 'earning')),
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id),
      date DATE NOT NULL DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('checking', 'savings_cdb', 'emergency', 'credit_card', 'vr', 'va', 'multi_benefit')),
      balance REAL NOT NULL DEFAULT 0,
      closing_day INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('debit', 'credit', 'benefit')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      total_installments INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id),
      monthly_limit REAL NOT NULL,
      month TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_category_month
      ON budgets(category_id, month);
  `);

  runMigrations(db);

  seedDefaultCategories(db);
  seedDefaultAccounts(db);
}

function runMigrations(db: Database.Database): void {
  const txCols = (db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[]).map((c) => c.name);

  // v0.6 migration: payment_method → payment_type, add card_id, account_id, is_installment
  if (!txCols.includes("payment_type")) {
    db.exec("ALTER TABLE transactions ADD COLUMN payment_type TEXT CHECK (payment_type IN ('debit', 'credit', 'pix', 'boleto', 'benefit'))");
    db.exec("ALTER TABLE transactions ADD COLUMN card_id INTEGER REFERENCES cards(id)");
    db.exec("ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id)");
    db.exec("ALTER TABLE transactions ADD COLUMN is_installment INTEGER DEFAULT 0");

    // Migrate old payment_method data
    if (txCols.includes("payment_method")) {
      db.exec("UPDATE transactions SET payment_type = payment_method WHERE payment_method IS NOT NULL");
    }
  } else if (!txCols.includes("payment_method")) {
    // Fresh DB without old column — nothing to migrate
  }

  // Add closing_day to accounts if missing (upgrade from old schema)
  const accCols = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map((c) => c.name);
  if (!accCols.includes("closing_day")) {
    db.exec("ALTER TABLE accounts ADD COLUMN closing_day INTEGER");
  }
}

function seedDefaultAccounts(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as n FROM accounts").get() as { n: number };
  if (count.n > 0) return;

  const insert = db.prepare("INSERT INTO accounts (name, type, balance) VALUES (?, ?, 0)");
  const defaults: [string, string][] = [
    ["Conta Corrente", "checking"],
    ["CDB", "savings_cdb"],
    ["Reserva de Emergencia", "emergency"],
  ];

  const tx = db.transaction(() => {
    for (const [name, type] of defaults) {
      insert.run(name, type);
    }
  });
  tx();
}

function seedDefaultCategories(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as n FROM categories").get() as { n: number };
  if (count.n > 0) return;

  const insert = db.prepare("INSERT INTO categories (name, type, icon) VALUES (?, ?, ?)");
  const defaults: [string, string, string][] = [
    ["Alimentacao", "expense", "\uD83C\uDF54"],
    ["Transporte", "expense", "\uD83D\uDE8C"],
    ["Moradia", "expense", "\uD83C\uDFE0"],
    ["Saude", "expense", "\uD83C\uDFE5"],
    ["Lazer", "expense", "\uD83C\uDFAC"],
    ["Educacao", "expense", "\uD83D\uDCDA"],
    ["Compras", "expense", "\uD83D\uDED2"],
    ["Outros", "expense", "\uD83D\uDCE6"],
    ["Salario", "earning", "\uD83D\uDCB0"],
    ["Freelance", "earning", "\uD83D\uDCBB"],
    ["Investimentos", "earning", "\uD83D\uDCC8"],
    ["Outros", "earning", "\uD83D\uDCB5"],
  ];

  const tx = db.transaction(() => {
    for (const [name, type, icon] of defaults) {
      insert.run(name, type, icon);
    }
  });
  tx();
}

export function closeDb(): void {
  if (db) db.close();
}
