const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export interface Transaction {
  id: number;
  type: "expense" | "earning";
  amount: number;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  date: string;
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
};
