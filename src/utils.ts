const CURRENCY_SYMBOL = process.env.CURRENCY_SYMBOL ?? "R$";

export function formatCurrency(value: number): string {
  return `${CURRENCY_SYMBOL}${value.toFixed(2)}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekStartStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export function monthStartStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthEndStr(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
