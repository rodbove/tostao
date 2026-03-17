export interface QuickInput {
  type: "expense" | "earning";
  amount: number;
  description: string;
}

/**
 * Parse quick input messages like:
 *   "50 lunch"     → R$50 expense, description "lunch"
 *   "+3000 salary" → R$3000 earning, description "salary"
 *   "12.50 coffee" → R$12.50 expense, description "coffee"
 */
export function parseQuickInput(text: string): QuickInput | null {
  const match = text.match(/^(\+?)(\d+(?:[.,]\d{1,2})?)\s+(.+)$/);
  if (!match) return null;

  const [, plus, rawAmount, description] = match;
  const amount = parseFloat(rawAmount.replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  return {
    type: plus ? "earning" : "expense",
    amount,
    description: description.trim(),
  };
}
