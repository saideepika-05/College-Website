# College ERP & Academic Management System

A production-ready, multi-portal college ERP built with Next.js 16, Drizzle ORM,
Neon Postgres, and Better Auth — deployed on Vercel.

## Portals

| Portal | Who | What |
|---|---|---|
| `/admin` | Admin | Full academic structure, people, timetables, attendance, reports, audit logs, global search |
| `/hod` | Head of Department | Department-scoped students/teachers, subject assignments, timetables, attendance QR, promotion, notices |
| `/teacher` | Teacher | Assigned classes, QR attendance (projector screen + live roster), assignments, section notices |
| `/student` | Student | Mobile-first: dashboard, QR scan attendance, timetable, assignments, notices |

## Stack

- **Next.js 16** (App Router) — Server Components for reads, Server Actions
  (next-safe-action + Zod) for mutations, Route Handlers for QR scan/exports/cron
- **Drizzle ORM** + **PostgreSQL** (Neon in production, plain `pg` driver everywhere)
- **Better Auth** — credentials sign-in, sessions, account status enforcement
- **Tailwind v4 + shadcn/ui**, TanStack Table, Recharts, cmdk (⌘K search)
- **exceljs / @react-pdf/renderer** — Excel & PDF report exports

## Architecture highlights

- **Enrollment is the pivot**: a student's section/year/session lives in
  `enrollments` (unique per student+session). Promotion inserts new rows —
  history is preserved by construction, never overwritten.
- **Authorization by construction**: four scoped action clients
  (`adminAction`, `hodAction`, `teacherAction`, `studentAction`) in
  `src/lib/safe-action.ts` inject the caller's scope; every query filters by it.
- **Audit inside the transaction**: `audit()` writes the trail in the same
  transaction as the mutation (`src/lib/audit.ts`).
- **Stateless rotating QR**: attendance tokens are
  `HMAC(secret + sessionSecret, sessionId : 30s-window)` — no DB writes per
  rotation, screenshots die in ≤30s, double-scans blocked by a DB unique
  constraint (`src/modules/attendance/token.ts`).
- **Integrity in the database**: timetable slot conflicts, double attendance,
  duplicate enrollments are all unique constraints, not hopeful app checks.

## Local development

```bash
pnpm install

# 1. Start Postgres (Docker)
docker run -d --name erp-pg -e POSTGRES_PASSWORD=erp \
  -e POSTGRES_DB=college_erp -p 5433:5432 postgres:17-alpine

# 2. Configure env
cp .env.example .env   # for local dev set:
                       # DATABASE_URL=postgresql://postgres:erp@localhost:5433/college_erp

# 3. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 4. Run
pnpm dev
```

Demo logins (all passwords `Passw0rd!`): `admin@college.edu`,
`hod.cse@college.edu`, `rao@college.edu` (teacher),
`cse26001@college.edu` (student).

## Deploying to Vercel + Neon

1. **Neon**: create a project + database. Copy both connection strings:
   - pooled (`…-pooler.…neon.tech`) → `DATABASE_URL`
   - direct → `DIRECT_DATABASE_URL` (migrations only)
2. **Migrate**: `DIRECT_DATABASE_URL=… pnpm db:migrate` (or wire it into CI).
   Seed the first admin with `pnpm db:seed` pointed at Neon.
3. **Vercel**: import the repo, set env vars from `.env.example`:
   `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
   `ATTENDANCE_QR_SECRET` (different value), `CRON_SECRET`,
   `NEXT_PUBLIC_APP_URL` (your production URL).
4. **Cron**: the `.github/workflows/close-expired-sessions.yml` GitHub Action
   hits `/api/cron/close-expired-sessions` every 15 minutes (auto-closes
   forgotten attendance sessions and backfills absentees). Vercel Hobby caps
   cron at once/day, so the schedule lives in GitHub Actions instead. Set repo
   secret `CRON_SECRET` and repo variable `APP_URL` (your production URL).
5. Deploy. Camera scanning requires HTTPS — Vercel provides it out of the box.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate SQL migration from schema changes |
| `pnpm db:migrate` | Apply migrations (uses `DIRECT_DATABASE_URL` if set) |
| `pnpm db:seed` | Seed demo data (refuses if an admin exists) |

## Project layout

```
src/
├─ app/                  # (auth) (admin) (hod) (teacher) (student) + api/
├─ components/kit/       # DataTable, FormDialog, StatCard, charts, skeletons…
├─ components/shell/     # Portal sidebar shell + student tab-bar shell
├─ components/ui/        # shadcn/ui
├─ db/                   # schema, relations, migrations, seed
├─ lib/                  # auth, authz (scopes), safe-action clients, audit
└─ modules/              # academic / people / teaching / attendance /
                         # coursework / promotion / reports / stats / search / audit
                         #   each: schemas / queries / service / actions / components
```
