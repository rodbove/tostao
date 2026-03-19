import { useEffect, useState } from "react";
import { api, type Account, type Card, type AccountType, type CardType } from "../api/client";
import { formatCurrency } from "../utils";

const TYPE_ICONS: Record<string, string> = {
  checking: "\uD83C\uDFE6",
  savings_cdb: "\uD83D\uDCC8",
  emergency: "\uD83D\uDEE1\uFE0F",
  credit_card: "\uD83D\uDCB3",
  vr: "\uD83C\uDF7D\uFE0F",
  va: "\uD83D\uDED2",
  multi_benefit: "\uD83C\uDF1F",
};

const TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings_cdb: "CDB / Investimento",
  emergency: "Reserva de emergencia",
  credit_card: "Cartao de credito",
  vr: "Vale refeicao",
  va: "Vale alimentacao",
  multi_benefit: "Multi-beneficios",
};

const CARD_TYPE_LABELS: Record<string, string> = {
  debit: "Debito",
  credit: "Credito",
  benefit: "Beneficio",
};

const ACCOUNT_TYPES: AccountType[] = [
  "checking", "savings_cdb", "emergency", "credit_card", "vr", "va", "multi_benefit",
];

function cardTypeForAccount(accountType: AccountType): CardType {
  if (accountType === "credit_card") return "credit";
  if (accountType === "vr" || accountType === "va" || accountType === "multi_benefit") return "benefit";
  return "debit";
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<AccountType>("checking");
  const [newAccClosingDay, setNewAccClosingDay] = useState("");
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardAccountId, setNewCardAccountId] = useState<number | "">("");
  const [editingAccount, setEditingAccount] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [accs, crds] = await Promise.all([api.getAccounts(), api.getCards()]);
    setAccounts(accs);
    setCards(crds);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const closingDay = newAccType === "credit_card" && newAccClosingDay
      ? parseInt(newAccClosingDay)
      : undefined;
    await api.createAccount(newAccName.trim(), newAccType, 0, closingDay);
    setNewAccName("");
    setNewAccType("checking");
    setNewAccClosingDay("");
    setShowNewAccount(false);
    await loadData();
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardName.trim() || !newCardAccountId) return;
    const account = accounts.find((a) => a.id === newCardAccountId);
    if (!account) return;
    const cardType = cardTypeForAccount(account.type);
    await api.createCard(newCardName.trim(), newCardAccountId, cardType);
    setNewCardName("");
    setNewCardAccountId("");
    setShowNewCard(false);
    await loadData();
  }

  async function handleDeleteAccount(id: number) {
    await api.deleteAccount(id);
    await loadData();
  }

  async function handleDeleteCard(id: number) {
    await api.deleteCard(id);
    await loadData();
  }

  async function handleUpdateAccount(id: number) {
    if (!editName.trim()) return;
    const closingDay = editClosingDay ? parseInt(editClosingDay) : undefined;
    await api.updateAccount(id, editName.trim(), closingDay);
    setEditingAccount(null);
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Contas e Cartoes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowNewAccount(!showNewAccount); setShowNewCard(false); }}
            className="bg-green text-white px-3 py-1.5 rounded text-sm hover:bg-green-dark"
          >
            + Conta
          </button>
          <button
            onClick={() => { setShowNewCard(!showNewCard); setShowNewAccount(false); }}
            className="bg-gold text-white px-3 py-1.5 rounded text-sm hover:bg-gold-light"
          >
            + Cartao
          </button>
        </div>
      </div>

      {/* New Account Form */}
      {showNewAccount && (
        <form onSubmit={handleCreateAccount} className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-ink-light">Nova conta</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="Nome (ex: Nubank)"
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
              autoFocus
            />
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value as AccountType)}
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {newAccType === "credit_card" && (
            <input
              type="number"
              min={1}
              max={28}
              value={newAccClosingDay}
              onChange={(e) => setNewAccClosingDay(e.target.value)}
              placeholder="Dia de fechamento (1-28)"
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink w-full"
            />
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-green text-white px-4 py-1.5 rounded text-sm hover:bg-green-dark">
              Criar
            </button>
            <button type="button" onClick={() => setShowNewAccount(false)} className="text-sm text-ink-light hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* New Card Form */}
      {showNewCard && (
        <form onSubmit={handleCreateCard} className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-ink-light">Novo cartao</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="Nome (ex: Nubank Credito)"
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
              autoFocus
            />
            <select
              value={newCardAccountId}
              onChange={(e) => setNewCardAccountId(e.target.value ? parseInt(e.target.value) : "")}
              className="border border-cream-dark rounded px-3 py-1.5 text-sm bg-paper text-ink"
            >
              <option value="">Selecione a conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {TYPE_ICONS[a.type]} {a.name} ({CARD_TYPE_LABELS[cardTypeForAccount(a.type)]})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-gold text-white px-4 py-1.5 rounded text-sm hover:bg-gold-light">
              Criar
            </button>
            <button type="button" onClick={() => setShowNewCard(false)} className="text-sm text-ink-light hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <p className="text-ink-light text-sm">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const accountCards = cards.filter((c) => c.account_id === a.id);
            const isEditing = editingAccount === a.id;

            return (
              <div key={a.id} className="bg-paper rounded-lg border border-cream-dark p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[a.type]}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAccount(a.id)}
                        />
                        {a.type === "credit_card" && (
                          <input
                            type="number"
                            min={1}
                            max={28}
                            value={editClosingDay}
                            onChange={(e) => setEditClosingDay(e.target.value)}
                            placeholder="Fechamento"
                            className="border border-cream-dark rounded px-2 py-1 text-sm bg-paper text-ink w-24"
                          />
                        )}
                        <button onClick={() => handleUpdateAccount(a.id)} className="text-xs text-green font-medium">Salvar</button>
                        <button onClick={() => setEditingAccount(null)} className="text-xs text-ink-light">Cancelar</button>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-ink">{a.name}</span>
                        <span className="text-xs text-ink-light ml-2">{TYPE_LABELS[a.type]}</span>
                        {a.type === "credit_card" && a.closing_day && (
                          <span className="text-xs text-ink-light ml-2">(fecha dia {a.closing_day})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {a.type === "credit_card" ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-accent">Fatura: {formatCurrency(a.current_bill ?? 0)}</p>
                        <p className="text-xs text-ink-light">Limite: {formatCurrency(a.balance)}</p>
                      </div>
                    ) : (
                      <span className={`text-sm font-bold ${a.balance >= 0 ? "text-green" : "text-red-accent"}`}>
                        {formatCurrency(a.balance)}
                      </span>
                    )}
                    {!isEditing && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingAccount(a.id);
                            setEditName(a.name);
                            setEditClosingDay(a.closing_day?.toString() ?? "");
                          }}
                          className="text-xs text-gold hover:text-gold-light"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(a.id)}
                          className="text-xs text-red-accent hover:text-red-accent/70"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cards under this account */}
                {accountCards.length > 0 && (
                  <div className="mt-3 ml-8 space-y-1">
                    {accountCards.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-light">
                          💳 {c.name} <span className="text-xs">({CARD_TYPE_LABELS[c.type]})</span>
                        </span>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="text-xs text-red-accent hover:text-red-accent/70"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
