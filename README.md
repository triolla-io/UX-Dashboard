# UX Dashboard Audit

AI-powered dashboard critique tool by [Triolla](https://triolla.io). Upload a screenshot of any dashboard and get a structured scorecard with actionable insights.

## What it does

- Accepts a dashboard screenshot (PNG/JPG)
- Scores it across four categories: **UX**, **Visual Design**, **Usability**, and **Data Clarity**
- Returns ranked insights (positives + issues) and an overall verdict vs. industry average
- Powered by Claude — every score is grounded in visible elements, never fabricated

## Stack

- **Frontend** — React + Vite + TypeScript
- **Backend** — Express + TypeScript, proxies to Claude API
- **Monorepo** — npm workspaces

## Getting started

### Prerequisites

- Node.js 18+
- An Anthropic API key

### Install

```bash
npm install
```

### Configure

```bash
cp backend/.env.example backend/.env
# Add your ANTHROPIC_API_KEY to backend/.env
```

### Run (dev)

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3001`.

### Build & run (production)

```bash
npm run build
npm start
```

The backend serves the built frontend from `frontend/dist/`.

## Project structure

```
├── frontend/       React app (upload UI, loading, results)
├── backend/        Express API + Claude critique engine
│   └── src/
│       ├── audit.ts          Scoring logic & types
│       ├── routes/feedback.ts API endpoint
│       └── skills/prompts/   Claude prompt
└── package.json    Workspace root
```

## API

`POST /api/feedback`

```json
{
  "image": "<base64-encoded image>",
  "mimeType": "image/png"
}
```

Returns an `AuditResult` with `overall`, `verdict`, `categories`, and `insights`.
