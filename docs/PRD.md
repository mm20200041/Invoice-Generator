# Invoice Generator — Product Requirements Document

## 1. Overview

Invoice Generator is a web application for freelancers to create, store, and send invoices to their clients. The user can:

- Manage their own client list
- Generate invoices as PDFs
- Generate a payment link for each invoice
- Send the invoice and payment link to the client by email
- Track each invoice as **paid** or **not paid**

The application is single-tenant per user. There are no organizations, teams, or branding customization. Each user manages only their own profile, clients, invoices, and PDFs.

## 2. Goals

Provide a fast, opinionated invoicing tool where, from a single place, a freelancer can:

1. Enter their own sender details
2. Add and manage clients
3. Create an invoice using a fixed layout
4. Generate a PDF
5. Generate a payment link for that invoice
6. Send everything to the client in one click

## 3. User Role

There is exactly one role: **User**.

A user can:

- Register an account
- Log in and log out
- Reset their password via a forgot-password flow
- Edit their profile and sender details
- Manage their clients
- Create, edit, send, and delete invoices
- View the list of previous invoices
- Manually change an invoice's status

A user cannot edit or delete an invoice that has already been paid.

## 4. Features

### 4.1 Authentication

- Register with email and password
- Email confirmation is required before first login
- Login
- Logout
- Forgot-password flow with reset email

OAuth providers are out of scope for v1.

### 4.2 User Profile / Sender Details

The user has a profile whose data is used as the **From** block on every invoice.

Fields, all optional:

- Full Name
- Company Name
- Email
- Address
- VAT ID
- Website

The profile also stores two preferences:

- **Default VAT rate** — pre-fills new line items
- **Auto-BCC on send** — when enabled, the user is BCC'd on every outgoing invoice email. Default: on.

Sender data is automatically pulled into each new invoice and snapshotted on the invoice at creation time, so future profile edits do not retroactively change historical invoices.

### 4.3 Client Management

The user can create, view, edit, and delete clients.

Fields, all optional:

- Full Name
- Company Name
- Email
- Address
- VAT ID

Clients are picked from a dropdown when creating an invoice. When a client is deleted, existing invoices keep a snapshot of that client's data so the historical record stays intact.

### 4.4 Invoice Creation

Invoices follow a fixed layout. There is no brand customization, no logo upload, and no per-user template configuration.

**Header**

- From — automatically populated from the user profile
- To — selected client
- Invoice Number — auto-generated, never entered manually
- Invoice Date
- Due Date
- Currency

Out of scope: bank account fields, interest, document type fields, discounts, shipping fees, recurring invoices, partial payments.

**Line items**

The user can add multiple rows. Each row has:

- Description
- Quantity (fractional allowed)
- Unit type — `hours` or `flat`
- Price
- VAT Rate (percentage)

**Calculations**

- Subtotal
- Tax
- Total

Tax is computed per line, then summed. A single invoice uses a single currency; mixed-currency line items are not allowed.

**Footer**

- Comments

### 4.5 Invoice PDF Generation

Every invoice is generated as a PDF that follows the same layout as the on-screen invoice:

1. Header
2. Sender / client info
3. Invoice meta (number, dates, currency)
4. Line items table
5. Subtotal / tax / total
6. Comments footer

The PDF is stored and attached to its invoice. It is regenerated whenever the invoice is edited.

The PDF is pure text — no logo, no platform branding.

### 4.6 Previous Invoices

The user has a paginated list of previous invoices. Each row shows at minimum:

- Invoice number
- Client
- Invoice date
- Due date
- Total
- Status

Row actions:

- View
- Edit
- Delete
- Resend
- Download PDF

Rules:

- Only invoices with status **not paid** can be edited or deleted
- Paid invoices are locked from edit and delete
- Deleted invoices are hidden from the list

### 4.7 Invoice Status

Status has exactly two values:

- **paid**
- **not paid**

The only allowed transition is **not paid → paid**. Once an invoice is marked paid it is **final and immutable**:

- It cannot be reverted to not paid
- It cannot be edited
- It cannot be deleted
- Its PDF is frozen as-is and never regenerated
- Its payment link is closed

Status flips to paid in two ways:

- Automatically, when the payment provider confirms a successful payment
- Manually, by the user from the invoice page, when payment is received outside the platform (e.g., bank transfer)

There is no separate "draft" or "sent" status; whether an invoice has been sent is tracked silently and does not appear as a status.

### 4.8 Payment Link

When an invoice is created or sent, the system generates a single-use payment link tied to that exact invoice and amount.

When the payment provider confirms a successful payment, the invoice status is automatically updated to **paid**. No additional payment-confirmation email is sent to the client.

If the user manually marks an invoice as paid, any open payment session for that invoice is canceled to prevent the client from paying twice.

If the user has not finished setting up payments, the invoice can still be created and sent — but only as PDF — with a notice that explains how to enable payment links.

### 4.9 Send Invoice

The user can send an invoice to its client in one click.

The email contains:

- A short message in the email body (fixed system template)
- The PDF as an attachment
- The payment link in the body, when available

The email is sent to the client's email address. If the user enabled auto-BCC, the user is also BCC'd. The send button is disabled when the selected client has no email address.

### 4.10 Resend Flow

If the user edits an invoice that has already been sent, the system shows a popup asking whether to resend the updated invoice to the client.

The popup appears only on the first save after the previous send. Subsequent saves before the next send do not re-prompt. Resend never happens automatically without confirmation.

## 5. Functional Requirements

### 5.1 Invoice Numbering

- Invoice numbers are generated automatically
- Format: `INV-YYYY-NNNN`, for example `INV-2026-0001`
- Numbers are sequential **per user, per year**
- Numbers reset to `0001` at the start of each calendar year
- Numbering is gap-less within `(user, year)` — soft-deleted invoices keep their number

### 5.2 Currency

- Supported currencies: **EUR**, **USD**, **GBP**, **CHF**
- A single invoice has a single currency
- Mixed-currency line items are not allowed
- The user profile may store a default currency that pre-fills new invoices

### 5.3 Edit Restrictions

- Paid invoices are immutable: no edit, no delete, no status reversal
- Not-paid invoices can be edited and deleted
- Deletion is a soft delete — the invoice and its number stay in the database but are hidden from the UI

### 5.4 Date Handling

- Invoice Date and Due Date are stored as **date-only** values (no time, no timezone)
- Dates are displayed in `Jan 5, 2026` format
- The PDF uses the same format

### 5.5 Quantity & Price Precision

- Quantity allows fractional values, up to 4 decimal places
- Unit price allows up to 4 decimal places
- Tax is computed per line and summed
- Subtotal, tax, and total are displayed with exactly 2 decimal places

### 5.6 Data Ownership

Each user can see and use only:

- Their own profile
- Their own clients
- Their own invoices
- Their own PDFs

There is no sharing, no team access, no admin role.

## 6. Non-Functional Requirements

- The application is responsive and usable on mobile and desktop
- Forms have basic validation (required fields, numeric ranges, valid email)
- The PDF renders consistently and is human-readable
- Payment webhook processing is reliable and idempotent
- Email sending has basic error handling and surfaces failures to the user
- User data is protected by authentication and per-row access policies

## 7. Pages

- Landing / auth entry
- Register
- Login
- Forgot password
- Reset password (callback)
- Dashboard
- Create invoice
- Edit invoice
- Invoice details / preview
- Previous invoices
- Clients list
- Add / edit client
- Profile / sender details settings
- Payments setup (payment-provider onboarding status)

## 8. Out of Scope (v1)

- Multi-user organizations, teams, roles
- Brand customization, logo upload, custom templates
- OAuth or social login
- Per-invoice discount, shipping, or surcharge fields
- Recurring invoices and partial payments
- Languages other than English
- Currency conversion or mixed-currency invoices
- Custom payment-confirmation emails to clients
- Localization, regional date or number formats
