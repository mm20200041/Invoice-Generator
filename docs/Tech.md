# Invoice Generator — Technical Architecture

This document describes how the product specified in `PRD.md` is implemented. It also captures what is already installed in this repo so future work does not duplicate it.

## 1. Stack Summary

| Concern | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) on **React 19** |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (style: `radix-maia`, base color `neutral`) + `@tabler/icons-react` |
| Auth + DB + Storage | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Payments | Out of scope for v1 (manual mark-paid only; Stripe deferred) |
| Email | Resend (transactional, shared verified domain) |
| PDF | `@react-pdf/renderer` (server-side, React → PDF) |
| Hosting | Vercel (assumed) |

> **Note on Next.js version**: This repo runs Next.js 16, which has breaking changes vs. older versions. Per `AGENTS.md`, before writing any new Next code, read the current guides under `node_modules/next/dist/docs/`. Do not rely on training-data conventions.

## 2. What is already installed

From `package.json`:

**Runtime**

- `next@16.2.6`
- `react@19.2.4`, `react-dom@19.2.4`
- `@supabase/ssr@^0.10.3`, `@supabase/supabase-js@^2.105.4`
- `resend@^6.12.3`
- `@react-pdf/renderer`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`
- `radix-ui@^1.4.3`, `@tabler/icons-react@^3.44.0`
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`
- `shadcn@^4.7.0` (CLI)
- `sonner` (toasts)

**Dev**

- `tailwindcss@^4` + `@tailwindcss/postcss`
- `eslint@^9` + `eslint-config-next`
- `typescript@^5`, `@types/node`, `@types/react`, `@types/react-dom`

**Repo wiring already in place**

- shadcn config: `components.json` (style `radix-maia`, alias `@/components/ui`, icons `tabler`)
- TS path alias: `@/*` → repo root (`tsconfig.json`)
- Supabase clients:
  - Browser: `utils/supabase/client.ts`
  - Server (RSC / route handlers): `utils/supabase/server.ts`
  - Session refresh: `proxy.ts` (Next.js 16) + `utils/supabase/middleware.ts`
- Resend client: `utils/resend/client.ts`
- PDF: `lib/pdf/InvoiceDocument.tsx`, `lib/pdf/render.tsx`
- Util: `lib/utils.ts`

> Online payments (Stripe Connect / Checkout) are deferred past v1. Schema columns for Stripe may still exist in `DB.md` as reserved; the app does not use them.

## 3. Environment Variables

```
# Supabase (already used by existing clients)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, reserved for privileged jobs
SUPABASE_STORAGE_BUCKET=invoices  # PDF bucket name

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=invoices@<your-domain>
RESEND_FROM_NAME="Invoice Generator"

# App
NEXT_PUBLIC_APP_URL=
```

`.env.local` is git-ignored. A `.env.example` should be committed mirroring the keys above with empty values.

## 4. Application Architecture

### 4.1 Routing (App Router)

```
app/
  (marketing)/
    page.tsx                       # landing
  (auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  (app)/
    layout.tsx                     # protected shell, requires session
    dashboard/page.tsx
    invoices/
      page.tsx                     # list, paginated
      new/page.tsx
      [id]/
        page.tsx                   # detail / preview
        edit/page.tsx
    clients/
      page.tsx
      new/page.tsx
      [id]/edit/page.tsx
    settings/
      profile/page.tsx
  api/
    invoices/
      [id]/
        send/route.ts              # POST: email PDF via Resend
        pdf/route.ts               # GET: stream stored PDF
```

Manual mark-paid is a **server action** (`markInvoicePaidAction` in `lib/actions/invoices.ts`), not a route handler.

Route groups (`(marketing)`, `(auth)`, `(app)`) keep layouts cleanly separated. The `(app)` layout enforces auth: it reads the Supabase session via `@/utils/supabase/server` and redirects to `/login` when missing.

### 4.2 Middleware / proxy

`proxy.ts` (Next.js 16 root) calls `@/utils/supabase/middleware` on every matched request to refresh Supabase session cookies. It also short-circuits unauthenticated users away from `(app)` paths.

### 4.3 Server Actions vs Route Handlers

- **Server Actions** for form mutations the user triggers from the UI (create/edit invoice, profile, client, mark paid). Validate with `zod` and return typed results. Server actions get the Supabase client via `createClient(await cookies())`.
- **Route Handlers** for:
  - PDF streaming
  - Send invoice email (`POST /api/invoices/[id]/send`)

### 4.4 Data Access Layer

A thin module per entity under `lib/db/`:

- `lib/db/profiles.ts`
- `lib/db/clients.ts`
- `lib/db/invoices.ts`
- `lib/db/lineItems.ts`

Each exports typed functions that take the Supabase client and run queries. Row Level Security (see `DB.md`) is the security boundary — these functions never bypass RLS.

### 4.5 Supabase Storage

A single private bucket `invoices` stores PDFs at:

```
{user_id}/{invoice_id}/{number}.pdf
```

Access is via signed URLs created on demand by `/api/invoices/[id]/pdf`. The PDF is regenerated and overwritten whenever a not-paid invoice is saved.

## 5. Auth

Email + password only via Supabase Auth.

- Email confirmation required on register
- Forgot-password uses Supabase's built-in reset email for v1 (no custom Resend template)
- Sessions are cookie-based via `@supabase/ssr`

A trigger on `auth.users` creates a matching row in `public.profiles` on signup (see `DB.md`).

OAuth and magic links are out of scope for v1 but the schema does not preclude them.

## 6. Payments (deferred)

Online payment links and Stripe Connect are **out of scope for v1**. Invoice status flips to paid only via the manual **Mark as Paid** server action. Schema columns / tables related to Stripe in `DB.md` are reserved for a future release and are unused by the app.

## 7. Email (Resend)

Single shared verified domain. Each outgoing message:

- `From`: `"{sender_name} <{RESEND_FROM_EMAIL}>"`
- `Reply-To`: the user's profile email
- `Bcc`: the user's profile email if `profiles.bcc_on_send = true`
- `Subject`: `Invoice {number} from {sender_name}`
- `Body`: fixed English template, interpolating sender name, client name, invoice number, total, and due date
- `Attachments`: the invoice PDF, fetched from Supabase Storage

The send endpoint is `POST /api/invoices/[id]/send`. It:

1. Refreshes the PDF if needed
2. Sends the email via Resend
3. Stamps `invoices.last_sent_at` and `invoices.last_sent_version = invoices.version`

Errors are surfaced as toast notifications. The route never throws raw provider errors at the user; it logs detail and shows a clean message.

## 8. PDF

`@react-pdf/renderer` runs server-side in route handlers and server actions.

- `lib/pdf/InvoiceDocument.tsx` — the React PDF component matching the layout in `PRD.md` §4.5
- `lib/pdf/render.ts` — renders to a Buffer, uploads to Supabase Storage at the canonical path, returns the path
- Pure text, no logo
- Numbers formatted with `Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Currency rendering:
  - `€1,234.56` (EUR)
  - `$1,234.56` (USD)
  - `£1,234.56` (GBP)
  - `CHF 1,234.56` (CHF — no widely-recognized symbol)
- Dates via `date-fns`: `format(date, 'MMM d, yyyy')`

PDF generation is triggered:

- On invoice create
- On every save of a not-paid invoice (overwrites the existing file)
- Lazily before send if missing

Paid invoices are never re-rendered.

## 9. Forms & Validation

- `react-hook-form` + `zod` schemas under `lib/validators/`
- shadcn `Form` primitives for accessible labels and error states
- Server actions re-validate with the same zod schemas — the client validation is a UX layer, not the source of truth

## 10. Resend-popup state machine (version-based)

Implemented entirely in DB columns:

- `invoices.version int` — incremented on every content-changing save
- `invoices.last_sent_version int | null` — set to current `version` on each send/resend

UI logic on save:

```
if last_sent_version != null && new_version === last_sent_version + 1:
    show "Resend updated invoice?" dialog (Resend / Cancel)
```

Subsequent saves bump `version` further and skip the popup. After a successful resend, `last_sent_version = version` again, restarting the cycle.

## 11. Numbering

Per `(user_id, year)` gap-less counter via the `invoice_counters` table (see `DB.md`). The insert path uses a transactional `SELECT ... FOR UPDATE` + `UPDATE ... RETURNING` against that row, then inserts the invoice with the issued sequence. Soft-deleted invoices keep their number; the counter never decrements.

## 12. Security & RLS Summary

- Every table that holds user data has RLS enabled and a policy keyed on `auth.uid()`
- Storage bucket `invoices` is private; all reads go through signed URLs from server code
- Server actions and route handlers reject unauthenticated requests at the top of the handler

## 13. Non-Functional Targets

- Responsive: Tailwind breakpoints, shadcn primitives are responsive by default
- Validation: `zod` everywhere, both client and server
- Error handling: route handlers return `{ ok: false, error }` shapes; server actions return discriminated unions; UI surfaces toasts via `sonner`
- Idempotency: manual mark-paid is a no-op when already paid
- Immutability: paid invoices are frozen at the database layer — UPDATE/DELETE on `status = 'paid'` rows raises in the trigger and the RLS update policy rejects them; the application never needs to gate this in code, but it should show a disabled UI state for clarity
- Logging: failed sends log to the server with `invoice_id` for traceability

## 14. Build Phases

1. Project skeleton: route groups, auth pages, middleware, RLS-enabled schema migration
2. Profile + settings (default VAT, BCC toggle)
3. Clients CRUD
4. Invoice schema, numbering counter, snapshot logic
5. Invoice form (create + edit) with line items and live totals
6. PDF generation + Storage upload
7. Send invoice via Resend, BCC, attachment
8. Previous invoices list, pagination, soft-delete actions
9. Resend popup version logic
10. Polish: forgot-password flow, empty states, error toasts, responsive checks
11. *(Deferred)* Online payments / Stripe Connect — future release
