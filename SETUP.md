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

Open the **SQL Editor** in your Supabase dashboard and run the contents of:

```
supabase/migrations/000000_full_schema.sql
```

This creates all tables, views, functions, triggers, indexes, and RLS policies in one step.

> Previous incremental migrations are preserved in `supabase/migrations/_archive/` for reference.

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

## 6. Create the First Admin User

Once the Edge Function is deployed, use the Supabase **SQL Editor** or the dashboard **Authentication** section to create your first admin user, or call the `create-user` function from any authenticated context.

Alternatively, create a user directly in **Authentication > Users > Add user** in the Supabase dashboard, then update their `app_metadata` to include `{ "role": "admin" }`.

---

## 7. Install Dependencies and Run

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
    000000_full_schema.sql     # Complete schema — run this on a fresh project
    _archive/                  # Historical incremental migrations (reference only)
  functions/
    create-user/
      index.ts                 # Edge Function: creates auth users
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
2. Run `supabase/migrations/000000_full_schema.sql` in the new project's SQL Editor.
3. Optionally run `supabase/seed.sql`.
4. Redeploy the `create-user` Edge Function and set `SUPABASE_SERVICE_ROLE_KEY`.
5. Restart the dev server.

---

## Local Development with Supabase CLI

```bash
supabase start
supabase db reset   # applies migrations + seed
npm run dev
```

Requires Docker. The `supabase/config.toml` is configured for local development on standard ports.
