# 📌 empeo-api

> REST API for Empeo, a performance-review workspace: managers save and submit
> scores, HR calibrates fairness and publishes the cycle, employees see results
> only after publish.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2F6-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 📖 Table of Contents

- [Live & design](#-live--design)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Docs](#-docs)
- [Author](#-author)

---

## 🔗 Live & design

| | URL |
|---|---|
| **Web (prod)** | [https://empeo-web.vercel.app/hr](https://empeo-web.vercel.app/hr) |
| **API (prod)** | [https://empeo-api.onrender.com](https://empeo-api.onrender.com) |
| **Health** | [https://empeo-api.onrender.com/health](https://empeo-api.onrender.com/health) |
| **Figma** | [empo-prototype](https://www.figma.com/design/IQl2G0gFCmEnfiSjPr1FC1/empo-prototype?t=C2si2JRYCETkCDjE-1) |
| **Repo** | [Kaopan11/empeo-api](https://github.com/Kaopan11/empeo-api) |

Render’s free tier sleeps when idle; the first request may take 30–60 seconds.

---

## ✨ Features

- Team list with evaluation **status from the database** (`PENDING`, `DRAFT`, `SUBMITTED`, `OVERDUE`)
- Manager **save** (→ `DRAFT`) and **submit** (→ `SUBMITTED`); overdue/submitted are blocked (409)
- **Fairness engine** after submit: team z-score, HIGH/CORE/LOW, manager bias index (persisted)
- **HR dashboard** aggregates, bias labels, talent table
- **Resolve overdue**: submit if scores validate, otherwise unlock to `DRAFT`
- **Publish cycle** (HR via `x-user-id`); employees gated until published + submitted
- Re-runnable **SQL seed** with mixed statuses for the HR demo

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express 5, TypeScript
- **Database:** Supabase (Postgres)
- **Auth (demo):** `x-user-id` header + `users.role` (not JWT)
- **Libraries:** Zod, `@supabase/supabase-js`, cors, dotenv, ts-node

---

## 📁 Project Structure

```text
empeo-api/
├── src/
│   ├── app.ts                 # listen on PORT || 4000
│   ├── routes/                # HTTP only
│   ├── services/              # use cases
│   ├── domain/                # pure logic (team, fairness, …)
│   ├── repositories/          # Supabase client + queries
│   ├── types/
│   ├── controllers/           # placeholder
│   └── middlewares/           # placeholder
├── supabase/
│   ├── seed.sql
│   └── migrations/
├── test/
├── docs/
└── package.json
```

---

## 🚀 Getting Started

**Prerequisites:** Node.js 18+, a Supabase project.

```bash
git clone https://github.com/Kaopan11/empeo-api.git
cd empeo-api
npm install
```

Create a `.env` in the project root (do not commit it):

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

Run seed + migrations in the **Supabase SQL Editor** for that same project
(`supabase/migrations/*.sql`, then `supabase/seed.sql`).

```bash
npm run dev      # local reload
npm start        # same as production
npm test
npx tsc --noEmit
```

API: [http://localhost:4000/health](http://localhost:4000/health)

Demo cycle id: `b1000000-0000-4000-8000-000000000001`

---

## 🔐 Environment Variables

| Name | Required | Description |
|------|----------|-------------|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role (server only — never in the browser) |
| `PORT` | no | Listen port (Render sets this; default `4000`) |

There is no committed `.env.example`; copy the table above.

---

## 📚 API Reference

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | `{ "ok": true }` |
| `GET` | `/employees` | Legacy list |
| `GET` | `/api/evaluations/team?managerId=` | UUID; team + status |
| `POST` | `/api/evaluations/:id/save` | Body: technical, collaboration, feedback |
| `POST` | `/api/evaluations/:id/submit` | Same body; then fairness |
| `GET` | `/api/cycles/:cycleId` | Cycle metadata |
| `GET` | `/api/cycles/:cycleId/dashboard` | HR snapshot |
| `GET` | `/api/cycles/:cycleId/manager-metrics` | Bias per manager |
| `POST` | `/api/cycles/:cycleId/publish` | `{ "published": boolean }`, header `x-user-id` (HR) |
| `POST` | `/api/cycles/:cycleId/resolve-overdue` | Unlock or submit overdue rows |
| `GET` | `/api/me/review?cycleId=` | Header `x-user-id` (employee) |

Errors are JSON `{ "error": "..." }` with 4xx/5xx.

---

## 🚢 Deployment

Hosted on **Render** as a Node Web Service.

| Setting | Value |
|---------|--------|
| Branch | `main` (or `chore/deploy` while rolling out) |
| Build | `npm install` |
| Start | `npm start` |
| Env | `SUPABASE_*`, `NODE_ENV=production` |
| Dev deps | If start fails on `typescript`, set `NPM_CONFIG_PRODUCTION=false` |

No Dockerfile in this repo.

---

## 📄 Docs

- [Technical decisions](docs/technical-decisions.md)
- [Requirement change](docs/requirement-change.md)
- [AI case study](docs/ai-case-study.md)

---

## 👤 Author

[Kaopan11](https://github.com/Kaopan11) — companion UI: [empeo-web](https://github.com/Kaopan11/empeo-web)
