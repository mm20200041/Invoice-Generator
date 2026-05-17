# Invoice Generator — Database Schema

Postgres on Supabase. All user-owned tables have **Row Level Security** enabled with policies keyed on `auth.uid()`. The Stripe webhook is the only code path that uses the service-role key to bypass RLS.

## 1. Conventions

- Primary keys: `uuid` with `default gen_random_uuid()` unless otherwise noted
- Timestamps: `timestamptz` with `default now()`
- Soft delete: nullable `deleted_at timestamptz`; queries filter `deleted_at is null`
- Money columns: `numeric(14,2)` for totals, `numeric(14,4)` for line-item quantity and unit price
- Snake_case for all column names
- All foreign keys to `auth.users(id)` cascade on delete; per-user data dies with the account
- RLS policies wrap `auth.uid()` in `(select auth.uid())` so the planner evaluates it once per query instead of once per row ([Supabase guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select))
- `SECURITY DEFINER` functions either pin `search_path` or have `EXECUTE` revoked from `public`, `anon`, and `authenticated` so they cannot be invoked as PostgREST RPCs

## 2. Enums

```sql
create type invoice_status as enum ('not_paid', 'paid');
create type line_unit_type as enum ('hours', 'flat');
create type currency_code as enum ('EUR', 'USD', 'GBP', 'CHF');
```

## 3. Tables

### 3.1 `profiles`

One row per authenticated user. Created automatically by a trigger on `auth.users` insert.

```sql
create table public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,

  -- Sender details (optional, used as "From" on invoices)
  full_name                text,
  company_name             text,
  email                    text,
  address                  text,
  vat_id                   text,
  website                  text,

  -- Preferences
  default_vat_rate         numeric(5,2),
  default_currency         currency_code not null default 'EUR',
  bcc_on_send              boolean       not null default true,

  -- Stripe Connect state (synced by webhook)
  stripe_account_id        text unique,
  stripe_charges_enabled   boolean not null default false,
  stripe_payouts_enabled   boolean not null default false,
  stripe_details_submitted boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
```

### 3.2 `clients`

```sql
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  full_name     text,
  company_name  text,
  email         text,
  address       text,
  vat_id        text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index clients_user_id_idx on public.clients(user_id);
```

Clients are hard-deleted. Invoices keep `client_snapshot` so historical records remain intact, and `invoices.client_id` is set to `null` on client deletion.

### 3.3 `invoice_counters`

Per-user, per-year gap-less counter. One row per `(user_id, year)`.

```sql
create table public.invoice_counters (
  user_id       uuid not null references auth.users(id) on delete cascade,
  year          int  not null,
  next_sequence int  not null default 1,
  primary key (user_id, year)
);
```

A new invoice number is issued in a single transaction:

```sql
update public.invoice_counters
   set next_sequence = next_sequence + 1
 where user_id = $1 and year = $2
returning next_sequence - 1 as issued;
```

If no row exists for `(user_id, year)`, it is inserted with `next_sequence = 2` while issuing `1`. Soft-deleting an invoice does **not** decrement the counter — numbering stays gap-less by issuance.

### 3.4 `invoices`

```sql
create table public.invoices (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  client_id                   uuid     references public.clients(id) on delete set null,

  -- Snapshots, captured at create and refreshed on edit
  sender_snapshot             jsonb not null,
  client_snapshot             jsonb not null,

  -- Numbering
  year                        int  not null,
  sequence                    int  not null,
  number                      text generated always as (
    'INV-' || year::text || '-' || lpad(sequence::text, 4, '0')
  ) stored,

  -- Header
  invoice_date                date          not null,
  due_date                    date          not null,
  currency                    currency_code not null,
  comments                    text,

  -- Totals (computed in application + persisted)
  subtotal                    numeric(14,2) not null default 0,
  tax_total                   numeric(14,2) not null default 0,
  total                       numeric(14,2) not null default 0,

  -- Status
  status                      invoice_status not null default 'not_paid',
  paid_at                     timestamptz,

  -- Resend popup state machine
  version                     int  not null default 1,
  last_sent_version           int,
  last_sent_at                timestamptz,

  -- Stripe
  stripe_checkout_session_id  text,
  stripe_checkout_url         text,
  stripe_checkout_expires_at  timestamptz,

  -- PDF
  pdf_path                    text,

  -- Soft delete
  deleted_at                  timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint invoices_user_year_sequence_unique unique (user_id, year, sequence),
  constraint invoices_due_after_invoice_date    check (due_date >= invoice_date),
  constraint invoices_totals_non_negative       check (subtotal >= 0 and tax_total >= 0 and total >= 0)
);

create index invoices_user_id_idx          on public.invoices(user_id);
create index invoices_user_id_status_idx   on public.invoices(user_id, status) where deleted_at is null;
create index invoices_user_id_created_idx  on public.invoices(user_id, created_at desc) where deleted_at is null;
create index invoices_client_id_idx        on public.invoices(client_id);
create unique index invoices_stripe_session_idx on public.invoices(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
```

**Snapshot JSON shape** — captured at create and refreshed on edit so paid invoices keep their historical view even after profile/client changes:

```jsonc
// sender_snapshot
{
  "full_name": "Marko Marković",
  "company_name": "Marković Co.",
  "email": "marko@example.com",
  "address": "Ulica 1, Sarajevo",
  "vat_id": "BA123456789",
  "website": "https://example.com"
}

// client_snapshot
{
  "full_name": "Ana Anić",
  "company_name": "Anić d.o.o.",
  "email": "ana@klijent.com",
  "address": "Trg 2, Zagreb",
  "vat_id": "HR987654321"
}
```

### 3.5 `invoice_line_items`

```sql
create table public.invoice_line_items (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices(id) on delete cascade,

  position       int           not null,
  description    text          not null,
  quantity       numeric(14,4) not null,
  unit_type      line_unit_type not null,
  unit_price     numeric(14,4) not null,
  vat_rate       numeric(5,2)  not null default 0,

  -- Computed at write time and persisted (matches what the PDF and Stripe see)
  line_subtotal  numeric(14,2) not null,
  line_tax       numeric(14,2) not null,
  line_total     numeric(14,2) not null,

  created_at     timestamptz not null default now(),

  constraint invoice_line_items_quantity_positive   check (quantity   > 0),
  constraint invoice_line_items_unit_price_non_neg  check (unit_price >= 0),
  constraint invoice_line_items_vat_rate_range      check (vat_rate   >= 0 and vat_rate <= 100),
  constraint invoice_line_items_position_unique     unique (invoice_id, position)
);

create index invoice_line_items_invoice_id_idx on public.invoice_line_items(invoice_id);
```

Tax math (server-side):

```
line_subtotal = round(quantity * unit_price, 2)
line_tax      = round(line_subtotal * vat_rate / 100, 2)
line_total    = line_subtotal + line_tax
```

Invoice rollup:

```
invoices.subtotal  = sum(line_subtotal)
invoices.tax_total = sum(line_tax)
invoices.total     = invoices.subtotal + invoices.tax_total
```

### 3.6 `stripe_webhook_events`

Idempotency log for Stripe events.

```sql
create table public.stripe_webhook_events (
  id           text primary key,                -- Stripe's event.id
  type         text not null,
  payload      jsonb not null,
  processed_at timestamptz not null default now()
);
```

Webhook handler does `insert ... on conflict (id) do nothing returning id` and only processes the event when a row is actually inserted.

## 4. Triggers

### 4.1 `updated_at` maintenance

```sql
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger profiles_set_updated_at  before update on public.profiles  for each row execute function public.tg_set_updated_at();
create trigger clients_set_updated_at   before update on public.clients   for each row execute function public.tg_set_updated_at();
create trigger invoices_set_updated_at  before update on public.invoices  for each row execute function public.tg_set_updated_at();
```

### 4.2 Auto-create profile on signup

```sql
create or replace function public.tg_create_profile_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_create_profile_on_signup();

-- Prevent PostgREST from exposing this SECURITY DEFINER function as an RPC.
-- The auth.users trigger still fires; revoking EXECUTE only blocks /rest/v1/rpc calls.
revoke execute on function public.tg_create_profile_on_signup() from public, anon, authenticated;
```

### 4.3 Lock paid invoices (immutable paid state)

Once an invoice is `paid`, it is **frozen** — no further updates, no deletes, no soft-deletes, no reversion to `not_paid`. The only allowed transition is `not_paid → paid`, performed atomically by either the Stripe webhook or the manual "mark as paid" action, which also stamps `paid_at` in the same statement.

Defense in depth on top of the RLS policies below.

```sql
create or replace function public.tg_lock_paid_invoices()
returns trigger language plpgsql
set search_path = '' as $$
begin
  if (tg_op = 'DELETE') then
    if (old.status = 'paid') then
      raise exception 'paid invoices are immutable and cannot be deleted';
    end if;
    return old;
  end if;

  -- UPDATE path
  if (old.status = 'paid') then
    raise exception 'paid invoices are immutable and cannot be modified';
  end if;

  -- Transition not_paid -> paid must stamp paid_at in the same update.
  if (new.status = 'paid' and new.paid_at is null) then
    new.paid_at := now();
  end if;

  return new;
end$$;

create trigger invoices_lock_paid
  before update or delete on public.invoices
  for each row execute function public.tg_lock_paid_invoices();
```

Additional invariant enforced as a constraint:

```sql
alter table public.invoices
  add constraint invoices_paid_at_required
    check ((status = 'paid' and paid_at is not null) or (status = 'not_paid' and paid_at is null));
```

Implications:

- The Stripe webhook's update statement sets `status = 'paid'` and `paid_at` in one shot; the trigger fills `paid_at` defensively if the caller forgot
- Manual "mark as paid" follows the same single-statement update pattern
- A paid invoice cannot be soft-deleted — its `deleted_at` is locked at whatever it was when status flipped to paid (always `null` in practice, since deleting an unpaid invoice is the only soft-delete path)
- A paid invoice cannot be edited and therefore never re-renders its PDF or replaces its Stripe session
- The resend popup never appears for a paid invoice, because the row cannot reach the popup condition (no further saves are possible)

## 5. Row Level Security

Enable RLS on every user-owned table:

```sql
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.invoice_counters    enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_line_items  enable row level security;
```

`stripe_webhook_events` has RLS enabled with no policies — only the service role can read/write it.

### 5.1 `profiles`

```sql
create policy "profiles are viewable by owner"
  on public.profiles for select
  using (id = (select auth.uid()));

create policy "profiles are insertable by owner"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

(No delete policy — profile lifecycle follows `auth.users`.)

### 5.2 `clients`

```sql
create policy "clients selectable by owner"
  on public.clients for select using (user_id = (select auth.uid()));
create policy "clients insertable by owner"
  on public.clients for insert with check (user_id = (select auth.uid()));
create policy "clients updatable by owner"
  on public.clients for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "clients deletable by owner"
  on public.clients for delete using (user_id = (select auth.uid()));
```

### 5.3 `invoice_counters`

```sql
create policy "counters selectable by owner"
  on public.invoice_counters for select using (user_id = (select auth.uid()));
create policy "counters insertable by owner"
  on public.invoice_counters for insert with check (user_id = (select auth.uid()));
create policy "counters updatable by owner"
  on public.invoice_counters for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

(No delete.)

### 5.4 `invoices`

Soft delete is implemented as `update ... set deleted_at = now()`. The `for delete` policy is intentionally absent in app code; the Postgres `DELETE` is reserved for the trigger-protected paid case (which the trigger blocks anyway).

```sql
create policy "invoices selectable by owner"
  on public.invoices for select
  using (user_id = (select auth.uid()));

create policy "invoices insertable by owner"
  on public.invoices for insert
  with check (user_id = (select auth.uid()));

-- Owner can update any of their not-yet-paid invoices.
-- The trigger blocks every update once status = 'paid'; the policy adds a USING clause
-- so the row is invisible to UPDATE statements as soon as it is paid.
create policy "invoices updatable by owner while not paid"
  on public.invoices for update
  using (user_id = (select auth.uid()) and status = 'not_paid')
  with check (user_id = (select auth.uid()));
```

### 5.5 `invoice_line_items`

Authorization is delegated to the parent invoice.

```sql
create policy "line items selectable by invoice owner"
  on public.invoice_line_items for select
  using (exists (
    select 1 from public.invoices i
     where i.id = invoice_line_items.invoice_id
       and i.user_id = (select auth.uid())
  ));

create policy "line items insertable by invoice owner"
  on public.invoice_line_items for insert
  with check (exists (
    select 1 from public.invoices i
     where i.id = invoice_line_items.invoice_id
       and i.user_id = (select auth.uid())
       and i.status <> 'paid'
  ));

create policy "line items updatable by invoice owner"
  on public.invoice_line_items for update
  using (exists (
    select 1 from public.invoices i
     where i.id = invoice_line_items.invoice_id
       and i.user_id = (select auth.uid())
       and i.status <> 'paid'
  ))
  with check (exists (
    select 1 from public.invoices i
     where i.id = invoice_line_items.invoice_id
       and i.user_id = (select auth.uid())
  ));

create policy "line items deletable by invoice owner"
  on public.invoice_line_items for delete
  using (exists (
    select 1 from public.invoices i
     where i.id = invoice_line_items.invoice_id
       and i.user_id = (select auth.uid())
       and i.status <> 'paid'
  ));
```

## 6. Storage

Bucket `invoices` (private). PDFs stored at:

```
{user_id}/{invoice_id}/{number}.pdf
```

Storage RLS policies:

```sql
-- Owner can read their own PDFs
create policy "invoice pdfs readable by owner"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Owner can upload/overwrite their own PDFs
create policy "invoice pdfs writable by owner"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "invoice pdfs updatable by owner"
  on storage.objects for update
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "invoice pdfs deletable by owner"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

Server code generates short-lived signed URLs when streaming the PDF to the user or attaching to an outgoing email.

## 7. Entity Relationships

```
auth.users (1) ────── (1) profiles
       │
       │ (1)
       ├──────── (n) clients
       │
       │ (1)
       ├──────── (n) invoice_counters    [pk: (user_id, year)]
       │
       │ (1)
       └──────── (n) invoices ──── (n) invoice_line_items
                          │
                          │ (n→1, set null on client delete)
                          └────── clients
```

## 8. Migration Order

1. Extensions (none required beyond `pgcrypto` for `gen_random_uuid`, already enabled in Supabase by default)
2. Enums: `invoice_status`, `line_unit_type`, `currency_code`
3. `profiles` + trigger on `auth.users`
4. `clients`
5. `invoice_counters`
6. `invoices` + generated `number` column + paid-mutation trigger
7. `invoice_line_items`
8. `stripe_webhook_events`
9. `updated_at` triggers across tables
10. RLS enable + policies for every table above
11. Storage bucket `invoices` + storage policies
12. Hardening: `set search_path = ''` on `tg_set_updated_at` and `tg_lock_paid_invoices`; `revoke execute` on `tg_create_profile_on_signup` from `public`, `anon`, `authenticated`
