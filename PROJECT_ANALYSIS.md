# Talvex — Analyse complète du projet

> Document généré par Claude Code lors de la reprise du projet migré depuis Bolt.new.
> Analyse **en lecture seule** : aucun fichier de code, migration, RLS ou dépendance n'a été modifié.
> Date d'analyse : 2026-09-04 · Dossier : `SaaSClaude1`

---

## 1. Stack technique exacte

### Frontend
| Élément | Version / détail |
|---|---|
| React | 18.3.1 |
| React DOM | 18.3.1 |
| TypeScript | 5.5.3 (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) |
| Vite | 5.4.2 (+ `@vitejs/plugin-react` 4.3.1) |
| Tailwind CSS | 3.4.1 (config vide, aucune extension de thème) |
| PostCSS / Autoprefixer | 8.4.35 / 10.4.18 |
| Icônes | `lucide-react` 0.344.0 |
| Excel / CSV | `xlsx` 0.18.5 |
| Fuseaux horaires | `countries-and-timezones` 3.9.0 |

**Il n'y a AUCUN routeur** (`react-router` absent), **aucune librairie d'état** (Redux/Zustand/Jotai absents),
**aucune librairie de formulaire**, **aucun client de requêtes** (React Query absent),
**aucune librairie d'animation**, **aucun framework de test unitaire** (Vitest/Jest absents).

### Backend
| Élément | Détail |
|---|---|
| Supabase | `@supabase/supabase-js` 2.57.4 — Postgres + Auth + Storage + Realtime + Edge Functions |
| Postgres | major_version 15 (`supabase/config.toml`) |
| Edge Functions | Deno (`Deno.serve`), imports `npm:` / `jsr:` |
| Extensions PG | `pgcrypto` |

### Tests / outillage
| Élément | Détail |
|---|---|
| Playwright | 1.60.0, projet `chromium` uniquement, baseURL `http://localhost:5173` |
| ESLint | 9.9.1 + `typescript-eslint` 8.3.0 + `react-hooks` + `react-refresh` |
| cross-env, tsx | scripts npm |
| Plugin Vite maison | `scripts/auditPlugin.ts` — audit automatique à chaud |

### Déploiement
- `vercel.json` : SPA rewrite `/(.*) → /`
- `prebuild` : `node scripts/generateIcons.cjs` (génération des icônes PWA)

### Scripts npm
`dev`, `build` (+ `prebuild`), `preview`, `lint`, `typecheck`, `analyze`,
`test:e2e`, `test:e2e:fast|headed|normal|slow|debug|ui|report`

---

## 2. Architecture générale

```
index.html
  └─ script inline : applique le thème depuis localStorage AVANT le rendu (anti-FOUC)
  └─ src/main.tsx
       ├─ purge des tokens auth localStorage hérités
       ├─ purge de session si lancement PWA standalone
       ├─ enregistrement du service worker
       └─ <ErrorBoundary><App /></ErrorBoundary>

src/App.tsx  ← ROUTEUR RACINE (par état React, pas par URL)
  1. /site/<slug>              → CompanySitePage (site public d'une société)
  2. domaine personnalisé      → useCustomDomain() → CompanySitePage
  3. session Supabase          → applySession() lit app_metadata.role
  4. PWA standalone            → PwaMobileShell (5 onglets)
  5. sinon                     → AppDashboardRouter
  6. non connecté              → template de landing (TalvexOfficialTemplate par défaut)

src/app/AppDashboardRouter.tsx  ← arbre d'impersonation (« Se connecter en tant que »)
src/app/AppShell.tsx            ← ThemeProvider > TimezoneProvider > Suspense (+ CompanyIdProvider)
```

### Modèle de navigation
Chaque panel (`AdminDashboard`, `SuperAdminDashboard`, `VendorDashboard`, `ClientDashboard`,
`CompanySuperAdminDashboard`) tient une variable d'état `activeView` typée en union de littéraux
(`ActiveView`, `SAView`, `VendorActiveView`, `ClientActiveView`, `CSAView`) et un composant
`*ViewRenderer` / `SAViewRouter` fait un `switch`. Les vues sont chargées en `React.lazy` + `Suspense`.

**Conséquence directe** : pas d'URL profonde, pas de bouton retour navigateur, pas de partage de lien
vers un onglet, pas de restauration d'état au rafraîchissement (hors `connectReturnContext` stocké
en localStorage/sessionStorage).

### Couches transverses (Contexts)
| Context | Rôle |
|---|---|
| `ThemeContext` | 15 thèmes, config « glass », thèmes personnalisés, scope SA vs société |
| `CompanyIdContext` | `company_id` effectif (override d'impersonation ou `app_metadata`) |
| `TimezoneContext` | fuseau par rôle et par utilisateur, persisté localStorage + DB |
| `EditorModeContext` | éditeur visuel live (zones, textes, typo, boutons, cartes, images de fond) |
| `VisualizationContext` | pile d'impersonation (badges « Visu … », libellés de retour) |
| `SimulationContext` | mode simulation d'une sauvegarde restaurée (lecture seule) |
| `SessionTimeoutContext` | déconnexion automatique par inactivité |
| `DemoSessionContext` | session de démo live (curseur partagé via Realtime broadcast) |
| `VisualCustomizeContext` | personnalisation visuelle par élément (« zone droite ») |

---

## 3. Nombre approximatif de fichiers analysés

| Périmètre | Fichiers | Lignes |
|---|---:|---:|
| `src/` | **929** (679 `.tsx`, 248 `.ts`, 1 `.css`, 1 `.json`) | ~126 600 |
| `supabase/migrations/` | **161** `.sql` | 9 127 |
| `supabase/_archive_migrations/` | 26 `.sql` (historique, non rejoué) | — |
| `supabase/functions/` | **29** Edge Functions | 6 860 |
| `e2e/` | 9 | 481 |
| `scripts/` | 3 | ~750 |
| Config racine + docs | ~15 | — |
| **Total parcouru** | **~1 197 fichiers** (hors `node_modules`) | **~144 000 lignes** |

Le snapshot d'audit interne du projet (`src/generated/auditSnapshot.json`) confirme :
927 fichiers TS/TSX, 127 065 lignes, 1 occurrence de `any`, 0 erreur tsc, 0 erreur/warning ESLint,
8 fichiers au-dessus du seuil interne de 300 lignes.

---

## 4. Principaux dossiers

```
src/
├── app/                 8    orchestration racine (routeur, shell, PWA, domaine perso)
├── components/        ~200   composants partagés
│   ├── agenda/         10    calendrier mois/semaine/jour + modales
│   ├── chat/            7    panneau de messagerie générique (texte, fichier, audio)
│   ├── demo/           15    démo live Super Admin (curseur, invitation, réception)
│   ├── editor/         39    éditeur visuel (fonds, couleurs, typo, boutons, cartes)
│   ├── logo/           29    génération / édition de logos par IA
│   ├── theme/          11    sélecteur de thèmes, presets « glass »
│   ├── table/          16    colonnes réordonnables, versions mobiles
│   ├── visualCustomize/17    personnalisation élément par élément
│   ├── action-menu, hooks, layout, login, notifications, toolbar
├── contexts/           17    9 contexts + états dérivés de l'éditeur
├── hooks/              32    hooks métier (non-lus, agenda, thèmes, PWA, push…)
├── lib/                40    client Supabase, import CSV, thèmes (15 jeux de tokens), push, timezone
├── pages/
│   ├── admin/         ~230   panel Admin (CRM, leads, vendeurs, docs, système, sauvegarde…)
│   ├── superadmin/    ~190   panel Super Admin (admins, sites, IA, thèmes, tests…)
│   ├── company-super-admin/ 19  panel Company Super Admin
│   ├── vendor/         38    panel Vendeur
│   ├── client/         25    panel Client
│   └── public/          1    CompanySitePage (site public par slug/domaine)
└── generated/           1    auditSnapshot.json (généré par le plugin Vite)

supabase/
├── migrations/        161    chaîne de reconstruction
├── _archive_migrations/ 26   historique pré-consolidation
└── functions/          29    Edge Functions Deno

e2e/                     9    Playwright
scripts/                 3    analyze.ts, auditPlugin.ts, generateIcons.cjs
public/                  9    manifest, service worker, icônes (+ ~4,2 Mo d'images)
```

Les 3 dossiers les plus denses : `admin/views/documentation` (59 fichiers),
`admin/views/calquer-logo` (52), `superadmin/views/site-builder/studio` (41).

---

## 5. Rôles et panels présents

Le rôle est lu dans **`session.user.app_metadata.role`** (jamais dans une table applicative).

| Rôle | Valeur `app_metadata.role` | Panel | Périmètre |
|---|---|---|---|
| Super Admin | `super_admin` | `SuperAdminDashboard` (24 vues) | plateforme Talvex |
| Company Super Admin | `company_super_admin` | `CompanySuperAdminDashboard` | société parente (revendeur) |
| Admin | `admin` | `AdminDashboard` (27 vues) | une société |
| Vendeur | `vendor` | `VendorDashboard` (7 vues) | leads qui lui sont assignés |
| Client | `client` | `ClientDashboard` (6 vues) | ses RDV et messages |

### Impersonation (« Se connecter en tant que »)
Chaîne implémentée dans `AppDashboardRouter.tsx`, avec pile de retour dans `VisualizationContext` :

```
Super Admin → Company Super Admin
Super Admin → Admin → Vendeur → Client
Super Admin → Admin → Client
Company Super Admin → Admin → (Vendeur | Client)
Admin → Vendeur → Client
Admin → Client
Vendeur → Client
```

L'impersonation est **purement côté client** : la session Supabase reste celle de l'appelant, seul
le `company_id` transmis aux providers change. Cela ne fonctionne que parce que la RLS des tables
métier n'isole pas les sociétés (voir §27, S3).

Deux garde-fous de rôle existent au chargement :
- `admin` + `app_metadata.access_enabled === false` → écran « accès bloqué »
- rôle inconnu → écran « non autorisé »

---

## 6. Principales fonctionnalités

### CRM & leads
- Import CSV/Excel avec détection de colonnes, normalisation téléphone/email, détection de doublons
  (fichier + base, scopée société), 3 modes d'import, historique (`import_history`)
- Table CRM : filtres (nom, prénom, email, tél, vendeur, statut), tri, sélection multiple,
  transfert en masse vers un vendeur, suppression en masse
- Colonnes réordonnables + colonnes personnalisées (`custom_columns` / `custom_column_values`)
- « Mode travail » avec undo/redo et historique persistant
- Statuts personnalisés avec couleurs et favoris de couleurs
- Bascule IA par lead et globale (`leads.ai_enabled`)
- Vue mobile dédiée (cartes) distincte de la vue desktop (table)

### Vendeurs
- Création de compte vendeur (Edge Function `create-user`), assignation de leads
- Commentaires admin sur un vendeur (`vendor_comments`)
- Chat Admin ↔ Vendeur, configuration des colonnes visibles par vendeur

### Rendez-vous / Agenda
- Propositions de RDV : vendeur → client, client → vendeur (contre-proposition), replanification
- Statuts `pending` / `confirmed` / … + `treated_at`, chaînage des replanifications
- Agenda mois / semaine / jour, agenda perso et agenda équipe, conversion de fuseau horaire
- Notifications ciblées (proposition, confirmation, replanification, demande de replanification)

### Messagerie
- 5 canaux : Client↔Admin, Client↔Vendeur, Vendeur↔Admin, Admin↔Super Admin, CSA↔Admin
- Texte, image, document, **message vocal** (`VoiceRecorder` + `AudioPlayer`)
- Realtime, compteurs de non-lus, suppression logique, envoi optimiste avec réessai
- Réponse automatique IA (DeepSeek) sur le canal client

### Sites & domaines
- Site builder Super Admin : 9 templates, studio (sections, dégradés, typographie, calques, aperçu mobile)
- Publication par `slug` (`/site/<slug>`) ou par **domaine personnalisé** (via API Vercel)
- Achat de domaine intégré (registrar Vercel) avec marge configurable

### Personnalisation visuelle
- 15 thèmes prédéfinis + thème « glass » paramétrable + thèmes personnalisés sauvegardés
- Éditeur live : 4 zones de fond, textes, typographie, boutons, cartes, image de fond
  (zoom / position / fit)
- Personnalisation par élément (« zone droite ») avec presets

### Outils internes
- **Documentation CRM** (59 fichiers) : documentation base de données, blocs de contenu, checklists,
  cartes de contexte, arbre de structure, audit technique, export/import JSON
- **System** : catégories, items, statuts d'avancement du système
- **Sauvegarde / restauration** : export JSON complet, restauration ordonnée avec vérification des
  clés étrangères, mode simulation, nettoyage des orphelins
- **Tests système** (Super Admin) : catalogue de fonctions / commandes / tutos — **stocké en
  localStorage**, ce n'est **pas** un lanceur de tests
- **Démo live** : le Super Admin partage son curseur et pilote la vue d'un utilisateur
  (Realtime broadcast)
- **Améliorations / Idées** : kanban interne

### IA
- Chat IA outillé (`talvex-ai-chat`) avec appels d'outils (contexte société, créneaux, contexte lead…)
- « Cerveau IA » : base de connaissances par société et plateforme
- Génération / édition / vectorisation / segmentation de logos
- Éditeur d'image IA (Stability, Recraft)

### PWA
- Manifest, service worker, installation, notifications push Web Push (VAPID),
  shell mobile dédié en mode standalone, purge de session au lancement

---

## 7. Routes principales

**Il n'existe que deux « vraies » routes URL** (la SPA réécrit tout vers `/` via `vercel.json`) :

| URL | Comportement |
|---|---|
| `/site/<slug>` | rendu de `CompanySitePage` pour ce slug |
| `/` sur un domaine personnalisé | `useCustomDomain()` résout `company_home_pages.custom_domain` |
| `/` (hôte connu) | landing (template actif) ou dashboard selon la session |
| `?virtualPhone` | mode téléphone virtuel (iframe de prévisualisation) |

### « Routes » internes par panel (états `activeView`)

**Super Admin (24)** — `dashboard`, `super-admins`, `admins`, `chat-admin`, `documentation-crm`,
`system`, `sauvegarde`, `mon-compte`, `tests-systeme`, `crm-societe`, `statuts`, `api-ia`,
`cerveau-ia`, `sites`, `fonctions-talvex`, `site-talvex`, `logo`, `ameliorations`, `tuto`,
`application`, `themes`, `editeur-ia`, `calquer-logo`, `mes-logos-ra`

**Admin (27)** — `vue-ensemble`, `site`, `logo`, `info-admin`, `inscription`, `import-leads`,
`ajouter-leads`, `crm`, `ajouter-vendeur`, `liste-vendeurs`, `chat-super-admin`, `chat-client`,
`chat-vendeur`, `agenda`, `agenda-equipe`, `propositions-rdv`, `statuts`, `documentation-crm`,
`system`, `sauvegarde`, `cerveau-ia`, `application`, `tuto`, `editeur-ia`, `calquer-logo`,
`mes-logos-ra`

**Vendeur (7)** — `vue-ensemble`, `leads`, `chat-admin`, `chat-client`, `agenda`,
`propositions-rdv`, `tuto`

**Client (6)** — `vue-ensemble`, `messagerie`, `agenda`, `propositions-rdv`, `tuto`,
`suivi-corporel`

**PWA mobile** — 5 onglets max par rôle + menu « Plus » (`pwaMobileShellConfig.tsx`)

---

## 8. Tables Supabase trouvées

**73 tables créées** par les migrations, **2 tables utilisées mais jamais créées** (voir §26).

### Cœur CRM (10)
`companies` · `leads` · `vendors` · `registrations` · `registration_requests` · `import_history` ·
`statuts` · `vendor_comments` · `rdv_proposals` · `audit_history`

### Messagerie (6)
`client_messages` · `vendor_admin_messages` · `super_admin_messages` · `conversations` ·
`messages` · `chat_automation_config`

### Commentaires / relation (4)
`admin_comments` · `csa_admin_comments` · `sa_crm_societe_comments` · `admin_announcements`

### Documentation & pilotage interne (14)
`crm_documentation` · `doc_tab_labels` · `crm_notes` · `crm_ideas` · `crm_tasks` ·
`crm_context_cards` · `crm_custom_pages` · `crm_page_checklist_items` · `crm_discovered_tables` ·
`content_blocks` · `content_block_infos` · `content_block_tasks` · `crm_ameliorations` ·
`crm_amelioration_categories`

### System (3)
`crm_system_items` · `crm_system_categories` · `crm_system_statuses`

### Super Admin / CRM Société (7)
`sa_argumentaires` · `sa_company_prospects` · `sa_statuts` · `sa_admin_order` · `sa_ai_apis` ·
`sa_visual_customizations` · `sa_visual_presets`

### Sites, domaines, PWA (7)
`company_home_pages` · `site_templates` · `site_sections` · `domain_orders` ·
`domain_pricing_config` · `registrar_contact_info` · `push_subscriptions`

### Thèmes & éditeur (6)
`theme_config` · `theme_categories` · `editor_sessions` · `glass_presets` ·
`glass_library_images` · `app_config`

### Logos & images IA (4 + 1 manquante)
`admin_logo_ra` · `admin_logo_library` · `logo_trace_sessions` · `ai_generated_images` ·
*(`company_logos` → référencée mais jamais créée)*

### IA (3)
`ai_company_brain` · `ai_conversation_logs` · `ai_tool_logs`

### Préférences & UI (7)
`user_preferences` · `sidebar_order` · `panel_hidden_tabs` · `page_label_overrides` ·
`custom_columns` · `custom_column_values` · `company_column_config`

### Divers (2)
`demo_sessions` · `client_body_assessments` (module « suivi corporel » wellness)

### Vue
`leads_sans_statut_count`

### Fonctions PG notables
`find_duplicate_leads(emails, telephones, company_id)` *(SECURITY DEFINER)* ·
`cleanup_orphan_import_history()` · `get_public_table_names()` · `get_database_stats()` ·
`introspect_table_schema()` · `get_company_admin_ids()` · `is_wellness_company()` ·
triggers `updated_at` et propagation de `vendor_id` lors de la réassignation d'un lead

### Buckets Storage (7, tous **publics**)
`chat-files` (10 Mo) · `theme-backgrounds` (10 Mo) · `editor-backgrounds` (5 Mo) · `ai-images` ·
`admin-logo-ra` · `admin-logo-library` · *(`company-logos` référencé mais jamais créé)*

### Realtime activé sur
`leads`, `statuts`, `rdv_proposals`, `registrations`, `client_messages`, `vendor_admin_messages`,
`demo_sessions`, `company_logos`

---

## 9. Migrations

- **161 migrations actives** dans `supabase/migrations/` (9 127 lignes), horodatées du
  `20260317042359` au `20260615211031`
- **26 migrations archivées** dans `_archive_migrations/` — historique uniquement, non rejoué
- La première, `20260317042359_000000_full_schema.sql` (966 lignes), est une **consolidation** :
  17 tables, 1 vue, 5 fonctions, 3 triggers, RLS complète
- Toutes les migrations sont écrites de façon **idempotente** (`IF NOT EXISTS`, blocs `DO $$` avec
  vérification `pg_policies` / `pg_trigger` / `pg_publication_tables`)
- **364 instructions `CREATE POLICY`** au total

### Trajectoire lisible dans l'historique
1. **Mars** : CRM mono-tenant (leads, vendeurs, messages, RDV, statuts)
2. **Avril** : documentation, idées, notes, realtime, propositions de RDV
3. **Mi-mai** : **introduction du multi-tenant** — `companies`, puis `company_id` ajouté à 17 tables
   *(la migration précise explicitement « No RLS changes on existing tables »)*
4. **Mai–juin** : sites & domaines, IA (cerveau, chat, logs), thèmes, éditeur visuel, PWA/push,
   logos IA, Company Super Admin, module wellness

### Points d'attention (détaillés en §26)
- La table `company_logos` n'a **aucune migration `CREATE TABLE`**, alors que plusieurs migrations
  définissent ses politiques RLS et son realtime → **la chaîne ne rejoue pas sur un projet vierge**
- La table `session_timeout_settings` n'existe dans **aucune** migration
- `seed.sql` fait `ON CONFLICT (nom)` sur `statuts` sans renseigner `company_id`

---

## 10. Edge Functions

**29 fonctions Deno** (6 860 lignes). Toutes exposent `Access-Control-Allow-Origin: "*"`.

### Gestion des comptes (14)
| Fonction | Contrôle d'accès | Note |
|---|---|---|
| `create-user` | JWT + rôle `admin`/`super_admin` ; création d'admin réservée au SA | crée aussi la société |
| `update-user-password` | JWT + rôle ; **périmètre vérifié seulement pour `vendor` et `company_super_admin`** | PIN 6 chiffres imposé |
| `get-user-pin` | JWT + SA / CSA (périmètre) / soi-même | **renvoie le PIN en clair** |
| `list-admins` | JWT + rôle | |
| `list-admins-for-super-admin` | JWT + rôle | |
| `list-company-super-admins` | JWT + rôle | |
| `create-admin-for-super-admin` | JWT + rôle | |
| `create-company-super-admin` | JWT + rôle | |
| `update-admin` | JWT + rôle | |
| `update-admin-for-super-admin` | JWT + rôle | |
| `update-company-super-admin` | JWT + rôle | |
| `delete-admins` | JWT + rôle | |
| `toggle-admin-access` | JWT + rôle | |
| `toggle-admin-access-for-super-admin` | JWT + rôle | **jamais appelée** |
| `resolve-parent-super-admin` | JWT + rôle | |

### IA (5)
`talvex-ai-chat` (DeepSeek + tool calling, périmètre société revalidé côté serveur) ·
`chat-auto-reply` (réponse auto client, anti-boucle + anti-doublon) ·
`sa-support-auto-reply` · `ai-provider-status` (état et crédits des fournisseurs) ·
`stability-image-editor`

### Images / logos (5)
`generate-logo` (Recraft) · `edit-logo` (Recraft) · `recraft-image-fusion` (**jamais appelée**) ·
`vectorize-logo` (Vectorizer.ai — **aucune authentification**) ·
`segment-logo-zones` (Replicate SAM — **aucune authentification**)

### Domaines (2)
`manage-domain` (rattachement / vérification DNS via Vercel) ·
`domain-registrar` (disponibilité, prix, **achat réel**, plafond 200 USD, SA uniquement)

### PWA (2)
`send-push-notification` (JWT mais **aucune vérification du destinataire**) ·
`pwa-manifest` (public, **jamais appelée depuis le frontend**)

Il n'existe **pas** de dossier `_shared/` : `corsHeaders`, le bloc d'authentification et
`buildBrainSystemPrompt()` sont dupliqués dans chaque fonction.

---

## 11. APIs externes

| Service | Utilisé par | Secret |
|---|---|---|
| **DeepSeek** (`api.deepseek.com`) | `talvex-ai-chat`, `chat-auto-reply`, `sa-support-auto-reply`, `stability-image-editor`, `ai-provider-status` | `DEEPSEEK_API_KEY` |
| **Recraft** (`external.api.recraft.ai`) | `generate-logo`, `edit-logo`, `recraft-image-fusion`, `ai-provider-status` | `RECRAFT_API_KEY` |
| **Stability AI** (`api.stability.ai`) | `stability-image-editor`, `ai-provider-status` | `STABILITY_API_KEY` |
| **Replicate** (`api.replicate.com`) | `segment-logo-zones` (modèle SAM) | `REPLICATE_API_TOKEN` |
| **Vectorizer.ai** (`fr.vectorizer.ai`) | `vectorize-logo`, `ai-provider-status` | `VECTORIZER_API_ID` + `VECTORIZER_API_SECRET` |
| **Vercel API** (`api.vercel.com`) | `manage-domain` (domaines projet), `domain-registrar` (achat) | `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` |
| **Web Push** (`web-push` npm) | `send-push-notification` | `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` |
| **Supabase** | tout | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

Le suivi des coûts et crédits des fournisseurs est stocké dans `sa_ai_apis` (coût, date d'achat,
dernier contrôle, identifiant d'API, login associé).

### Variables d'environnement utilisées
**Frontend (`.env`, préfixe `VITE_`)** : `VITE_APP_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` — toutes publiques par nature.
Le fichier `.env` présent ne contient **que ces 4 clés publiques** et il est bien listé dans
`.gitignore`.

**Edge Functions (secrets Supabase)** : les 14 clés listées ci-dessus.
`ALLOWED_ORIGINS` est documenté dans `.env.example` et `SETUP.md` mais **n'est lu par aucune
fonction**.

---

## 12. Système d'authentification

### Principe
- **Supabase Auth**, méthode unique : `signInWithPassword({ email, password: pin })`
- Le « mot de passe » est un **PIN à 6 chiffres** saisi dans 6 champs (`LoginPinInput`),
  avec retour sonore (oscillateur Web Audio)
- `update-user-password` **impose** le format `/^\d{6}$/` : la force du mot de passe est donc
  plafonnée à 10⁶ combinaisons pour tous les comptes créés par l'application
- Le rôle est lu dans `app_metadata.role`, le `company_id` dans `app_metadata.company_id`

### Stockage de session
`src/lib/supabase.ts` :
```ts
auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
```
- `main.tsx` purge tous les tokens `sb-*-auth-token` restés dans `localStorage`
- En mode **PWA standalone**, `main.tsx` purge aussi `sessionStorage` à chaque lancement →
  reconnexion obligatoire à chaque ouverture de l'app installée
- `jwt_expiry = 3600` (`config.toml`)

### Déconnexion automatique
`useSessionTimeout` : 90 min par défaut, avertissement 5 min avant, 6 événements d'activité
throttlés à 30 s. **La table `session_timeout_settings` interrogée n'existe pas** → la valeur
configurable n'est jamais lue ni écrite.

### Écrans de garde
`AppLoadingScreen`, `AppAccessBlocked` (admin désactivé), `AppDomainBlocked` (mauvais domaine),
`AppUnauthorizedPage` (rôle inconnu), `CompanySuperAdminWaitingPage` (CSA sans société résolue).

### Inscription publique
`RegisterModal` insère dans `registrations` (INSERT `anon` autorisé) avec **le PIN en clair**
dans la colonne `password`, statut `pending`. L'admin valide ensuite dans la vue « Inscription ».

---

## 13. Système multi-tenant

### Modèle
`companies` (`id`, `name`, `admin_first_name`, `admin_last_name`, `parent_company_id`,
`company_tier`, `theme_config`)

Hiérarchie : `Super Admin (plateforme)` → `Company Super Admin (société parente)` →
`Admin (société)` → `Vendeur` → `Client`.

Le rattachement se fait par **`app_metadata.company_id`** posé à la création du compte
(`create-user`). Pour un client, il peut aussi être résolu via `registrations.company_id`.

`company_id` a été ajouté à 17 tables métier (colonne **nullable**, avec rétro-remplissage vers la
société historique `a0000000-…-0001`).

### Où l'isolation est réellement appliquée
| Couche | État |
|---|---|
| Frontend | ✅ systématique — `useCompanyId()` puis `.eq('company_id', companyId)` dans chaque hook de données |
| Edge Functions | ⚠️ partiel — vérifié dans `talvex-ai-chat`, `chat-auto-reply`, `get-user-pin` (CSA), `update-user-password` (CSA/vendeur) ; **absent** pour admin/SA dans `update-user-password` |
| RLS Postgres | ❌ **absente** sur les tables métier du socle — voir §27, S3 |

Les tables **créées après** l'introduction du multi-tenant (`chat_automation_config`,
`ai_company_brain`, `company_home_pages`, `app_config`, `company_logos`, `theme_config`…) ont, elles,
des politiques correctes basées sur `auth.jwt() -> 'app_metadata' ->> 'company_id'`.
C'est **l'ancien socle CRM qui n'a jamais été repris**.

### Contraintes scopées / non scopées
- ✅ `leads_email_company_unique` et `leads_telephone_company_unique` sur `(valeur, company_id)`
- ✅ `find_duplicate_leads(..., p_company_id)`
- ❌ `statuts.nom` reste **UNIQUE global** → collision entre sociétés
- ❌ `vendors.email` reste **UNIQUE global**

---

## 14. Fonctionnement du CRM

Point d'entrée : `src/pages/admin/views/Crm.tsx` + `crm/useCrmData.ts` (21 fichiers dans `crm/`).

### Modèle de données
`leads` conserve à la fois des colonnes structurées (`prenom`, `nom`, `email`, `telephone`) **et**
un `data jsonb` contenant les colonnes brutes du CSV. Les vues lisent l'un ou l'autre
(`lead.prenom ?? lead.data['Prenom'] ?? lead.data['prenom']`), ce qui explique les nombreuses
branches défensives dans le code.

### Chargement
```ts
supabase.from('leads')
  .select('id, data, imported_at, statut, actif, vendor_id, ai_enabled')
  .eq('company_id', companyId)
  .order('imported_at', { ascending: false }).order('id')
```
Les statuts et les vendeurs sont chargés séparément, également scopés société.

### Realtime
Un canal `leads-crm` écoute INSERT / UPDATE / DELETE sur `leads`.
Les INSERT sont filtrés **en JavaScript** (`if (inserted.company_id !== companyId) return`).
Les UPDATE sont appliqués par `id` sans filtre société. Un verrou de 3 s (`recentUpdates`) évite
que le realtime n'écrase une mise à jour optimiste locale.

### Actions
Statut, actif/inactif, bascule IA (par lead et globale), transfert en masse vers un vendeur,
suppression en masse, modale de détail, modale d'action, affichage du PIN client (`CrmPinDisplay`),
« Se connecter en tant que » client, ouverture du chat, création d'une proposition de RDV.

### Filtres & tri
Filtrage **entièrement côté client** sur le tableau déjà chargé (nom, prénom, email, tél, vendeur,
statut, « sans statut »), tri par date d'import. **Aucune pagination** : tous les leads de la société
sont chargés en mémoire.

### Import
`lib/csvImportPipeline.ts` : parseur CSV maison (détection `,` / `;`, guillemets échappés),
plafonds 10 Mo / 5 000 lignes / lots de 200, détection automatique des colonnes (variantes FR/EN),
validation d'un échantillon de téléphones (seuil 40 %), classement de chaque ligne en
`valid` / `dup_file` / `dup_crm` / `error`, puis appel de `find_duplicate_leads`.
`lib/excelImport.ts` convertit le XLSX en CSV via `xlsx`.

---

## 15. Fonctionnement de l'agenda

Composant partagé `src/components/agenda/` (10 fichiers), utilisé par les 4 panels avec des
permissions différentes (`canAdd`, `canDelete`, `canTreat`) et une couleur d'accent par rôle.

- 3 vues : **mois**, **semaine**, **jour** (défaut : jour)
- Source unique : la table **`rdv_proposals`** — il n'existe pas de table « events » séparée
- Statuts via `STATUS_CFG` + marqueur `treated_at` (« traité »)
- Rafraîchissement automatique : `setInterval` 60 s + `setTimeout` calé sur le prochain RDV confirmé
  non traité, pour faire basculer visuellement l'état à l'heure exacte
- Conversion de fuseau : `getRdvLocalDate` / `getRdvLocalTime` (`lib/timezoneUtils.ts`), avec fuseau
  utilisateur **et** fuseau client affichés séparément
- Agenda perso vs **agenda équipe** (admin) : deux jeux de notifications distincts
  (`useAgendaNotifications`, `useAgendaEquipeNotifications`)

### Flux de proposition de RDV
```
Vendeur/Admin propose  →  rdv_proposals(status='pending', created_by_role='vendor'|'admin')
Client accepte         →  status='confirmed'
Client contre-propose  →  counter_proposal_* + nouvelle ligne chaînée
Replanification        →  reschedule_* ; rdvChainFilter.ts n'affiche que le maillon actif
Traitement             →  treated_at
Vu / non vu            →  seen_by_client, seen_by_admin, seen_by_vendor
```

---

## 16. Fonctionnement du chat

`src/components/chat/ChatView.tsx` (`MessagingPanel`) est un composant **générique** :
il reçoit `contacts`, `messages`, `currentRole`, `onSendMessage`, `onDeleteMessage`… ; chaque panel
fournit sa propre couche de données.

### Canaux et tables
| Canal | Table |
|---|---|
| Client ↔ Admin | `client_messages` (`vendor_id IS NULL`) |
| Client ↔ Vendeur | `client_messages` (`vendor_id` renseigné) |
| Vendeur ↔ Admin | `vendor_admin_messages` |
| Admin ↔ Super Admin | `super_admin_messages` |
| CSA ↔ Admin | `super_admin_messages` (politiques CSA dédiées) |
| Générique (peu exploité) | `conversations` + `messages` |

### Fonctionnalités
- Envoi **optimiste** avec état `_pending` / `_failed` et bouton de réessai
- Pièces jointes : image, document, **audio** (`VoiceRecorder` → bucket `chat-files`)
- Suppression logique (`deleted = true`) ; règles : le client ne peut supprimer que son dernier
  message, l'admin peut tout supprimer, un vendeur ne supprime que ses propres messages
- Realtime activé sur `client_messages` et `vendor_admin_messages`
- Compteurs de non-lus : 8 hooks distincts (`useUnreadClientMessages`, `useUnreadVendorMessages`,
  `useUnreadSuperAdminMessages`, `useUnreadFromSuperAdmin`, `useUnreadCSAAdminMessages`…)
- Barre latérale de contacts avec recherche, sélection multiple, suppression de conversations
- Notification push déclenchée à l'envoi (`lib/sendPushForMessage.ts`)

### Réponse automatique IA
`chat-auto-reply` est appelée après l'insertion d'un message client. Garde-fous, dans l'ordre :
1. `sender === 'client'`, sinon on ignore (anti-boucle)
2. `is_ai_reply !== true`
3. aucune réponse existante avec `replied_to_message_id = message_id` (anti-doublon)
4. `message.company_id` présent
5. **`leads.ai_enabled === true`** pour ce lead (avec repli par email si le lead appartient à une
   autre société)
6. chargement de `ai_company_brain` (scope `company`) → prompt système ; repli sur
   `chat_automation_config` + `crm_context_cards`
7. 20 derniers messages comme historique, DeepSeek `deepseek-chat`, `max_tokens: 300`,
   `temperature: 0.7`

---

## 17. Système de thèmes

### 15 thèmes
`dark`, `light`, `graphite`, `beige`, `rose`, `emerald`, `luxury`, `pink`, `red`, `orange`,
`yellow`, `highlevel_light`, `highlevel_dark`, `highlevel_emerald`, `glass`

Chaque thème est un fichier de **tokens** dans `src/lib/themeTokens*.ts` (~6 Ko chacun) typé par
`themeTokensTypes.ts` : `surface`, `text`, `label`, `input`, `modal`, `table`, `sidebar`, `main`,
`danger`… Les composants consomment `useThemeTokens()` et appliquent les couleurs **en style
inline**, pas via des classes Tailwind. Tailwind ne sert qu'à la mise en page.

### Portée (scope) — `contexts/themeScope.ts`
| Scope | Stockage |
|---|---|
| `sa` (Super Admin) | `user_preferences.theme_by_role.super_admin` |
| `company` (admin, vendeur, client, CSA) | `companies.theme_config` |
| `none` | rien |

Le thème est donc **partagé par toute la société** pour les rôles non-SA.
Un cache localStorage par scope (`tlx_theme_co_<id>`, `tlx_glass_…`, `tlx_ct_key_…`,
`tlx_ct_overrides_…`) permet un rendu immédiat, la valeur serveur écrasant ensuite si elle diffère.
Le script inline de `index.html` lit `crm_theme_last` pour peindre le fond avant même React.

### Thème « glass »
`GlassConfig` : image de fond, flou (3 niveaux), transparence des cartes, mode d'overlay,
couleur d'accent, opacité, luminosité, saturation, flou d'arrière-plan.
Bibliothèque d'images (`glass_library_images`) et presets (`glass_presets`).

### Thèmes personnalisés
`theme_config` + `theme_categories` : un thème enregistré porte `zone_overrides`, `zone_css`,
`text_overrides`, `background_image`, `typography_overrides`, avec propriété et partage
(migration `add_theme_ownership_and_sharing`).

### Éditeur visuel
`EditorModeContext` + `components/editor/` (39 fichiers) : 4 zones de fond (sidebar haut/bas,
topbar, contenu), couleurs unies et dégradés, couleurs sauvegardées, textes, typographie (liste de
polices embarquée), boutons, cartes, image de fond (zoom / position / cover-contain-fill / rayon).
La session d'édition est persistée dans `editor_sessions` (avec `scope_key`).
Un second mode, « zone droite » (`VisualCustomizeContext`), cible un élément précis et applique des
presets (`sa_visual_presets`, `sa_visual_customizations`).

---

## 18. Sites et domaines

### Table `company_home_pages`
`company_id` (nullable) · `site_scope` (`company` | `platform`) · `slug` · `custom_domain` ·
`domain_verified` · `is_active` · `active_template_id` · fond (couleur / dégradé / canvas / mode) ·
`overlay_elements` · `app_icon_url` · `logo_scale`

### 9 templates (`templateRegistry.tsx`)
`talvex_official` (landing officielle Talvex, avec modale de connexion intégrée) ·
`renewable_energy` · `heat_pump` · `fitness` · `real_estate` · `renovation` · `gold_buying` ·
`builder_ready` · `barbie_wellness`

Les templates sont aussi enregistrés en base (`site_templates`, avec `config`, `is_visible`,
`owner_*`) et leurs sections dans `site_sections`.

### Studio (41 fichiers)
Édition des sections (ordre, visibilité, contenu, styles), dégradés multi-arrêts avec curseurs,
typographie, éléments en surimpression, hauteur de page, aperçu mobile plein écran, enregistrement
comme template, publication.

### Résolution du site public
1. `/site/<slug>` → `getHomePageBySlug`
2. hôte inconnu → `useCustomDomain()` → `getHomePageByDomain(hostname)` (exige `is_active` **et**
   `domain_verified`)
3. hôtes reconnus (localhost, `*.vercel.app`, `*.supabase.co`, webcontainer, bolt.new,
   stackblitz…) → application normale

### Domaines
- `manage-domain` : ajout du domaine au projet Vercel, récupération de la config DNS recommandée
  (A rang 1 + CNAME rang 1), vérification, retrait
- `domain-registrar` : `check-availability`, `get-price`, **`buy`** (achat réel via le registrar
  Vercel, `autoRenew: true`, plafond **200 USD**, `expectedPrice` obligatoire), suivi dans
  `domain_orders`, marge calculée depuis `domain_pricing_config`, coordonnées depuis
  `registrar_contact_info` (`label = 'talvex_default'`)
- `payment_status` vaut `'super_admin_dev_manual'` → **aucun encaissement client n'est implémenté**

### Connexion depuis un domaine personnalisé
`LoginModal` reçoit `domainCompanyId` : après authentification, si le `company_id` de l'utilisateur
ne correspond pas au domaine, la session est immédiatement fermée (« Ce compte n'est pas autorisé
sur ce domaine »). Le Super Admin est exempté.

⚠️ `CLAUDE.md` à la racine pose une **règle projet explicite** : la landing centralisée reste le
point d'entrée unique de connexion pour tous les rôles ; le module Sites ne doit pas la remplacer
tant que la V2 n'est pas explicitement activée.

---

## 19. La PWA

| Élément | Détail |
|---|---|
| Manifest statique | `public/manifest.webmanifest` — nom « Talvex », `display: standalone`, `orientation: portrait`, 5 icônes |
| Manifest dynamique | Edge Function `pwa-manifest?company_id=…` — icône par société — **jamais appelée depuis le frontend** |
| Service worker | `public/service-worker.js`, cache `talvex-v4` |
| Stratégie de cache | **network-first**, repli cache ; exclut `/functions/`, `/rest/`, `/auth/`, `/storage/` et les origines externes ; repli `index.html` pour les navigations |
| Icônes | générées au `prebuild` par `scripts/generateIcons.cjs` (192, 512, maskables, apple-touch) |
| Installation | `usePwaInstall` + `lib/pwaPromptCapture.ts` (capture de `beforeinstallprompt` avant React) |
| Shell mobile | `PwaMobileShell` — 5 onglets par rôle + menu « Plus », vues chargées en lazy |
| Sécurité | purge de la session Supabase à **chaque** lancement standalone (`main.tsx`) |

### Notifications push
- Web Push / VAPID ; abonnements dans `push_subscriptions` (`user_id`, `endpoint`, `p256dh`,
  `auth`, `enabled`, `last_used_at`)
- `lib/pushNotifications.ts` (abonnement, désabonnement, test) + `hooks/usePushNotifications.ts`
  (support détecté, besoin PWA sur iOS, clé VAPID manquante)
- `send-push-notification` : types `test` (vers soi) et `message` (vers `target_user_id`) ;
  désactive automatiquement un abonnement sur 404/410
- Le service worker gère `push` et `notificationclick` (focus de l'onglet + `postMessage`)

---

## 20. Fonctionnalités IA

### « Cerveau IA » — `ai_company_brain`
Deux portées : `platform` (Talvex) et `company`. Champs : `business_context_text` (texte libre
prioritaire), identité (nom, description, secteur, ville, pays, téléphone, email, site),
`services[]`, `opening_hours` (semaine), `faq[]`, `official_responses[]`, `knowledge_sections[]`,
`forbidden_topics`, `sensitive_topics`, `tone`, `language`, `appointment_rules`, `crm_rules`.
`buildBrainSystemPrompt()` assemble le prompt système avec des règles strictes anti-hallucination.

### Chat IA outillé — `talvex-ai-chat`
DeepSeek avec **tool calling** : `get_company_context`, `get_available_slots`, `get_lead_context`, …
Le `company_id` est **revalidé côté serveur** selon le rôle de l'appelant (SA = libre,
admin/vendeur = son `company_id`, client = résolu depuis ses données). Seul le SA peut tester le
cerveau `platform`. Journalisation dans `ai_conversation_logs` et `ai_tool_logs` (avec `is_test`).

### Réponse automatique — `chat-auto-reply` / `sa-support-auto-reply`
Voir §16. Double interrupteur : `leads.ai_enabled` par lead + bascule globale dans la barre CRM.

### Images & logos
| Fonction | Fournisseur | Usage |
|---|---|---|
| `generate-logo` | Recraft | génération de logo (598 lignes) |
| `edit-logo` | Recraft | retouche |
| `recraft-image-fusion` | Recraft | fusion — **non branchée** |
| `stability-image-editor` | Stability (+ DeepSeek pour le prompt) | éditeur d'image IA (600 lignes) |
| `vectorize-logo` | Vectorizer.ai | raster → SVG, avec relevé de crédits |
| `segment-logo-zones` | Replicate (SAM) | découpage du logo en zones colorées |

Côté frontend : `components/logo/` (29 fichiers), `admin/views/calquer-logo/` (52 fichiers —
décomposition SVG, masques, amélioration, zones), `admin/views/editeur-ia/` (13 fichiers),
`admin/views/mes-logos/`, tables `admin_logo_library`, `admin_logo_ra`, `logo_trace_sessions`,
`ai_generated_images`.

### Supervision
`sa_ai_apis` : une ligne par fournisseur (DeepSeek, Recraft, Stability…) avec coût, date d'achat,
identifiant d'API, login Gmail associé, `last_checked_at`.
`ai-provider-status` interroge chaque fournisseur pour l'état et les crédits restants.

---

## 21. Les tests existants

### Playwright — les seuls tests automatisés réels (5 specs, 481 lignes)
| Fichier | Contenu |
|---|---|
| `e2e/health-check.spec.ts` | la page d'accueil se charge |
| `e2e/inscription-public.spec.ts` | parcours d'inscription publique |
| `e2e/admin/creation-admin.spec.ts` | création d'un admin par le SA (27 lignes) |
| `e2e/admin/info-admin.spec.ts` | page Info admin (122 lignes) |
| `e2e/admin/add-lead-client-login-cleanup.spec.ts` | ajout d'un lead → connexion client → nettoyage (101 lignes) |
| `e2e/helpers/` | `auth.ts`, `createTestAdmin.ts`, `navigation.ts`, `testIds.ts` |

Configuration : `fullyParallel`, timeout 60 s, 1 reprise en CI, rapport HTML, capture d'écran et
trace en cas d'échec, `webServer` lance `npm run dev`.

### Ce qui n'existe pas
- Aucun test unitaire (pas de Vitest / Jest / Testing Library)
- Aucun test d'intégration sur les Edge Functions
- Aucun test des politiques RLS
- Aucune configuration CI (pas de `.github/`)

### Faux amis à connaître
- **« Tests système »** (panel Super Admin, 22 fichiers) est un **catalogue documentaire** de
  fonctions / commandes / tutos, stocké en `localStorage`. Il ne lance rien.
- **« Audit technique »** (Documentation CRM) lit `src/generated/auditSnapshot.json`, produit par
  le plugin Vite `auditPlugin.ts` à chaque sauvegarde de fichier : compte les `any`, les fichiers
  de plus de 300 lignes, les totaux. Les champs tsc/eslint sont repris du snapshot précédent, pas
  recalculés. Les identifiants `MOCK_*` du code (`auditMockData.ts`) sont **mal nommés** : les
  données sont réelles, dérivées du snapshot.

⚠️ Les helpers e2e attendent le texte **« Novigo 3D »** sur la page d'accueil, alors que la landing
servie est désormais `TalvexOfficialTemplate`. Les tests qui passent par `loginWith()` (donc tous
sauf l'inscription publique) sont vraisemblablement cassés.

---

## 22. Les fichiers les plus importants

| Fichier | Pourquoi |
|---|---|
| `src/App.tsx` | routeur racine, détection de rôle, impersonation, domaines, PWA |
| `src/app/AppDashboardRouter.tsx` | toute la logique d'impersonation entre rôles |
| `src/app/AppShell.tsx` | composition des providers |
| `src/lib/supabase.ts` | client unique (12 lignes, mais tout en dépend) |
| `src/contexts/ThemeContext.tsx` + `themeScope.ts` | thème, portée, cache, persistance |
| `src/contexts/CompanyIdContext.tsx` | **la seule barrière multi-tenant effective** |
| `src/contexts/EditorModeContext.tsx` | éditeur visuel (le plus gros context) |
| `src/pages/admin/views/crm/useCrmData.ts` | cœur du CRM |
| `src/lib/csvImportPipeline.ts` | import et déduplication |
| `src/components/chat/ChatView.tsx` | messagerie générique des 5 canaux |
| `src/components/agenda/AgendaView.tsx` | agenda des 4 panels |
| `src/lib/companyHomePages.ts` | sites, slugs, domaines |
| `supabase/migrations/20260317042359_000000_full_schema.sql` | socle de la base |
| `supabase/migrations/20260515095456_add_company_id_to_business_tables.sql` | bascule multi-tenant |
| `supabase/functions/create-user/index.ts` | création de comptes et de sociétés |
| `supabase/functions/talvex-ai-chat/index.ts` | IA outillée + validation de périmètre |
| `CLAUDE.md` | règle projet sur la landing / la connexion centralisée |

---

## 23. Les fichiers très gros ou complexes

Le projet applique une **discipline de taille** (seuil interne 300 lignes, surveillé par
`auditPlugin.ts`). Seuls 8 fichiers dépassent :

| Fichier | Lignes | Dépassement |
|---|---:|---:|
| `superadmin/views/site-builder/templates/BarbieWellnessTemplate.tsx` | 503 | +203 |
| `company-super-admin/CompanySuperAdminDashboard.tsx` | 473 | +173 |
| `components/layout/SidebarFooterActions.tsx` | 345 | +45 |
| `admin/views/calquer-logo/CalquerLogo.tsx` | 342 | +42 |
| `superadmin/SuperAdminSidebar.tsx` | 325 | +25 |
| `admin/components/topbar/AdminNotificationsHub.tsx` | 320 | +20 |
| `vendor/VendorDashboard.tsx` | 304 | +4 |
| `admin/views/calquer-logo/calquer-logo-svg-decompose.ts` | 303 | +3 |

Hors `src/` : `src/index.css` (489 lignes) et l'artefact résiduel
`vite.config.ts.timestamp-1778013638492-c311154d06829.mjs` (14 690 octets, à supprimer).

### Complexité réelle (au-delà du nombre de lignes)
- `AppDashboardRouter.tsx` : 12 branches conditionnelles imbriquées d'impersonation
- `EditorModeContext.tsx` : 289 lignes + 8 fichiers d'état satellites
- `talvex-ai-chat/index.ts` (622 l.) et `stability-image-editor/index.ts` (600 l.)
- Dossier `calquer-logo/` : 52 fichiers de manipulation SVG
- Dossier `documentation/` : 59 fichiers

---

## 24. Fonctionnalités qui semblent terminées

Vérifié en lisant le code derrière les composants, pas seulement leur existence.

✅ **Authentification & rôles** — connexion PIN, détection de rôle, blocage d'accès, écrans de garde,
déconnexion, purge de session PWA
✅ **Impersonation** — chaîne complète sur 4 niveaux, pile de retour, badges, contexte de retour
✅ **CRM leads** — chargement, filtres, tri, sélection, transfert, suppression, statuts, mode travail
avec undo/redo, colonnes personnalisées, vues desktop et mobile
✅ **Import CSV/Excel** — parseur, mapping, normalisation, déduplication fichier + base, lots,
historique
✅ **Vendeurs** — création, liste, commentaires, chat, configuration des colonnes
✅ **Propositions de RDV** — proposition, acceptation, contre-proposition, replanification, chaînage,
traitement, filtres, actions en masse, marqueurs « vu »
✅ **Agenda** — 3 vues, fuseaux horaires, rafraîchissement à l'heure, agenda perso et équipe
✅ **Messagerie** — 5 canaux, fichiers, audio, realtime, non-lus, envoi optimiste, suppression logique
✅ **Notifications in-app** — hub topbar, cartes réordonnables et masquables, notifications agenda
et RDV
✅ **Thèmes** — 15 thèmes, glass, thèmes personnalisés, portée SA/société, cache anti-FOUC
✅ **Éditeur visuel** — zones, textes, typographie, boutons, cartes, images, sessions persistées
✅ **Sauvegarde / restauration** — export JSON, restauration ordonnée, contrôle des FK, simulation,
nettoyage des orphelins
✅ **Documentation CRM** — 59 fichiers, export/import JSON v1 et v2, introspection de la base
✅ **Site builder** — 9 templates, studio complet, publication par slug
✅ **Réponse automatique IA** — garde-fous complets (anti-boucle, anti-doublon, opt-in par lead)
✅ **PWA** — manifest, service worker, installation, shell mobile, push
✅ **Multi-tenant côté application** — `company_id` propagé dans toutes les requêtes frontend

---

## 25. Fonctionnalités qui semblent partielles

⚠️ **Déconnexion automatique configurable** — l'UI et le hook existent, mais la table
`session_timeout_settings` n'est créée nulle part. La valeur retombe systématiquement sur 90 minutes.

⚠️ **Démo live** — l'émetteur, le récepteur, les overlays de curseur/tap, l'invitation et le
sélecteur d'appareil sont écrits, mais les politiques RLS de `demo_sessions` testent
`app_metadata.is_super_admin`, clé **absente** du JWT → le Super Admin ne peut ni créer, ni lire,
ni mettre à jour une session. La fonctionnalité ne peut pas démarrer.

⚠️ **Journalisation IA** — `ai_conversation_logs` et `ai_tool_logs` sont écrits par les Edge
Functions (service role, donc OK) mais leurs politiques SA souffrent du même `is_super_admin` ;
aucun écran ne les exploite côté `src/` (0 référence).

⚠️ **Onglet « Tuto »** — présent dans les 4 sidebars, rendu = `« Tuto - Contenu a venir »`.

⚠️ **Achat de domaine** — techniquement fonctionnel (API registrar Vercel) mais
`payment_status = 'super_admin_dev_manual'` : **aucun paiement client**, la marge est calculée
sans être facturée.

⚠️ **Manifest PWA dynamique** — `pwa-manifest` est déployable mais `index.html` pointe en dur vers
le manifest statique. L'icône par société n'est donc jamais servie.

⚠️ **`recraft-image-fusion`** et **`toggle-admin-access-for-super-admin`** — écrites, jamais appelées.

⚠️ **Tables orphelines** — `admin_logo_ra`, `page_label_overrides`, `domain_pricing_config` (lue
seulement par une Edge Function), `registrar_contact_info` (idem), `registration_requests`
(doublon fonctionnel de `registrations`).

⚠️ **`AppLandingPage.tsx`** — code mort : plus aucun import. Elle affiche « Novigo 3D », vestige
d'un projet antérieur, et c'est ce texte que cherchent encore les tests e2e.

⚠️ **`conversations` / `messages`** — schéma générique de chat créé dès le socle, doublonné depuis
par les tables spécialisées. Peu ou pas exploité.

⚠️ **Company Super Admin** — le panel existe (19 fichiers) mais reste plus léger que les autres
(pas d'éditeur complet, périmètre limité aux admins de la société parente).

⚠️ **`crm_custom_pages`** — table créée et référencée dans 3 fichiers, sans écran de gestion complet.

---

## 26. Problèmes ou risques détectés

### 🔴 Critique

**C1 — `company_logos` n'est jamais créée.**
Plusieurs migrations (`20260529020431`, `20260529023313`, `20260529023415`, `20260529024137`,
`20260529150021`, `20260529152355`, `20260529213923`, `20260529225255`) définissent RLS, realtime
et colonnes de `public.company_logos`, mais **aucune ne contient `CREATE TABLE company_logos`**.
Même constat pour le bucket `company-logos` (politiques présentes, `INSERT INTO storage.buckets`
absent). 5 fichiers `src/` utilisent la table.
→ **`supabase db reset` sur un projet vierge échoue** ; la promesse « projet entièrement
reconstructible » de `README.md` / `SETUP.md` est fausse en l'état.

**C2 — `session_timeout_settings` n'existe dans aucune migration.**
`src/hooks/useSessionTimeout.ts` la lit et l'écrit (4 requêtes). Toutes échouent silencieusement.

**C3 — RLS `is_super_admin` jamais corrigée sur 3 tables.**
La migration `20260526085954` documente le problème (« le JWT du SA contient `role: super_admin`,
pas `is_super_admin` ») et ne corrige que `ai_company_brain`. Restent cassées :
`demo_sessions` (4 politiques), `ai_conversation_logs` (2), `ai_tool_logs` (2).

### 🟠 Important

**I1 — `statuts.nom` est UNIQUE global.**
Jamais scopé sur `company_id` alors que la colonne a été ajoutée. Deux sociétés ne peuvent pas avoir
un statut du même nom. Le frontend ne vérifie l'unicité que dans sa propre société
(`Statuts.tsx:50`), l'échec remonte en message générique « Erreur lors de la création ».
Même problème sur `vendors.email` (UNIQUE global).

**I2 — `seed.sql` incohérent avec le multi-tenant.**
`INSERT INTO statuts (nom, couleur) … ON CONFLICT (nom)` : les statuts semés n'ont pas de
`company_id` et sont donc invisibles dans tous les panels (qui filtrent sur `company_id`).

**I3 — Realtime non filtré côté serveur.**
Le canal `leads` diffuse les changements de **toutes** les sociétés ; le filtre est en JavaScript
(`useCrmData.ts`). Même schéma pour `client_messages`, `statuts`, `rdv_proposals`.
→ fuite de données et charge réseau inutile.

**I4 — Aucune pagination.**
`useCrmData` charge l'intégralité des leads de la société en mémoire, filtre et trie côté client.
Au-delà de quelques milliers de leads, la vue devient inutilisable.

**I5 — Documentation désynchronisée du code.**
- `EXPORT_GUIDE.md` : « There are 18 edge functions » → il y en a **29**
- `SETUP.md` : décrit un CORS restreint via `ALLOWED_ORIGINS` → **aucune fonction ne lit cette
  variable**, toutes renvoient `Access-Control-Allow-Origin: "*"`
- `SETUP.md` ne documente que 2 Edge Functions sur 29
- `SETUP.md` §4 « Edge Function Protection (already implemented) » affirme une protection par rôle
  admin qui n'existe pas sur `vectorize-logo` ni `segment-logo-zones`

**I6 — Tests e2e vraisemblablement cassés.**
`e2e/helpers/auth.ts` et `health-check.spec.ts` attendent « Novigo 3D » sur la page d'accueil ;
`App.tsx` rend `TalvexOfficialTemplate`. `AppLandingPage.tsx` (qui contient ce texte) n'est plus
importée.

**I7 — Pas de routeur : aucune URL profonde.**
Rafraîchir la page ramène toujours à l'onglet par défaut ; le bouton retour du navigateur quitte
l'application ; impossible de partager un lien vers une vue ; l'impersonation est perdue au reload.

### 🟡 À améliorer

**A1 — 71 `console.log` dans les Edge Functions**, dont `update-user-password` qui journalise
`callerId`, `email`, `lead_id` et l'existence d'un mot de passe. Les logs Supabase sont consultables
par toute personne ayant accès au dashboard. (21 `console.log` également dans `src/`.)

**A2 — Duplication massive dans les Edge Functions** : `buildBrainSystemPrompt()` existe en 3
exemplaires, `corsHeaders` en 29, le bloc d'authentification en ~25. Aucun dossier `_shared/`.

**A3 — ~4,2 Mo d'images probablement inutilisées** dans `public/` :
`image.png` (1,68 Mo), `Gemini_Generated_Image_6zu5ju6zu5ju6zu5.png` (1,47 Mo),
`logo_BW_transparent_4K.png` (1,08 Mo) — servies telles quelles.

**A4 — Artefact Vite versionné** : `vite.config.ts.timestamp-1778013638492-c311154d06829.mjs`.

**A5 — Modèle de données `leads` hybride** (colonnes structurées + `data jsonb`) : chaque lecture
enchaîne des `??` sur 3 variantes de clés. Source de bugs silencieux.

**A6 — 44 fichiers écrivent dans `localStorage`** avec des conventions de clés hétérogènes
(`crm_*`, `tlx_*`, `talvex_*`) et aucune purge à la déconnexion → fuite de préférences entre comptes
sur un poste partagé.

**A7 — Aucune CI**, aucun test unitaire, aucun test de RLS, aucune vérification
`typecheck` / `lint` automatisée avant déploiement.

**A8 — Aucun découpage de bundle explicite** au-delà des `React.lazy` par vue ; les 15 jeux de
tokens de thème (~90 Ko) sont importés statiquement.

**A9 — Le `data jsonb` des leads et les prompts IA ne sont pas assainis** avant d'être injectés dans
le prompt système DeepSeek → risque d'injection de prompt par un lead importé.

**A10 — `demo_sessions` utilise `text` pour `super_admin_id`, `target_user_id`, `company_id`**
au lieu de `uuid`, avec des casts `auth.uid()::text` dans les politiques.

### 🟢 Correct

- Discipline de taille des fichiers remarquable (8 dépassements sur 927 fichiers) avec outillage dédié
- TypeScript `strict` avec **0 erreur `tsc`**, **0 erreur/warning ESLint**, **1 seul `any`**
- Migrations idempotentes et documentées en en-tête (intention, tables, sécurité, notes)
- Aucun secret en dur : le scan des motifs `eyJ…`, `sk-…`, `api_key = "…"` sur `src/`, `supabase/`,
  `scripts/`, `e2e/`, `public/` ne remonte **rien**
- `.env` correctement ignoré par git et ne contenant que des clés publiques
- Le `SUPABASE_SERVICE_ROLE_KEY` n'apparaît que dans les Edge Functions, jamais côté client
- Séparation nette des couches (contexts / hooks / lib / pages / components)
- Gestion d'erreurs réseau soignée dans le chat (envoi optimiste, `_failed`, réessai)
- `ErrorBoundary` global
- Anti-FOUC de thème traité au niveau `index.html`
- Service worker en network-first avec exclusion correcte des routes d'API

---

## 27. Les problèmes de sécurité

> Aucun secret n'est reproduit ici. Seuls les fichiers concernés et la nature du problème sont
> indiqués.

### 🔴 S1 — Le mot de passe en clair est écrit dans `user_metadata`

**Fichiers** : `src/components/LoginModal.tsx` (après authentification réussie),
`supabase/functions/create-user/index.ts`, `supabase/functions/update-user-password/index.ts`.

Le PIN saisi est réécrit tel quel dans `user_metadata.pin` à chaque connexion et à chaque
création/modification de compte. Or **`user_metadata` est inclus dans le JWT Supabase**.
Conséquence : le mot de passe en clair circule dans le token d'accès, est stocké dans
`sessionStorage`, et est lisible par tout script exécuté dans la page (dépendance compromise,
extension de navigateur, XSS). Il est en outre exposé par l'Edge Function `get-user-pin`.

### 🔴 S2 — Mots de passe en clair stockés en base

**Fichiers** : `supabase/migrations/20260317042359_000000_full_schema.sql` — colonnes
`registrations.password`, `registration_requests.password`, `vendors.password` (type `text`) ;
`src/components/RegisterModal.tsx` qui insère le PIN en clair.

Politiques RLS associées : `registrations` accepte l'INSERT en `anon` et le SELECT pour tout
`authenticated` ; `registration_requests` a `USING (true)` sur SELECT / UPDATE / DELETE.
→ **N'importe quel compte connecté (y compris un client) peut lire les mots de passe de toutes les
inscriptions en attente et de tous les vendeurs, toutes sociétés confondues.**

### 🔴 S3 — La RLS n'applique aucun cloisonnement multi-tenant sur le socle CRM

**Fichiers** : `supabase/migrations/20260317042359_000000_full_schema.sql` et `20260324012516`.

Les politiques des tables `leads`, `vendors`, `client_messages`, `rdv_proposals`, `conversations`,
`messages`, `statuts`, `import_history`, `vendor_comments`, `vendor_admin_messages` sont de la
forme :

```sql
CREATE POLICY "…" ON leads FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
```

C'est-à-dire : **tout utilisateur authentifié, quels que soient son rôle et sa société, peut lire,
insérer, modifier et supprimer les lignes de toutes les sociétés.** L'isolation repose uniquement
sur le `.eq('company_id', …)` du frontend, contournable en appelant l'API REST Supabase directement
avec la clé anon (publique par nature) et un simple compte client.

La migration `20260515095456` qui a introduit `company_id` indique explicitement
« *No RLS changes on existing tables* » : le durcissement était prévu pour « plus tard » et n'a
jamais été fait.

**C'est le risque le plus grave du projet** et le prérequis absolu à toute mise en production SaaS.

### 🔴 S4 — `update-user-password` : prise de contrôle de compte inter-société

**Fichier** : `supabase/functions/update-user-password/index.ts`.

Le contrôle de périmètre n'est implémenté que pour les rôles `vendor` (propriété du lead) et
`company_super_admin` (société parente). Pour `admin` et `super_admin`, **aucune vérification** :
il suffit de fournir `auth_user_id` — ou même seulement `email`, la fonction faisant alors un
`admin.listUsers()` global — pour réinitialiser le mot de passe de **n'importe quel utilisateur de
n'importe quelle société**, y compris un autre admin. Combiné à S3 (qui permet de lister les
utilisateurs des autres sociétés), un admin peut prendre le contrôle de tout le parc.

### 🟠 S5 — Authentification limitée à un PIN de 6 chiffres

`update-user-password` impose `/^\d{6}$/`. L'espace de recherche est de 10⁶, sans MFA, sans
verrouillage applicatif après échecs, sans limitation de débit côté application.
`SETUP.md` le signale d'ailleurs comme point à traiter avant production.

### 🟠 S6 — CORS totalement ouvert sur les 29 Edge Functions

`Access-Control-Allow-Origin: "*"` partout, y compris sur les fonctions à privilèges
(`create-user`, `delete-admins`, `update-user-password`, `domain-registrar`).
`ALLOWED_ORIGINS` est documenté mais n'est lu nulle part. La documentation affirme donc le contraire
de ce que fait le code.

### 🟠 S7 — Deux Edge Functions sans aucune authentification

`supabase/functions/vectorize-logo/index.ts` et `supabase/functions/segment-logo-zones/index.ts`
n'appellent jamais `auth.getUser()`. Elles consomment des crédits payants (Vectorizer.ai, Replicate)
et acceptent jusqu'à 10 Mo d'image. → abus de coût par un tiers anonyme, et exfiltration du solde
de crédits (`action=credits`).

### 🟠 S8 — `send-push-notification` : notifications arbitraires vers n'importe qui

`supabase/functions/send-push-notification/index.ts`, branche `type: "message"` : l'appelant
authentifié fournit librement `target_user_id`, `title`, `body` et `url`. Aucun contrôle de relation
entre l'appelant et la cible. → hameçonnage crédible (notification signée « Talvex » pointant vers
une URL arbitraire) vers tout utilisateur abonné.

### 🟠 S9 — Buckets de stockage publics

7 buckets créés, **tous avec `public = true`** : `chat-files` (pièces jointes et messages vocaux
des conversations client/vendeur), `theme-backgrounds`, `editor-backgrounds`, `ai-images`,
`admin-logo-ra`, `admin-logo-library`. Toute personne connaissant ou devinant l'URL d'un objet peut
le télécharger sans authentification. `SETUP.md` le signale pour `chat-files` mais rien n'a été fait.

### 🟠 S10 — `find_duplicate_leads` en `SECURITY DEFINER` avec périmètre optionnel

`supabase/migrations/20260522100754…` : `p_company_id uuid DEFAULT NULL`, et la clause est
`AND (p_company_id IS NULL OR l.company_id = p_company_id)`. Appelée sans argument, la fonction
retourne les leads correspondants **de toutes les sociétés**, en contournant la RLS.

### 🟠 S11 — Identifiants de test par défaut dans le dépôt

`e2e/helpers/auth.ts` : adresses e-mail réelles (dont celle du propriétaire du projet et
`contact@talvex.fr`) associées au PIN de repli `'000000'` pour les 4 rôles.
Si ces comptes existent réellement avec ce PIN, ils constituent une porte d'entrée directe.
`e2e/helpers/createTestAdmin.ts` utilise `'123456'`.

### 🟡 S12 — `get-user-pin` expose le mot de passe par conception

La fonction est correctement contrôlée (SA, CSA dans son périmètre, ou soi-même) mais son existence
même n'est possible que parce que S1 stocke le mot de passe en clair. Elle disparaîtra avec S1.

### 🟡 S13 — Journalisation de données personnelles

`update-user-password`, `chat-auto-reply` et `brainApi.ts` journalisent e-mails, `company_id`,
identifiants de leads et de messages.

### 🟡 S14 — Injection de prompt possible

Le contenu des messages clients et le `business_context_text` du cerveau IA sont concaténés
directement dans le prompt système DeepSeek sans assainissement (`buildBrainSystemPrompt`).
Un lead peut tenter de faire dévier l'assistant automatique.

### 🟢 Points corrects en sécurité

- Aucun secret en dur dans le dépôt (scan complet effectué)
- `.env` ignoré par git, ne contenant que les 4 clés publiques `VITE_*`
- `SUPABASE_SERVICE_ROLE_KEY` confiné aux Edge Functions
- Session en `sessionStorage` (pas `localStorage`), avec purge des tokens hérités et purge complète
  au lancement PWA
- `jwt_expiry` à 1 h + déconnexion par inactivité
- 25 Edge Functions sur 29 vérifient le JWT ; 20 vérifient en plus le rôle
- `talvex-ai-chat` revalide le `company_id` **côté serveur** au lieu de faire confiance au client
- `domain-registrar` : plafond d'achat 200 USD, `expectedPrice` obligatoire, réservé au super admin
- Les tables créées après la bascule multi-tenant ont des politiques correctement scopées sur
  `auth.jwt() -> 'app_metadata' ->> 'company_id'`
- `chat-auto-reply` : garde-fous anti-boucle et anti-doublon solides, IA en opt-in par lead

---

## Ordre de traitement recommandé

Aucun de ces points n'a été corrigé — ce n'est qu'une proposition de priorisation.

1. **S3** — durcir la RLS multi-tenant sur le socle CRM (prérequis absolu à la production)
2. **S1 + S2** — supprimer le stockage du mot de passe en clair (metadata, colonnes, `get-user-pin`)
3. **S4** — contrôle de périmètre sur `update-user-password`
4. **C1 + C2** — rendre la chaîne de migrations rejouable (`company_logos`, `session_timeout_settings`)
5. **S7 + S8 + S6** — authentifier les 2 fonctions ouvertes, restreindre le push, fermer le CORS
6. **C3** — corriger les politiques `is_super_admin` restantes
7. **S9** — passer `chat-files` en privé avec URLs signées
8. **I1 + I2** — scoper `statuts.nom` par société, corriger le seed
9. **I6** — réaligner les tests e2e sur la landing réelle
10. **I4 + I3** — pagination et filtrage realtime côté serveur
