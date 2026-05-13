# CRM — Setup Guide

This guide walks through connecting this CRM to a fresh Supabase Cloud project.

---

## Prerequisites

- A [Supabase](https://supabase.com) account
- Node.js 18+
- Supabase CLI (optional, for local development)

---

## 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait for the project to finish provisioning.
3. Navigate to **Settings > API** and copy:
   - **Project URL** (`https://your-project-id.supabase.co`)
   - **anon / public key**

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 3. Apply the Database Schema

A full reconstruction requires running **all migrations in chronological order**. The `supabase/migrations/` folder contains the full set.

### Recommended: Supabase CLI (automatic)

```bash
supabase db reset   # applies all migrations in order + seed
```

### Manual: SQL Editor

Run each file in `supabase/migrations/` in filename order (oldest first) in the Supabase **SQL Editor**:

1. `20260317042359_000000_full_schema.sql` — base schema (tables, functions, triggers, RLS)
2. All subsequent migrations — additional tables, columns, indexes, realtime, and triggers

Every migration is idempotent (`IF NOT EXISTS`, `DO $$ ... $$` guards) and safe to re-run.

> **Note :** Le fichier `20260317042359_000000_full_schema.sql` est le schema de base, mais les migrations suivantes ajoutent des tables, colonnes, et fonctions indispensables au bon fonctionnement du CRM.

> Previous incremental migrations (pre-consolidation) are preserved in `supabase/_archive_migrations/` for historical reference only.

---

## 4. Seed Default Data (Optional)

In the **SQL Editor**, run the contents of:

```
supabase/seed.sql
```

This inserts the default lead statuses (Nouveau, Contacte, Interesse, etc.).
Safe to run multiple times — uses `ON CONFLICT DO NOTHING`.

---

## 5. Deploy the Edge Function: `create-user`

The `create-user` Edge Function creates authenticated users via the Supabase Admin API.
It requires the `SUPABASE_SERVICE_ROLE_KEY` secret to be set.

### 5a. Set the Secret

1. Go to **Settings > Edge Functions** in your Supabase dashboard.
2. Add the following secret:

| Name                       | Value                                      |
|----------------------------|--------------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Your **service_role** key from Settings > API |

> The `SUPABASE_URL` is automatically available inside Edge Functions — you do not need to set it manually.

### 5b. Deploy via Supabase CLI

```bash
supabase functions deploy create-user --project-ref your-project-id
```

Or use the Supabase dashboard **Edge Functions** section to deploy manually by pasting the contents of:

```
supabase/functions/create-user/index.ts
```

### 5c. What `create-user` Does

Accepts a POST request with:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "role": "admin",
  "first_name": "Jean",
  "last_name": "Dupont"
}
```

Creates the user in Supabase Auth with `email_confirm: true` and stores `role`, `first_name`, `last_name` in both `user_metadata` and `app_metadata`.

Roles used by the CRM: `admin`, `vendor`, `client`.

---

## 6. Deploy the Edge Function: `update-user-password`

The `update-user-password` Edge Function allows admins to reset a vendor or client PIN (6-digit password) via the Supabase Admin API.

### 6a. Deploy via Supabase CLI

```bash
supabase functions deploy update-user-password --project-ref your-project-id
```

Or paste the contents of `supabase/functions/update-user-password/index.ts` in the dashboard **Edge Functions** section.

### 6b. What `update-user-password` Does

Accepts a POST request with:

```json
{
  "auth_user_id": "uuid-of-the-user",
  "password": "123456"
}
```

Updates the user's password in Supabase Auth. The password must be exactly 6 digits.

> The same `SUPABASE_SERVICE_ROLE_KEY` secret configured in step 5a is used by this function — no additional secret setup is needed.

---

## 7. Storage Bucket: `chat-files`

The migration `20260504154541_create_chat_files_storage_bucket.sql` automatically creates a public storage bucket named `chat-files` (10 MB file size limit) with appropriate RLS policies.

No manual setup is required — the bucket is created when migrations are applied.

If you need to verify manually, check **Storage** in the Supabase dashboard and confirm the `chat-files` bucket exists with public access.

---

## 8. Documentation CRM: Export / Import JSON

The CRM includes a built-in export/import system for all documentation content (version 2 format).

### What is exported

- Documentation tabs content (`crm_documentation`)
- Tab labels (`doc_tab_labels`)
- Sidebar order (`sidebar_order`)
- Notes (`crm_notes`)
- Ideas (`crm_ideas`)
- Context cards (`crm_context_cards`)
- Amelioration categories (`crm_amelioration_categories`)
- Ameliorations (`crm_ameliorations`)

### How to use

1. In the admin panel, go to **Documentation CRM**
2. Click **Exporter JSON** to download a `crm-documentation-YYYY-MM-DD.json` file
3. On the new environment, after migrations are applied, click **Importer JSON** and select the exported file

This restores all documentation content from one environment to another. The import supports both version 1 and version 2 files.

---

## 9. Create the First Admin User

Once the Edge Functions are deployed, use the Supabase **SQL Editor** or the dashboard **Authentication** section to create your first admin user, or call the `create-user` function from any authenticated context.

Alternatively, create a user directly in **Authentication > Users > Add user** in the Supabase dashboard, then update their `app_metadata` to include `{ "role": "admin" }`.

---

## 10. Install Dependencies and Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Project Structure

```
supabase/
  config.toml                  # CLI config for local development
  seed.sql                     # Default statuses seed (idempotent)
  migrations/
    20260317042359_000000_full_schema.sql  # Base schema (run all migrations in order)
    ...                        # Incremental migrations (tables, columns, realtime, triggers)
  _archive_migrations/         # Historical pre-consolidation migrations (reference only)
  functions/
    create-user/
      index.ts                 # Edge Function: creates auth users
    update-user-password/
      index.ts                 # Edge Function: resets user PIN
src/
  lib/
    supabase.ts                # Supabase client singleton
  pages/
    admin/                     # Admin dashboard and views
    vendor/                    # Vendor dashboard and views
    client/                    # Client dashboard and views
  components/                  # Shared components
.env.example                   # Environment variable template
```

---

## Reconnecting to a Different Supabase Project

1. Update `.env` with the new project's URL and anon key.
2. Run all files in `supabase/migrations/` in order in the new project's SQL Editor (or use `supabase db reset`).
3. Optionally run `supabase/seed.sql`.
4. Redeploy both Edge Functions (`create-user` and `update-user-password`) and set `SUPABASE_SERVICE_ROLE_KEY`.
5. Optionally import the Documentation CRM JSON export from the previous environment.
6. Restart the dev server.

---

## Local Development with Supabase CLI

```bash
supabase start
supabase db reset   # applies migrations + seed
npm run dev
```

Requires Docker. The `supabase/config.toml` is configured for local development on standard ports.

---

## Static Documentation Files

The following TypeScript files contain **static documentation** of the database schema and CRM structure. They are not auto-generated and may desynchronize if the schema evolves:

| File | Purpose |
|------|---------|
| `src/pages/admin/views/documentation/databaseDocumentation.ts` | Documents all tables, columns, and relationships |
| `src/pages/admin/views/documentation/databaseDocCoreCrm.ts` | Core CRM tables documentation |
| `src/pages/admin/views/documentation/databaseDocChat.ts` | Chat-related tables documentation |
| `src/pages/admin/views/documentation/databaseDocInternal.ts` | Internal/config tables documentation |
| `src/pages/admin/views/documentation/structureCrmTree.ts` | CRM file tree structure for the documentation view |

After adding or modifying migrations (new tables, columns, or relationships), update these files to keep the internal documentation accurate.

---

## Known Migration History Notes

### `doc_tab_labels` table

The local migration file is `20260318032230_create_doc_tab_labels_table.sql`. The remote Supabase instance may show a different timestamp (`20260319043143_recreate_doc_tab_labels_table.sql`) from the original development history.

Both produce the identical schema: `doc_tab_labels(tab_id text PK, label text, updated_at timestamptz)` with RLS policies for authenticated users.

This has **no functional impact**. When reconstructing from scratch with `supabase db reset`, only local migration files are executed, and the result is correct.

---

## Security: Production Hardening Checklist

Before deploying to production or exposing this CRM as a public SaaS, the following points should be addressed:

### 1. CORS Configuration

The Edge Functions use a configurable CORS origin list. By default, only `localhost:5173` and `localhost:3000` are allowed.

To allow your production domain, set the `ALLOWED_ORIGINS` secret in Supabase Edge Functions settings:

| Name              | Value                                           |
|-------------------|-------------------------------------------------|
| `ALLOWED_ORIGINS` | `https://my-app.vercel.app,https://my-domain.com` |

Multiple origins are separated by commas. If `ALLOWED_ORIGINS` is not set, only localhost origins are permitted.

### 2. Authentication Strength

The current PIN system uses 6-digit passwords for vendor and client accounts. For a public SaaS:

- Consider enforcing longer passwords (8+ characters with mixed case/symbols)
- Add rate limiting on login attempts
- Consider adding MFA for admin accounts

### 3. Row Level Security (RLS) Review

Before production, audit all RLS policies to ensure:

- No policy uses `USING (true)` for non-public data
- Ownership checks are enforced where applicable
- Policies cover all CRUD operations (SELECT, INSERT, UPDATE, DELETE separately)

### 4. Edge Function Protection (already implemented)

Both Edge Functions (`create-user`, `update-user-password`) verify the caller's JWT and require `app_metadata.role === "admin"`. Unauthenticated or non-admin callers receive 401/403 responses.

The `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client-side code.

### 5. Storage Bucket

The `chat-files` bucket is currently public. For sensitive data:

- Review the RLS policies on the storage bucket
- Consider making it private with signed URLs for access
