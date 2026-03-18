const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`API error: ${res.status} ${res.statusText} ${url}`, body);
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

export type AccountType = "checking" | "savings_cdb" | "emergency" | "credit_card" | "vr" | "va" | "multi_benefit";
export type CardType = "debit" | "credit" | "benefit";
export type PaymentType = "debit" | "credit" | "pix" | "boleto" | "benefit";

export interface Transaction {
  id: number;
  type: "expense" | "earning";
  amount: number;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  payment_type: PaymentType | null;
  card_id: number | null;
  card_name: string | null;
  account_id: number | null;
  account_name: string | null;
  is_installment: number;
  date: string;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  closing_day: number | null;
  current_bill?: number;
  created_at: string;
}

export interface Card {
  id: number;
  name: string;
  account_id: number;
  type: CardType;
  account_name: string;
  account_type: AccountType;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: "expense" | "earning";
  icon: string | null;
}

export interface Totals {
  expenses: number;
  earnings: number;
  net: number;
}

export interface CategorySummary {
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
}

export interface DailyData {
  date: string;
  expenses: number;
  earnings: number;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

export interface BudgetProgress {
  id: number;
  category_id: number;
  monthly_limit: number;
  month: string;
  category_name: string;
  category_icon: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export const api = {
  getTransactions(start: string, end: string) {
    return request<Transaction[]>(`/api/transactions?start=${start}&end=${end}`);
  },

  deleteTransaction(id: number) {
    return request<{ ok: boolean }>(`/api/transactions/${id}`, { method: "DELETE" });
  },

  getTotals(start: string, end: string) {
    return request<Totals>(`/api/summary/totals?start=${start}&end=${end}`);
  },

  getBalance() {
    return request<{ expenses: number; earnings: number; balance: number }>("/api/summary/balance");
  },

  getByCategory(start: string, end: string, type: "expense" | "earning") {
    return request<CategorySummary[]>(
      `/api/summary/by-category?start=${start}&end=${end}&type=${type}`,
    );
  },

  getDaily(start: string, end: string) {
    return request<DailyData[]>(`/api/summary/daily?start=${start}&end=${end}`);
  },

  getCategories() {
    return request<Category[]>("/api/categories");
  },

  getGoals() {
    return request<Goal[]>("/api/goals");
  },

  createGoal(name: string, target_amount: number, deadline?: string) {
    return request<Goal>("/api/goals", {
      method: "POST",
      body: JSON.stringify({ name, target_amount, deadline }),
    });
  },

  depositGoal(id: number, amount: number) {
    return request<{ ok: boolean }>(`/api/goals/${id}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  deleteGoal(id: number) {
    return request<{ ok: boolean }>(`/api/goals/${id}`, { method: "DELETE" });
  },

  getBudgetProgress(month: string) {
    return request<BudgetProgress[]>(`/api/budgets/progress?month=${month}`);
  },

  getAiStatus() {
    return request<{ available: boolean }>("/api/insights/status");
  },

  getAdvice(question?: string) {
    return request<{ advice: string }>("/api/insights/advice", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  getMonthlyInsights(year: number, month: number) {
    return request<{ report: string }>(`/api/insights/monthly?year=${year}&month=${month}`);
  },

  getAnomalies() {
    return request<{ anomalies: string | null }>("/api/insights/anomalies");
  },

  planGoal(description: string, deadline?: string) {
    return request<{ suggestion: string }>("/api/insights/plan-goal", {
      method: "POST",
      body: JSON.stringify({ description, deadline }),
    });
  },

  planBudget() {
    return request<{ suggestion: string }>("/api/insights/plan-budget", {
      method: "POST",
    });
  },

  // Accounts
  getAccounts() {
    return request<Account[]>("/api/accounts");
  },

  createAccount(name: string, type: AccountType, balance?: number, closingDay?: number) {
    return request<Account>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ name, type, balance, closing_day: closingDay }),
    });
  },

  updateAccount(id: number, name: string, closingDay?: number) {
    return request<Account>(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, closing_day: closingDay }),
    });
  },

  updateAccountBalance(id: number, balance: number) {
    return request<Account>(`/api/accounts/${id}/balance`, {
      method: "PUT",
      body: JSON.stringify({ balance }),
    });
  },

  deleteAccount(id: number) {
    return request<{ ok: boolean }>(`/api/accounts/${id}`, { method: "DELETE" });
  },

  // Cards
  getCards() {
    return request<Card[]>("/api/accounts/cards");
  },

  createCard(name: string, accountId: number, type: CardType) {
    return request<Card>("/api/accounts/cards", {
      method: "POST",
      body: JSON.stringify({ name, account_id: accountId, type }),
    });
  },

  deleteCard(id: number) {
    return request<{ ok: boolean }>(`/api/accounts/cards/${id}`, { method: "DELETE" });
  },
};
