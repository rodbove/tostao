# Tostao

Personal finance Telegram bot with a web dashboard and AI-powered insights.

Named after the legendary Brazilian footballer — and the word for a small coin.

## Features

- **Telegram bot** — log expenses and earnings via commands or quick input (`50 almoco`, `+3000 salario`)
- **Web dashboard** — charts, timelines, transaction list, goals and budget tracking
- **AI insights** — financial advice, monthly reports, and anomaly detection via Anthropic API
- **CSV export** — download transactions from the bot or web UI

## Setup

### Prerequisites

- Node.js 22+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your Telegram user ID (use [@userinfobot](https://t.me/userinfobot) to find it)
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for AI features

### Install

```bash
git clone <repo-url> tostao
cd tostao
npm install
cd web-ui && npm install && cd ..
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ALLOWED_USER_ID=your-telegram-user-id
ANTHROPIC_API_KEY=your-api-key  # optional
```

### Run (development)

Start the bot + API server:

```bash
npm run dev
```

In a separate terminal, start the web UI:

```bash
cd web-ui
npm run dev
```

The web UI runs at `http://localhost:5173` and proxies API calls to the backend on port 3001.

### Build & run (production)

```bash
npm run build
cd web-ui && npm run build && cd ..
npm start
```

The backend serves both the API and the built web UI on port 3001.

### Docker

```bash
docker build -t tostao .
docker run -d \
  --name tostao \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -p 3001:3001 \
  tostao
```

## Bot commands

| Command | Description |
|---|---|
| `/expense` | Log an expense (interactive category picker) |
| `/earning` | Log an earning |
| `/today` | Today's summary |
| `/week` | Weekly summary by category |
| `/month` | Monthly summary with budget progress |
| `/balance` | Lifetime balance |
| `/goal` | View/create savings goals |
| `/budget` | View budget progress |
| `/budgetset` | Set monthly budget per category |
| `/advice` | AI financial advice |
| `/insights` | AI monthly report |
| `/anomalies` | Detect unusual spending |
| `/export` | Export current month as CSV |
| `/categories` | List categories |
| `/undo` | Delete last transaction |

**Quick input** — send a message like `50 almoco` to log R$50 as an expense, or `+3000 salario` for an earning.

## Web UI

Access at `http://localhost:3001` (production) or `http://localhost:5173` (dev).

- **Dashboard** — monthly totals, spending by category, daily chart
- **Timeline** — daily/weekly/monthly view with cumulative savings
- **Transactions** — filterable list with CSV export
- **Goals** — savings goals with progress bars and budget tracking
- **Insights** — AI-powered advice, monthly reports, anomaly detection
