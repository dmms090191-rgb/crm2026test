# Talvex - Project Rules

## Critical Rule: Login & Landing Page (V1)

The current Talvex landing page is the single centralized entry point for ALL users.
Do NOT modify, replace, or gate this page based on company sites or domains.

### Who connects from the current landing page:
- Super Admin
- Admin
- Vendeur (Vendor)
- Client

### What must NOT happen:
- Do not require a company to have its own site/page to allow login
- Do not require a company to have a custom domain to allow login
- Do not redirect the main landing page to a company-specific page
- Do not block LoginModal if no company site or domain exists
- Do not break Supabase Auth flow
- Do not break role detection (super_admin / admin / vendor / client)
- Do not replace AppLandingPage.tsx with CompanySitePage.tsx

### Module "Sites" status:
The site builder module (SASites, SASiteTalvex, CompanySitePage) can exist as a draft/preview feature in the Super Admin panel, but it must NOT replace the current landing page or interfere with login.

### Future (V2):
Each company/admin will have its own public page with a custom slug or domain.
Admins, vendors, and clients will be able to log in from their company's page.
This requires:
- AI-powered site creation API (not yet built)
- Domain purchase/configuration per company (not yet done)
- Migration path from centralized login to per-company login

Until V2 is explicitly activated, the centralized Talvex landing page remains the only entry point.
