export function formatCurrency(value: number): string {
  return `R$${value.toFixed(2)}`;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartStr(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthEndStr(date = new Date()): string {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function weekStartStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function monthLabel(date = new Date()): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
