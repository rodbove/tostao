import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { api } from "../api/client";

function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-ink-light leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1 [&_strong]:text-ink">
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
    return <p className="text-ink-light text-sm">Carregando...</p>;
  }

  if (!aiAvailable) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">Insights</h1>
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 text-sm text-ink-light">
          ANTHROPIC_API_KEY nao configurada. Defina a variavel de ambiente para habilitar insights com IA.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Insights</h1>

      {/* Ask advice */}
      <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-light mb-3">Pergunte ao Tostao</h2>
        <form onSubmit={askAdvice} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: como posso economizar mais este mes?"
            className="flex-1 border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
          />
          <button
            type="submit"
            disabled={loading.advice}
            className="bg-green text-white px-4 py-1.5 rounded text-sm hover:bg-green-dark disabled:opacity-50"
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
      <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-light">Relatorio mensal</h2>
          <button
            onClick={loadReport}
            disabled={loading.report}
            className="text-sm text-gold hover:text-gold-light font-medium disabled:opacity-50"
          >
            {loading.report ? "Gerando..." : report ? "Atualizar" : "Gerar relatorio"}
          </button>
        </div>
        {report && <Md>{report}</Md>}
      </div>

      {/* Anomalies */}
      <div className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-light">Deteccao de anomalias</h2>
          <button
            onClick={loadAnomalies}
            disabled={loading.anomalies}
            className="text-sm text-gold hover:text-gold-light font-medium disabled:opacity-50"
          >
            {loading.anomalies ? "Verificando..." : anomalies ? "Verificar novamente" : "Verificar"}
          </button>
        </div>
        {anomalies && <Md>{anomalies}</Md>}
      </div>
    </div>
  );
}
