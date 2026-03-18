import { useEffect, useState } from "react";
import { api, type Transaction, type Category } from "../api/client";
import { formatCurrency, formatDate, monthStartStr, monthEndStr } from "../utils";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(monthEndStr());
  const [filterType, setFilterType] = useState<"" | "expense" | "earning">("");
  const [filterCategory, setFilterCategory] = useState<number | "">("");

  useEffect(() => {
    api.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    api.getTransactions(startDate, endDate).then(setTransactions);
  }, [startDate, endDate]);

  const filtered = transactions.filter((t) => {
    if (filterType && t.type !== filterType) return false;
    if (filterCategory && t.category_id !== filterCategory) return false;
    return true;
  });

  async function handleDelete(id: number) {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function handleExport() {
    const base = import.meta.env.VITE_API_URL ?? "";
    window.open(`${base}/api/transactions/export?start=${startDate}&end=${endDate}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Transacoes</h1>
        <button
          onClick={handleExport}
          className="text-sm text-gold hover:text-gold-light font-medium"
        >
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-ink-light mb-1">De</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink"
          />
        </label>
        <label className="text-sm">
          <span className="block text-ink-light mb-1">Ate</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink"
          />
        </label>
        <label className="text-sm">
          <span className="block text-ink-light mb-1">Tipo</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink"
          >
            <option value="">Todos</option>
            <option value="expense">Gastos</option>
            <option value="earning">Ganhos</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-light mb-1">Categoria</span>
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value ? parseInt(e.target.value) : "")
            }
            className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-lg border border-cream-dark overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <p className="text-ink-light text-sm p-4">Nenhuma transacao encontrada</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream text-ink-light text-left">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descricao</th>
                <th className="px-4 py-2">Pagamento</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-cream/50">
                  <td className="px-4 py-2">{formatDate(t.date)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        t.type === "earning"
                          ? "bg-green/10 text-green"
                          : "bg-red-accent/10 text-red-accent"
                      }`}
                    >
                      {t.type === "earning" ? "Ganho" : "Gasto"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {t.category_icon} {t.category_name ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-ink-light">{t.description ?? "-"}</td>
                  <td className="px-4 py-2">
                    {t.payment_type ? (
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          t.payment_type === "credit" ? "bg-gold/20 text-ink"
                            : t.payment_type === "benefit" ? "bg-gold-light/40 text-ink-light"
                            : "bg-green/10 text-green-dark"
                        }`}>
                          {{ debit: "Debito", credit: "Credito", pix: "Pix", boleto: "Boleto", benefit: "Beneficio" }[t.payment_type]}
                        </span>
                        {t.card_name && (
                          <span className="block text-xs text-ink-light mt-0.5">{t.card_name}</span>
                        )}
                        {t.account_name && !t.card_name && (
                          <span className="block text-xs text-ink-light mt-0.5">{t.account_name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-cream-dark">-</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      t.type === "earning" ? "text-green" : "text-red-accent"
                    }`}
                  >
                    {t.type === "earning" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-ink-light hover:text-red-accent text-xs"
                    >
                      excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-ink-light">
        {filtered.length} transacao(es)
      </p>
    </div>
  );
}
