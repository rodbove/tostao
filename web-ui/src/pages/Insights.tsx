import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { api } from "../api/client";

function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1 [&_strong]:text-gray-900">
      <Markdown>{children}</Markdown>
    </div>
  );
}

export default function Insights() {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState({ report: false, anomalies: false, advice: false });

  useEffect(() => {
    api.getAiStatus()
      .then((s) => setAiAvailable(s.available))
      .catch(() => setAiAvailable(false));
  }, []);

  async function loadReport() {
    setLoading((l) => ({ ...l, report: true }));
    try {
      const now = new Date();
      const data = await api.getMonthlyInsights(now.getFullYear(), now.getMonth() + 1);
      setReport(data.report);
    } catch {
      setReport("Erro ao gerar relatorio.");
    }
    setLoading((l) => ({ ...l, report: false }));
  }

  async function loadAnomalies() {
    setLoading((l) => ({ ...l, anomalies: true }));
    try {
      const data = await api.getAnomalies();
      setAnomalies(data.anomalies ?? "Nenhuma anomalia detectada.");
    } catch {
      setAnomalies("Erro ao verificar anomalias.");
    }
    setLoading((l) => ({ ...l, anomalies: false }));
  }

  async function askAdvice(e: React.FormEvent) {
    e.preventDefault();
    setLoading((l) => ({ ...l, advice: true }));
    try {
      const data = await api.getAdvice(question || undefined);
      setAdvice(data.advice);
    } catch {
      setAdvice("Erro ao consultar IA.");
    }
    setLoading((l) => ({ ...l, advice: false }));
  }

  if (aiAvailable === null) {
    return <p className="text-gray-400 text-sm">Carregando...</p>;
  }

  if (!aiAvailable) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ANTHROPIC_API_KEY nao configurada. Defina a variavel de ambiente para habilitar insights com IA.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights</h1>

      {/* Ask advice */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Pergunte ao Tostao</h2>
        <form onSubmit={askAdvice} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: como posso economizar mais este mes?"
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading.advice}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading.advice ? "Pensando..." : "Perguntar"}
          </button>
        </form>
        {advice && (
          <div className="mt-3">
            <Md>{advice}</Md>
          </div>
        )}
      </div>

      {/* Monthly report */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">Relatorio mensal</h2>
          <button
            onClick={loadReport}
            disabled={loading.report}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
          >
            {loading.report ? "Gerando..." : report ? "Atualizar" : "Gerar relatorio"}
          </button>
        </div>
        {report && <Md>{report}</Md>}
      </div>

      {/* Anomalies */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">Deteccao de anomalias</h2>
          <button
            onClick={loadAnomalies}
            disabled={loading.anomalies}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
          >
            {loading.anomalies ? "Verificando..." : anomalies ? "Verificar novamente" : "Verificar"}
          </button>
        </div>
        {anomalies && <Md>{anomalies}</Md>}
      </div>
    </div>
  );
}
