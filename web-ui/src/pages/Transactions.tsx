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
        <h1 className="text-2xl font-bold">Transacoes</h1>
        <button
          onClick={handleExport}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">De</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Ate</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Tipo</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">Todos</option>
            <option value="expense">Gastos</option>
            <option value="earning">Ganhos</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Categoria</span>
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value ? parseInt(e.target.value) : "")
            }
            className="border border-gray-300 rounded px-2 py-1 text-sm"
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm p-4">Nenhuma transacao encontrada</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descricao</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(t.date)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        t.type === "earning"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {t.type === "earning" ? "Ganho" : "Gasto"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {t.category_icon} {t.category_name ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{t.description ?? "-"}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      t.type === "earning" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {t.type === "earning" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
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

      <p className="text-xs text-gray-400">
        {filtered.length} transacao(es)
      </p>
    </div>
  );
}
