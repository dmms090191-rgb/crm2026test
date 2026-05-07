# CRM SaaS

A multi-role CRM built for lead management, appointment scheduling, and team coordination.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage, Realtime)
- **Icons:** Lucide React

## Roles

| Role | Description |
|------|-------------|
| Admin | Full CRM management: leads, vendors, statuses, documentation, agenda |
| Vendeur | Lead follow-up, appointment proposals, client messaging |
| Client | View appointments, respond to proposals, message vendor |

## Objective

Exportable and fully reconstructible CRM SaaS. The entire project can be deployed on a fresh Supabase instance by running the migration chain in order.

See [SETUP.md](./SETUP.md) for the complete reconstruction guide.

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Reconstruction

To deploy on a new Supabase project from scratch, follow the step-by-step instructions in **SETUP.md**.
