# Tostão — Project Plan

## Overview
A personal Telegram bot for tracking expenses and earnings, with a web UI
for visualizing financial data by timeline, and AI-powered recommendations
to help plan savings and achieve financial goals.

Named after the legendary Brazilian footballer — and the word for a small coin.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────┐
│  Telegram    │────▶│  Tostão          │────▶│  SQLite   │
│  (input)     │◀────│  (Node.js/TS)    │◀────│  (data)   │
└─────────────┘     └────────┬─────────┘     └───────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
              ┌─────▼─────┐    ┌──────▼──────┐
              │  Web UI    │    │  Anthropic   │
              │  (React)   │    │  API         │
              │  port 3001 │    └─────────────┘
              └───────────┘
```

## Tech Stack
- **Runtime:** Node.js + TypeScript (consistent with bragger)
- **Telegram:** Grammy (same as bragger)
- **Database:** SQLite via better-sqlite3 (simple, no infra needed)
- **Web UI:** React + Vite (lightweight SPA)
- **Charts:** Recharts (timeline visualizations)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`)
- **Styling:** Tailwind CSS

## Data Model

```sql
-- Categories for expenses/earnings
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'earning')),
  icon TEXT,  -- emoji for telegram display
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual transactions
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'earning')),
  amount REAL NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  date DATE NOT NULL DEFAULT (date('now')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Savings goals
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  deadline DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Monthly budgets per category
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  monthly_limit REAL NOT NULL,
  month TEXT NOT NULL  -- 'YYYY-MM' format
);
```

## Telegram Bot Commands

| Command       | Description                                    |
|---------------|------------------------------------------------|
| `/start`      | Welcome + setup default categories             |
| `/expense`    | Log an expense (interactive: amount → category → description) |
| `/earning`    | Log an earning                                 |
| `/today`      | Show today's transactions summary              |
| `/week`       | Weekly summary with totals by category         |
| `/month`      | Monthly summary + budget progress              |
| `/balance`    | Current balance (earnings - expenses)          |
| `/goal`       | Create/view savings goals                      |
| `/budget`     | Set monthly budget for a category              |
| `/advice`     | AI-powered financial advice                    |
| `/report`     | Link to web UI for detailed charts             |
| `/categories` | Manage expense/earning categories              |
| `/undo`       | Delete last transaction                        |
| `/export`     | Export data as CSV                              |

### Quick Input (no command needed)
The bot should support quick-entry messages like:
- `50 lunch` → logs R$50 expense in "Food" category
- `+3000 salary` → logs R$3000 earning
- Pattern: `[+]<amount> <description>` (+ prefix = earning, no prefix = expense)

## Web UI Pages

### Dashboard (`/`)
- Current month overview: total income, total expenses, net
- Spending by category (pie/donut chart)
- Daily spending trend (bar chart)
- Budget progress bars
- Goals progress

### Timeline (`/timeline`)
- Toggle: daily / weekly / monthly view
- Stacked bar chart: expenses by category over time
- Line chart: cumulative savings
- Income vs expenses comparison

### Transactions (`/transactions`)
- Filterable/searchable list of all transactions
- Filter by: date range, category, type
- Edit/delete individual entries

### Goals (`/goals`)
- Progress toward each savings goal
- Projected completion date based on current savings rate
- AI recommendations for achieving goals faster

### Insights (`/insights`)
- AI-generated monthly report
- Spending patterns and anomalies
- Personalized recommendations
- "What if" scenarios (e.g., "if you reduce dining out by 30%...")

## AI Integration

### When AI is used:
1. **`/advice` command** — user asks for financial advice, bot sends recent
   transaction history with a system prompt for personal finance analysis
2. **Monthly insights** — auto-generated at month end, summarizes spending
   patterns and gives actionable recommendations
3. **Goal planning** — when user creates/views a goal, analyzes their
   income/expense patterns and suggests realistic savings plans
4. **Anomaly detection** — flag unusual spending (e.g., "you spent 3x more
   on dining this week compared to your average")

### System prompt approach:
```
You are a personal finance advisor. You have access to the user's transaction
history. Provide concise, actionable advice. Use BRL (R$) as currency.
Be encouraging but honest. Focus on practical small changes.
```

### Cost control:
- Use haiku for simple categorization/anomaly detection
- Use sonnet for detailed monthly reports and advice
- Cache system prompts with transaction summaries (not raw data)
- Rate limit: max 10 AI calls per day

## Project Structure

```
tostao/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── src/
│   ├── index.ts              # Entry point
│   ├── bot/
│   │   ├── bot.ts            # Grammy bot setup
│   │   ├── commands/
│   │   │   ├── expense.ts
│   │   │   ├── earning.ts
│   │   │   ├── summary.ts    # today/week/month
│   │   │   ├── goals.ts
│   │   │   ├── budget.ts
│   │   │   ├── advice.ts     # AI advice
│   │   │   └── export.ts
│   │   ├── quick-input.ts    # "50 lunch" parser
│   │   └── middleware.ts     # auth, error handling
│   ├── db/
│   │   ├── schema.ts         # SQLite setup + migrations
│   │   ├── transactions.ts   # CRUD for transactions
│   │   ├── categories.ts
│   │   ├── goals.ts
│   │   └── budgets.ts
│   ├── ai/
│   │   ├── client.ts         # Anthropic SDK setup
│   │   ├── advice.ts         # Financial advice generation
│   │   ├── insights.ts       # Monthly report generation
│   │   └── prompts.ts        # System prompts
│   └── web/
│       ├── server.ts         # Express/Fastify API
│       └── api/
│           ├── transactions.ts
│           ├── summary.ts
│           ├── goals.ts
│           └── insights.ts
├── web-ui/                   # React SPA (Vite)
│   ├── package.json
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── Goals.tsx
│   │   │   └── Insights.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   └── common/
│   │   └── api/
│   │       └── client.ts     # API client
│   └── tailwind.config.js
└── data/
    └── tostao.db             # SQLite database (gitignored)
```

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=          # from @BotFather
TELEGRAM_ALLOWED_USER_ID=    # your telegram user ID

# AI
ANTHROPIC_API_KEY=           # from console.anthropic.com

# App
DATABASE_URL=file:./data/tostao.db
WEB_UI_PORT=3001
TZ=America/Sao_Paulo

# Optional
CURRENCY=BRL
CURRENCY_SYMBOL=R$
```

## Implementation Phases

### v0.1 — Core Bot (MVP)
- [ ] Project scaffold (Node.js, TS, Grammy, SQLite)
- [ ] Database schema + migrations
- [ ] Basic commands: `/expense`, `/earning`, `/today`, `/week`, `/month`
- [ ] Quick input parser ("50 lunch")
- [ ] Category management
- [ ] Dockerfile

### v0.2 — Web UI
- [ ] REST API for transactions/summaries
- [ ] React SPA scaffold (Vite + Tailwind)
- [ ] Dashboard page with charts
- [ ] Timeline page
- [ ] Transactions list with filters

### v0.3 — Goals & Budgets
- [ ] `/goal` command + goals DB
- [ ] `/budget` command + budgets DB
- [ ] Budget progress in `/month` summary
- [ ] Goals page in web UI

### v0.4 — AI Integration
- [ ] Anthropic SDK setup
- [ ] `/advice` command
- [ ] Monthly auto-generated insights
- [ ] Goal planning recommendations
- [ ] Anomaly detection alerts
- [ ] Insights page in web UI

### v0.5 — Polish
- [ ] `/export` CSV
- [ ] `/undo` last transaction
- [ ] Edit/delete from web UI
- [ ] Mobile-friendly web UI
- [ ] Error handling + graceful degradation when AI quota exceeded
