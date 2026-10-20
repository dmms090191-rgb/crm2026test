# CRM Immo — plan du front V1

> Statut : **plan, rien n'est codé.** Établi en lisant le code réel du dépôt,
> pas de mémoire. La couche base est fermée : 4 migrations appliquées,
> fichiers locaux byte-identiques au ledger.

## Le plan en trois phrases

Le droit d'accès, pas le drapeau hidden : l'onglet n'est émis dans la sidebar que si has_crm_immo_access(useCompanyId()) répond oui, et la vraie garde vit dans un case explicite du switch de AdminViewRenderer, confié à une Porte qui rend trois états — chargement, module, refus NOMMÉ — parce que le default: ligne 119 ouvre le Dashboard sans un mot et qu'un retour null serait indiscernable d'un bug d'affichage. L'ordre des étapes fait descendre le risque : on relève d'abord la ligne de base du typecheck (196 erreurs, mesurée), on écrit la Porte et on la prouve par un forçage sessionStorage AVANT que l'onglet n'existe, on teste le bouton « Par défaut » chez Bellisimmo avant d'écrire une ligne du module, puis seulement on construit tableau, écritures, colonnes, cloche, mobile, et Talixy en dernier. Trois garde-fous sont non négociables et vivent sous scripts/, jamais sous src/ : l'isolation des deux cloches par arités et interdictions de motif, l'arithmétique des alertes (février, J-30, fuseau) dans un modèle pur à horloge injectée, et le déterminisme de l'ordre des colonnes.

---

## 1. Fichiers à CRÉER — 28

### `src/lib/crmImmoAccess.ts`
Modèle PUR du droit : type à 4 états nommés ('inconnu' | 'accorde' | 'refuse' | 'erreur'), fonction lireReponseAcces(data, error) qui porte la règle « seul data === true accorde, une panne réseau n'est pas un refus », et prédicat peutOuvrirCrmImmo(etat).

*Dépend de :* Rien. Aucun import (ni React, ni supabase) — c'est ce qui le rend testable par node --test. Même forme que src/lib/siteContextModel.ts.

### `scripts/crm-immo/acces.test.ts`
Test node --test du modèle d'accès : true→accordé, false→refusé, null→refusé, undefined→refusé, error→PAS accordé, et surtout « inconnu n'est ni accordé ni refusé ».

*Dépend de :* src/lib/crmImmoAccess.ts. Import AVEC l'extension .ts (sinon ERR_MODULE_NOT_FOUND sous node --test, mesuré sur scripts/sidebar-v2/reorderView.test.ts).

### `src/hooks/useCrmImmoAccess.ts`
Unique appel réseau du droit : supabase.rpc('has_crm_immo_access', { p_company_id: companyId }), garde `cancelled`, état initial 'inconnu' (jamais false), et une fonction refresh() exposée.

*Dépend de :* src/lib/crmImmoAccess.ts + useCompanyId(). Patron : src/hooks/useIsWellnessClient.ts (mêmes mécaniques, plus le 3e état qui lui manque).

### `src/pages/admin/views/CrmImmo.tsx`
Vue racine du module : porte un <h1> UNIQUE (« CRM Immo ») et une accroche propre — seul moyen pour un test de la distinguer du Dashboard rendu par le default: du switch. Coquille Talixy selon SystemPage.tsx:43-69. Hauteur par flex-1 min-h-0, jamais h-full.

*Dépend de :* Les hooks et composants de crm-immo/. Au premier commit : coquille avec titre seulement.

### `src/pages/admin/dashboard/CrmImmoGate.tsx`
LA PORTE, seule chose que le switch monte pour 'crm-immo' : 'inconnu' → le rond orange de lazyFallback, 'accorde' → le module, 'refuse'/'erreur' → un panneau de refus NOMMÉ (jamais null, jamais le Dashboard). Porte aussi le lazy(() => import('../views/CrmImmo')).

*Dépend de :* src/lib/crmImmoAccess.ts (type d'état reçu en prop) + src/pages/admin/views/CrmImmo.tsx. Patron : src/pages/company-super-admin/CSATalvexGate.tsx:5 et AppUnauthorizedPage.tsx:8-37.

### `src/pages/admin/views/crm-immo/crmImmoTypes.ts`
Types miroir du schéma (DossierImmo, ColonneImmo, EtatImmo) et constante COLONNES_SYSTEME : les 10 vraies colonnes de crm_immo_dossiers, avec nom marqué non masquable et non supprimable (NOT NULL en base).

*Dépend de :* Rien. Patron : src/pages/admin/views/cabinets/cabinetTypes.ts et crm/types.ts:44-56 (required: true).

### `src/pages/admin/views/crm-immo/crmImmoColonnes.ts`
Modèle PUR des colonnes : fusionner(systeme, perso, ordreMemorise), trier(perso) qui impose position PUIS created_at, reordonner(liste, de, vers), positionsApres(liste) qui rend les LIGNES ENTIÈRES à réécrire.

*Dépend de :* crmImmoTypes.ts uniquement. Aucun import React/supabase.

### `scripts/crm-immo/colonnes.test.ts`
Test node --test : deux colonnes de même position rendent le MÊME ordre à deux lectures (c'est created_at qui tranche) ; positionsApres() rend 0..n-1 sans trou et six champs par ligne ; une colonne système n'est jamais supprimable ; nom n'est jamais masquable, même si l'état mémorisé la liste masquée.

*Dépend de :* crmImmoColonnes.ts + crmImmoTypes.ts.

### `src/lib/crmImmoAlertes.ts`
Modèle PUR de la dérivation : journeeDeReference(instant, fuseau) par Intl.formatToParts, dernierJourDuMois, jourRabattu (31 → 28/29 en février), periodeLoyer('AAAA-MM'), periodeFinContrat('AAAA-MM-JJ'), derive({dossiers, instant, fuseau}), les trois prédicats actives/traitees/toutes et compteBadge.

*Dépend de :* Rien. `instant` et `fuseau` sont des PARAMÈTRES, jamais new Date() interne — sinon le cas du 29 février et celui du fuseau sont intestables. Patron d'horloge injectée : supabase/functions/hostinger-domains/handler.ts:130.

### `scripts/crm-immo/alertes.test.ts`
Test node --test de toute l'arithmétique : jour 31 en février 2026→28, 2028→29, 2100→28, 2000→29 ; jour 31 en avril→30 ; J-30 exactement (pas J-31) ; périodes conformes aux deux expressions du CHECK ; MÊME période pour deux fuseaux d'utilisateur différents ; sort explicite d'une alerte traitée dont la date a changé.

*Dépend de :* src/lib/crmImmoAlertes.ts.

### `src/pages/admin/views/crm-immo/useCrmImmoDossiers.ts`
Seul endroit qui parle à crm_immo_dossiers : charger (.eq company_id), créer (insert().select().single()), modifier (update + maj optimiste avec retour arrière), supprimer (delete().in().select('id') puis filtrage sur les ids RÉELLEMENT partis).

*Dépend de :* crmImmoTypes.ts, supabase, useCompanyId. Patron : cabinets/useCabinets.ts:42-51 et 71-85 ; retour arrière : crm/useCrmData.ts:143-153.

### `src/pages/admin/views/crm-immo/useCrmImmoColonnes.ts`
CRUD de crm_immo_colonnes, portée SOCIÉTÉ : lecture .order('position').order('created_at') (les DEUX), créer, renommer, masquer, supprimer, réordonner par UN SEUL upsert de lignes entières avec onConflict 'id'. Chaque écriture termine par .select('id') et compare le nombre de lignes rendues à l'attendu.

*Dépend de :* crmImmoColonnes.ts + crmImmoTypes.ts. Patron d'upsert en lot : VisualCustomizeContext.tsx:152. NE PAS copier ContentBlocksView.tsx:160 (N requêtes, résultat jeté).

### `src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts`
État de la cloche : deux selects LÉGERS et NON paginés au montage (dossiers : id, nom, prenom, date_fin_contrat, jour_encaissement ; états), rangés dans des refs ; setInterval(60_000) qui RE-DÉRIVE sans requête ; refetch réseau à l'ouverture du module, au retour de visibilité de l'onglet et toutes les 5 min. Expose alertes, compteBadge, filtre, marquerLue, marquerTraitee, recharger.

*Dépend de :* src/lib/crmImmoAlertes.ts + supabase. Patron : useAgendaNotifications.ts:62-83 (dérivation) et 171-174 (intervalle qui ne requête pas). N'importe AUCUN hook de notification générale.

### `src/pages/admin/views/crm-immo/CrmImmoCloche.tsx`
Cloche DÉDIÉE du module : bouton + pastille, panneau des alertes, filtres Actives / Traitées / Toutes, actions « marquer lue » et « traiter ». Vit dans le dossier du module, pas dans components/topbar/ ni components/notifications/.

*Dépend de :* useCrmImmoAlertes.ts + useThemeTokens() (Talixy suit alors sans aucune branche conditionnelle, themeTokens.ts:44).

### `scripts/crm-immo/clocheIsolation.test.ts`
LE garde-fou exigé par David : non-mélange des deux cloches dans les DEUX sens, par arités et interdictions de motif sur le texte source.

*Dépend de :* CrmImmoCloche.tsx, useCrmImmoAlertes.ts, et les 7 fichiers de la cloche générale. Helper `read` copié de scripts/system/suppressionSysteme.test.ts:14.

### `src/pages/admin/views/crm-immo/CrmImmoTable.tsx`
Tableau DESKTOP : <div className="hidden md:block overflow-x-auto"> + <table>, couleurs uniquement par tokens.table.*, tri par <button> dans le <th>, première colonne = le nom, data-tx-table pour hériter de l'habillage Talixy.

*Dépend de :* crmImmoColonnes.ts (ordre des colonnes) + useCrmImmoDossiers.ts. Forme de DOM imposée par talixyUI.css:748-834 ; seul porteur actuel : SASuperAdminsTable.tsx:38-139.

### `src/pages/admin/views/crm-immo/CrmImmoCards.tsx`
Présentation MOBILE en fiches : <div className="md:hidden divide-y">, une carte par dossier (en-tête nom + bouton Actions, puis grille grid-cols-2 de paires libellé/valeur). LIT la configuration de colonnes au lieu de coder les champs en dur.

*Dépend de :* crmImmoColonnes.ts. Patron : CSAAdminsTables.tsx:170-231. Contre-exemple à ne pas suivre : CrmMobileLeadCard.tsx:57-60 (champs en dur).

### `src/pages/admin/views/crm-immo/CrmImmoFilters.tsx`
Recherche, tri, filtres de champ, et le filtre d'alertes Actives / Traitées / Toutes. Composant présentatif : reçoit valeurs et setters, l'état reste dans le hook.

*Dépend de :* useCrmImmoDossiers.ts (filtrage client, chaîne .filter().sort() comme useCrmData.ts:187-211). Recopie inputStyle et data-tx-filters de ListFilters.tsx:57 et 60 SANS modifier ListFilters.

### `src/pages/admin/views/crm-immo/CrmImmoDossierModal.tsx`
Modale de création ET de modification (dossier à null = création) : nom obligatoire, jour_encaissement 1-31, bouton désactivé tant que c'est invalide, erreur serveur en bloc bas. Validation DOUBLE, formulaire + hook.

*Dépend de :* useCrmImmoDossiers.ts. Patron : CabinetCreateModal.tsx:51-73 + CabinetNameForm.tsx:60-63 et 71.

### `src/pages/admin/views/crm-immo/CrmImmoDeleteModal.tsx`
Confirmation de suppression d'un dossier : nomme ce qui part, bouton rouge « Supprimer définitivement », désactivé pendant l'opération, erreur affichée dans la modale.

*Dépend de :* useCrmImmoDossiers.ts. Copie de cabinets/CabinetDeleteModal.tsx (seule suppression confirmée du panel Société).

### `src/pages/admin/views/crm-immo/CrmImmoColonnesModal.tsx`
Organisateur de colonnes du module : ajouter, renommer en place, réordonner (glisser-déposer ET chevrons), masquer, réafficher, supprimer avec confirmation inline. COPIE de TabColumns.tsx, pas une extension.

*Dépend de :* useCrmImmoColonnes.ts + CrmImmoColonneRow.tsx + CrmImmoAjouterColonneForm.tsx. Copie nécessaire : ColumnOrganizerModal est monté par Crm.tsx:236, SACrmSociete.tsx:215, SAAdmins.tsx:272 et VendorLeads.tsx:285.

### `src/pages/admin/views/crm-immo/CrmImmoColonneRow.tsx`
Une ligne de l'organisateur : dérive tout de deux drapeaux (système → badge cadenassé, aucun bouton Supprimer ; nom → aucun bouton Masquer). Chevrons monter/descendre obligatoires, seul moyen de réordonner au doigt.

*Dépend de :* crmImmoTypes.ts. Patron : TabColumnRow.tsx:71-76, 120-130, 182-197, 201-216.

### `src/pages/admin/views/crm-immo/CrmImmoAjouterColonneForm.tsx`
Formulaire d'ajout de colonne : nom + type parmi les QUATRE valeurs que la base accepte ('texte','nombre','date','oui_non'), avec refus local d'un nom déjà pris (insensible à la casse et aux espaces de bord).

*Dépend de :* useCrmImmoColonnes.ts. FIELD_TYPES (columnModalTypes.ts:12-15) ne connaît que text et url : ne PAS l'étendre.

### `scripts/crm-immo/sidebarCrmImmo.test.ts`
Test node --test du choix de conception sidebar : (1) 'crm-immo' n'apparaît PAS dans une déclaration inconditionnelle de LAYOUT_SECTIONS, et jamais avec hidden:true ; (2) sans droit l'entrée n'est pas émise ; (3) avec droit reconcileLayout l'ajoute à une config déjà enregistrée ; (4) defaultEntries(sections_avec_droit) — ce que « Par défaut » pose dans le brouillon — contient toujours l'entrée VISIBLE ; (5) ICONS contient bien la clé 'crm-immo'.

*Dépend de :* src/lib/sidebarLayout.ts (défauts et reconcileLayout) + lecture du texte de Sidebar.tsx. Patron de lecture de source : scripts/site-interface/siteTabDefault.test.ts:9-20.

### `scripts/crm-immo/theme.test.ts`
Test node --test par readFileSync sur CrmImmo.tsx et tous les fichiers de crm-immo/ : échoue si un hexadécimal ou rgba() est codé en dur, si une classe de couleur Tailwind (text-white, bg-slate-*, text-gray-*) apparaît, si 'md:hidden' est absent, ou si h-full / height: 100% est présent.

*Dépend de :* Les fichiers du module. Technique : scripts/talixy/talixyClair.test.ts:6,16.

### `e2e/crm-immo-acces.spec.ts`
Les deux preuves d'accès de bout en bout : avec le compte e2e par défaut (Société « David Schemmama », AUCUNE ligne crm_immo_acces, vérifié en base) l'entrée est absente de la barre latérale ET une ouverture forcée donne l'écran de refus nommé, pas le Dashboard ; avec Bellisimmo l'entrée existe et mène au titre du module.

*Dépend de :* e2e/helpers/auth.ts (connectAdmin). Le test positif exige E2E_ADMIN_EMAIL=<e-mail de l administratrice>. Patron : e2e/cabinets.spec.ts:43-55 (ouverture de la barre sur petit écran, onglet neuf EN BAS).

### `e2e/crm-immo.spec.ts`
Parcours réel chez Bellisimmo : ajout d'un dossier vérifié EN BASE, modification, suppression confirmée vérifiée en base, recherche/tri/filtres, et relevé que la cloche CRM Immo compte pendant que la cloche générale ne bouge pas. Préfixe [TEST], nettoyage en afterAll.

*Dépend de :* e2e/helpers/auth.ts + e2e/helpers/boutique3d.ts (aides session/rest qui interrogent la base). Patron : e2e/cabinets.spec.ts (147 lignes, mode serial).

### `src/pages/superadmin/views/admins/SAAdminsCrmImmoSwitch.tsx`
LA BASCULE D'OCTROI, côté Talvex uniquement : reçoit companyId + état et fait un UPSERT sur crm_immo_acces (PK company_id, avec active, accorde_le, accorde_par). Rendue comme une colonne de la liste des Sociétés.

*Dépend de :* La policy « SA manage all crm immo access » (FOR ALL, super_admin) : lecture et écriture directes depuis le navigateur, AUCUNE fonction edge à toucher. Patron : SAAdminsAiSwitch.tsx:11-33.

---

## 2. Fichiers à MODIFIER — 13

La colonne qui compte est la dernière : **ce qui casse en silence**. Sur ce
projet, `npm run build` vaut `vite build` seul, sans `tsc` — donc un oubli de
type passe le build ET Vercel.

### `src/pages/admin/adminDashboardTypes.ts`
**Lignes :** 55 (dernier membre : « | 'cabinet'; »)

**Modification :** Ajouter « | 'crm-immo' » et déplacer le point-virgule sur la nouvelle dernière ligne. C'est ici que l'identifiant est fixé une fois pour toutes.

**Casse en silence si :** L'identifiant diffère d'un seul caractère entre ce fichier, les sections de la sidebar, ICONS et le case du switch : l'onglet s'affiche et ouvre le Dashboard, sans erreur. Tant que cette ligne n'existe pas, le garde-fou de BREADCRUMB_LABELS n'est pas armé du tout.

### `src/pages/admin/adminDashboardConstants.ts`
**Lignes :** 31 (« 'cabinet': 'Cabinets', »), accolade fermante 32

**Modification :** Ajouter « 'crm-immo': 'CRM Immo', » après la ligne 31. Dans le MÊME commit que la modification précédente.

**Casse en silence si :** DÉFAUT SILENCIEUX N°2. BREADCRUMB_LABELS est Record<ActiveView, string> : une clé manquante est une erreur TS2741, mais « npm run build » vaut « vite build » SEUL (package.json:9) et « typecheck » est un script séparé (package.json:12). Le build passe, Vercel déploie, et AdminDashboard.tsx:123 rend undefined dans le fil d'Ariane. Avec 196 erreurs de base, l'oubli se noie : il faut comparer les LISTES, pas les nombres.

### `src/pages/admin/dashboard/AdminViewRenderer.tsx`
**Lignes :** 8-14 (bloc d'import), 20-53 (interface Props), après 117 (case 'cabinet') et AVANT 119 (default:)

**Modification :** (a) importer CrmImmoGate depuis './CrmImmoGate' ; (b) ajouter à Props un champ portant l'état du droit, à côté de isSAViewing (27) ; (c) insérer « case 'crm-immo': return <CrmImmoGate acces={...} />; » entre la ligne 117 et la ligne 118. Le case existe TOUJOURS, dans les trois états : c'est la Porte qui décide, pas le switch.

**Casse en silence si :** DÉFAUT SILENCIEUX N°1, le pire. La ligne 119 est « default: return <VueEnsemble .../> ». Sans le case, l'onglet s'ouvre et affiche le Dashboard : aucune erreur console, aucune erreur de build, Vercel déploie. Et si le garde prend la forme « return droit ? <Module/> : null » (patron ClientDashboard.tsx:140), un refus rend une zone principale VIDE sous un fil d'Ariane « CRM Immo » — indiscernable d'un bug d'affichage. Un case conditionnel qui retomberait dans le default serait un refus déguisé en réussite.

### `src/pages/admin/AdminDashboard.tsx`
**Lignes :** 51 (« const companyId = useCompanyId(); »), bloc 58-67 (les autres hooks), bloc 158-174 (<Sidebar>), bloc 251-280 (<AdminViewRenderer>)

**Modification :** Appeler useCrmImmoAccess(companyId) UNE SEULE FOIS, dans le bloc des hooks, en réutilisant le companyId de la ligne 51 — c'est lui qui vaut la Société VISUALISÉE en Visu (AppDashboardRouter.tsx:147 + CompanyIdContext.tsx:27). Descendre LE MÊME état en prop à <Sidebar> (à côté de canHideTabs, ligne 171) ET à <AdminViewRenderer> (à côté de isSAViewing, ligne 258). Ne RIEN changer d'autre : ni le cast ligne 241, ni les classes de <main> (242-249).

**Casse en silence si :** Descendre vers la sidebar et oublier le renderer = l'onglet disparaît mais la vue reste ouvrable par setActiveView (deux chemins mesurés : canal démo ligne 241, sessionStorage useAdminDashboardEffects.ts:37). L'inverse = onglet visible chez tout le monde qui affiche un refus. Aucun des deux ne lève d'erreur. Appeler le hook deux fois (sidebar + renderer) crée DEUX vérités du droit : panne intermittente, donc indiagnosticable.

### `src/pages/admin/Sidebar.tsx`
**Lignes :** 6 (import lucide), 90-115 (ICONS, 'cabinet' en 93), 22-38 (SidebarProps) et 117 (signature), 131 (« const sections = useMemo(() => LAYOUT_SECTIONS, []) »), 179 (« !layout.loaded »)

**Modification :** (a) importer une icône lucide LIBRE — Building2, Home, KeyRound et BedDouble le sont ; Store et Briefcase sont pris. (b) Ajouter « 'crm-immo': <Building2 className="w-4 h-4" />, » à ICONS. (c) Ajouter la prop du droit à SidebarProps et à la signature. (d) Ligne 131 : useMemo dépendant du SEUL booléen, qui rend LAYOUT_SECTIONS tel quel sans le droit, et une copie où le compartiment « Gestion des leads » reçoit { id: 'crm-immo', label: 'CRM Immo' } après 'crm' (68) avec le droit — SANS hidden. (e) Ligne 179 : « !layout.loaded » devient « !layout.loaded || !resolu ». NE PAS toucher LAYOUT_SECTIONS (51-88) ni sectionColorById (144-155).

**Casse en silence si :** DÉFAUT SILENCIEUX N°3 : ICONS est Record<string, React.ReactNode> (ligne 90), pas Record<ActiveView,...> — une icône oubliée ne lève RIEN et AdminSidebarItem.tsx:52 rend un <span> vide, libellé décalé. DÉFAUT SILENCIEUX N°4 : déclarer hidden:true serait un auto-remasquage — « Par défaut » (SidebarLayoutControls.tsx:227) n'est garde par RIEN, resetToDefault fait setDraft(defaults) (useSidebarLayout.ts:204) et confirmReorder écrit « const next = draft » sans aucune fusion (ligne 183) ; deux clics et Ruth perd son module, en base. Tableau construit inline au lieu d'un useMemo stable : `defaults` change d'identité à chaque rendu (ligne 113), l'effet de chargement (165) se relance en boucle — invisible à l'écran, visible seulement au réseau. Ligne 179 oubliée : une validation pendant la fenêtre « droit non résolu » écrit le blob SANS 'crm-immo' et l'onglet revient ensuite EN FIN de liste (sidebarLayout.ts:156-157).

### `src/pages/superadmin/views/admins/SAAdmins.tsx + SAAdminsDesktopTable.tsx + SAAdminMobileCard.tsx`
**Lignes :** SAAdmins.tsx:19-30 (colonnes, { key: 'ia', required: true } en 29) et 32-46 (interface AdminUser) ; SAAdminsDesktopTable.tsx:102-103 ; SAAdminMobileCard.tsx:91-92

**Modification :** Ajouter une colonne « CRM Immo » à la liste des Sociétés du panel Talvex, une cellule à côté de SAAdminsAiSwitch, et monter SAAdminsCrmImmoSwitch. L'état de départ se lit en UNE requête client sur crm_immo_acces. AUCUN nouvel onglet Talvex, AUCUNE fonction edge à modifier.

**Casse en silence si :** (1) Attendre l'état de list-admins : la fonction edge ne renvoie pas crm_immo_acces, le champ resterait undefined et la bascule afficherait « désactivé » pour TOUT LE MONDE, en silence. (2) Un .update() sur une Société qui n'a jamais eu de ligne touche 0 ligne et ne lève AUCUNE erreur : c'est un upsert sur la PK company_id, obligatoirement. (3) Joindre crm_immo_acces à public.companies pour obtenir un nom : la RLS de companies ne rend qu'UNE ligne à un company_super_admin et vide le résultat sans erreur (mesure : 1 ligne, « Johanna Boutique »).

### `src/pages/admin/views/sauvegarde/restoreConstants.ts`
**Lignes :** 7-32 (CRM_BACKUP_TABLES) ET 46-79 (RESTORE_ORDER) — les DEUX, sinon rien

**Modification :** Ajouter crm_immo_dossiers, crm_immo_colonnes, crm_immo_etats en catégorie 'crm' dans CRM_BACKUP_TABLES, et les ajouter AUSSI dans RESTORE_ORDER avec dossiers AVANT etats. NE PAS ajouter crm_immo_acces.

**Casse en silence si :** Les deux listes sont maintenues à la main : l'export boucle sur CRM_TABLE_NAMES (ligne 42, via useExportCrm.ts:35), la restauration sur RESTORE_ORDER (useRestoreCrm.ts:121 et 196). Une table ajoutée à la première et oubliée dans la seconde est SAUVEGARDÉE puis JAMAIS RESTAURÉE, et le rapport ne la mentionne même pas : la sauvegarde paraît complète et CRM Immo revient vide. Inversement, etats placée avant dossiers échoue en 23503 (clé étrangère composée). Et crm_immo_acces ne doit jamais être sauvegardée : useRestoreCrm.ts:214-216 RÉÉCRIT company_id avec la Société de destination — une sauvegarde de Bellisimmo restaurée ailleurs accorderait le module à la voisine.

### `src/pages/admin/views/sauvegarde/useRestoreCrm.ts`
**Lignes :** 12-17 (TABLES_WITH_COMPANY_ID)

**Modification :** Ajouter les trois tables crm_immo_* à l'ensemble, puisqu'elles portent toutes company_id.

**Casse en silence si :** Oubliées ici mais présentes dans RESTORE_ORDER : l'upsert (218-221) renvoie les lignes avec leur company_id d'origine, la RLS refuse (42501) — bruyant, donc pas le pire. Le pire : restaurer les dossiers SANS les colonnes laisse un tableau dont toutes les colonnes perso ont disparu alors que leurs valeurs sont toujours dans le jsonb, inertes.

### `src/pages/admin/dashboard/useAdminDashboardEffects.ts`
**Lignes :** 37 (« setActiveView(ctx.fromTab as ActiveView) »)

**Modification :** ARBITRAGE (voir plus bas) : valider ctx.fromTab contre la liste réelle des ActiveView avant de l'appliquer, repli sur 'vue-ensemble'. Utile à tous les onglets, donc à faire en DERNIER et seul dans son commit.

**Casse en silence si :** Sans cette validation, déposer {"fromRole":"admin","fromTab":"crm-immo","scrollY":0} dans sessionStorage ouvre la vue au prochain montage, sans passer par la sidebar et AVANT que le droit ne soit connu. Le garde du renderer refuse quand même — c'est pour cela qu'il doit être là et pas dans la sidebar — mais le panel se lève sur un écran de refus, symptôme déroutant. Et si quelqu'un allège un jour le garde, cette ligne redevient une porte ouverte.

### `src/pages/admin/TopBar.tsx`
**Lignes :** 127 (const totalNotifCount = ... 8 signes « + »)

**Modification :** AUCUNE. Cette ligne reste identique au caractère près. Aucun compteur CRM Immo n'arrive jamais en prop de TopBar.

**Casse en silence si :** Un 10e terme ajouté à la somme contamine la pastille mobile de la cloche générale. Rien ne l'empêche techniquement, et tant que les compteurs valent zéro l'erreur est INVISIBLE à l'écran : aucun test de parcours ne la verrait. Seul scripts/crm-immo/clocheIsolation.test.ts l'attrape.

### `src/pages/admin/components/topbar/AdminNotificationCards.tsx + AdminNotificationsHub.tsx + AdminMobileBellMenu.tsx + src/hooks/useNotifCardOrder.ts + src/components/notifications/hub/NotifHubShell.tsx`
**Lignes :** AdminNotificationCards.tsx:7-11 (union NotifCategory) et 23-33 (CARDS, 9 entrées) ; AdminMobileBellMenu.tsx:121-129 ; useNotifCardOrder.ts:59-62 (DEFAULT_KEYS) ; NotifHubShell.tsx:88-90

**Modification :** AUCUNE dans aucun des cinq. Si la cloche CRM Immo réutilise NotifHubShell pour le rendu, elle lui passe UNIQUEMENT ses propres cartes. Si elle doit être réorganisable, useNotifCardOrder accepte déjà options.concept (75-81) : un concept propre, sans toucher DEFAULT_KEYS.

**Casse en silence si :** NotifHubShell.tsx:88-90 est un reduce : « cards={[...CARDS, carteCrmImmo]} » fusionne les deux compteurs en un seul chiffre, sans erreur, sans différence visuelle — c'est l'accident le plus naturel, on croit « réutiliser le design ». Les mêmes 9 catégories sont énumérées en dur dans QUATRE endroits indépendants qui ne se surveillent pas. Et une clé ajoutée à DEFAULT_KEYS se figerait en localStorage (ligne 27) et SURVIVRAIT au correctif jusqu'à purge du cache.

### `src/hooks/useSidebarLayout.ts + src/components/sidebar-v2/SidebarLayoutControls.tsx`
**Lignes :** useSidebarLayout.ts:183 et 204 ; SidebarLayoutControls.tsx:227

**Modification :** AUCUNE. Ne pas « réparer » resetToDefault ni confirmReorder, et ne pas garder le bouton « Par défaut » par canHide dans ce chantier.

**Casse en silence si :** Ces fonctions sont partagées par les QUATRE panels (admin, vendor, company_super_admin, super_admin) : les toucher serait précisément le mécanisme par lequel CRM Immo changerait l'état d'autres onglets. Le bug réciproque reste ouvert (une Société peut ressusciter un onglet que Talvex avait masqué, ce qui contredit le commentaire SidebarLayoutControls.tsx:38-43) : c'est un chantier à part, à arbitrer, pas en passant.

### `src/components/table/ (ColumnOrganizerModal.tsx, TabColumns.tsx, TabColumnRow.tsx, AddColumnForm.tsx, columnModalTypes.ts, useColumnOrder.ts, mobileColumnTypes.ts) + src/hooks/useCustomColumns.ts + src/components/filters/ListFilters.tsx`
**Lignes :** aucune

**Modification :** AUCUNE. À LIRE comme patron et à COPIER dans le dossier du module. La tentation d'ajouter une prop (fieldTypes paramétrable, persistance injectée) doit être refusée à ce stade.

**Casse en silence si :** Une seule valeur ajoutée à FIELD_TYPES (columnModalTypes.ts:12-15, lu par AddColumnForm.tsx:53 et TabColumnRow.tsx:54) fait apparaître « Nombre », « Date », « Oui/Non » dans le formulaire d'ajout de colonne des quatre autres modules, dont la base (custom_columns.field_type) ne les attend pas. ColumnOrganizerModal est monté par Crm.tsx:236, SACrmSociete.tsx:215, SAAdmins.tsx:272, VendorLeads.tsx:285 : toute signature élargie les touche tous. Et le typecheck n'est pas dans le build : une prop manquante passerait Vercel.

---

## 3. Ordre d'implémentation — 17 étapes

Le risque descend : on relève la ligne de base du typecheck, on écrit la
Porte et on la prouve AVANT que l'onglet existe, on éprouve le bouton
« Par défaut » avant d'écrire une ligne du module, puis on construit.

### Étape 1 — Relevé de la ligne de base du typecheck — AVANT toute édition

**Fichiers :** aucun (lecture seule)

**Vérification :** Depuis la racine du dépôt, outil Bash (Git Bash) : npm run typecheck 2>&1 | grep "error TS" | sort > "$TMP/typecheck-avant.txt" ; wc -l < "$TMP/typecheck-avant.txt". Attendu : 196, valeur que j'ai mesurée à l'instant. Ce fichier est la seule référence acceptable pour la suite : on comparera des LISTES par diff, jamais des nombres.

### Étape 2 — Modèle pur du droit + son test — aucune ligne d'interface touchée
📦 commit naturel

**Fichiers :** src/lib/crmImmoAccess.ts, scripts/crm-immo/acces.test.ts

**Vérification :** node --test scripts/crm-immo/acces.test.ts rend un nombre de tests NON NUL et 0 fail (un fichier qui n'a rien exécuté se reconnaît à « tests 1 / fail 1 » avec une trace de résolution de module). Puis diff typecheck-avant / typecheck-apres : VIDE.

### Étape 3 — Armer le garde-fou de type : union ActiveView + BREADCRUMB_LABELS
📦 commit naturel

**Fichiers :** src/pages/admin/adminDashboardTypes.ts:55, src/pages/admin/adminDashboardConstants.ts:31

**Vérification :** diff typecheck-avant / typecheck-apres : VIDE. Les deux éditions dans le MÊME commit : la première seule laisserait le typecheck à 197.

### Étape 4 — LA PORTE AVANT L'ONGLET : vue coquille, Gate, case du renderer, hook descendu — l'onglet n'existe toujours pas dans la sidebar
👁 **David regarde** · 📦 commit naturel

**Fichiers :** src/hooks/useCrmImmoAccess.ts, src/pages/admin/views/CrmImmo.tsx (coquille à titre unique), src/pages/admin/dashboard/CrmImmoGate.tsx, src/pages/admin/dashboard/AdminViewRenderer.tsx, src/pages/admin/AdminDashboard.tsx

**Vérification :** Trois relevés, dans la même session, en forçant l'ouverture par sessionStorage.setItem('crm_connect_return_context', JSON.stringify({fromRole:'admin',fromTab:'crm-immo',scrollY:0})) puis rechargement. (a) Compte par défaut (Société « David Schemmama », aucune ligne crm_immo_acces) : l'ÉCRAN DE REFUS NOMMÉ s'affiche. Un Dashboard = le case manque. Une zone vide = le garde rend null. (b) Ruth / Bellisimmo : le titre « CRM Immo » s'affiche. (c) Onglet Réseau : exactement 1 POST /rest/v1/rpc/has_crm_immo_access au montage. Deux = le hook est appelé deux fois.

### Étape 5 — Figer la preuve d'accès en e2e, avant d'ajouter l'onglet
📦 commit naturel

**Fichiers :** e2e/crm-immo-acces.spec.ts

**Vérification :** npx playwright test e2e/crm-immo-acces.spec.ts passe tel quel avec le compte par défaut (test négatif : entrée absente + ouverture forcée refusée). Puis E2E_ADMIN_EMAIL=<e-mail de l administratrice> pour le test positif.

### Étape 6 — L'onglet dans la sidebar, par le DROIT et pas par hidden
👁 **David regarde** · 📦 commit naturel

**Fichiers :** src/pages/admin/Sidebar.tsx (6, 90-115, 22-38, 117, 131, 179), scripts/crm-immo/sidebarCrmImmo.test.ts

**Vérification :** (a) node --test scripts/crm-immo/sidebarCrmImmo.test.ts : 5 assertions vertes, dont « defaultEntries(sections_avec_droit) contient 'crm-immo' visible » — c'est elle qui prouve que « Par défaut » ne peut plus coûter l'onglet. (b) À l'œil chez Bellisimmo : l'onglet est présent, EN BAS de la barre (normal : reconcileLayout ajoute les items neufs en fin de liste, sidebarLayout.ts:156-157), et son ICÔNE est visible — aucun compilateur ne l'attrape. (c) Chez le compte par défaut : aucune entrée, y compris en mode « Réorganiser ». (d) Journal [SIDEBAR-V2-DEBUG] : UN seul '6a.F5.lecture_brute_supabase' par montage.

### Étape 7 — Test du bouton piégé : « Par défaut » + « Valider » chez Bellisimmo
👁 **David regarde**

**Fichiers :** aucun (relevé seul)

**Vérification :** Chez Ruth : entrer en « Réorganiser », cliquer « Par défaut », « Valider », recharger. Attendu : CRM Immo toujours là, et les autres onglets visibles le sont restés. C'est la mesure qui ferme le défaut silencieux n°4 — à faire AVANT d'écrire une seule ligne du module.

### Étape 8 — L'octroi côté Talvex, et la révocation prouvée
👁 **David regarde** · 📦 commit naturel

**Fichiers :** src/pages/superadmin/views/admins/SAAdminsCrmImmoSwitch.tsx, SAAdmins.tsx, SAAdminsDesktopTable.tsx, SAAdminMobileCard.tsx

**Vérification :** Depuis le panel Talvex, basculer CRM Immo sur une Société qui n'a JAMAIS eu de ligne (preuve de l'upsert) : la ligne apparaît dans crm_immo_acces. Puis basculer Bellisimmo à active=false, rafraîchir le panel de Ruth : l'onglet disparaît ET l'ouverture forcée donne le refus. Remettre true. Relevé fait sous le rôle authentifié, jamais sous execute_sql qui ignore la RLS. Contrôle final : Bellisimmo seule dans crm_immo_acces.

### Étape 9 — Arithmétique des alertes, en pur, avant toute cloche
📦 commit naturel

**Fichiers :** src/lib/crmImmoAlertes.ts, scripts/crm-immo/alertes.test.ts

**Vérification :** node --test scripts/crm-immo/alertes.test.ts : février 2026→28, 2028→29, 2100→28, 2000→29 ; avril→30 ; J-30 oui / J-31 non ; MÊME période pour deux fuseaux différents ; aucune période produite n'échappe aux deux expressions du CHECK. Zéro appel réseau, zéro navigateur.

### Étape 10 — Lecture des dossiers et tableau desktop (lecture seule, aucune écriture)
👁 **David regarde** · 📦 commit naturel

**Fichiers :** src/pages/admin/views/crm-immo/crmImmoTypes.ts, useCrmImmoDossiers.ts, CrmImmoTable.tsx, src/pages/admin/views/CrmImmo.tsx

**Vérification :** Chez Bellisimmo, l'onglet affiche les trois états : roue pendant le chargement, carte « aucun dossier » si la table est vide, bloc rouge si la requête échoue. Relevé réseau : un seul select, filtré sur company_id.

### Étape 11 — Écritures : ajout, modification, suppression AVEC confirmation
👁 **David regarde** · 📦 commit naturel

**Fichiers :** CrmImmoDossierModal.tsx, CrmImmoDeleteModal.tsx, useCrmImmoDossiers.ts, e2e/crm-immo.spec.ts (premier jet)

**Vérification :** npx playwright test e2e/crm-immo.spec.ts : un dossier [TEST] créé est retrouvé EN BASE, modifié, puis supprimé après confirmation et absent de la base. À l'œil : la modale de suppression nomme ce qui part et son bouton est désactivé pendant l'opération.

### Étape 12 — Recherche, tri, filtres (côté client, sur les lignes déjà chargées)
📦 commit naturel

**Fichiers :** CrmImmoFilters.tsx

**Vérification :** Complété dans e2e/crm-immo.spec.ts : une recherche réduit le nombre de lignes, un tri sur l'en-tête change l'ordre et reste stable à égalité, la réinitialisation rend la liste complète.

### Étape 13 — Colonnes personnalisées : modèle pur, hook, organisateur
👁 **David regarde** · 📦 commit naturel

**Fichiers :** crmImmoColonnes.ts, scripts/crm-immo/colonnes.test.ts, useCrmImmoColonnes.ts, CrmImmoColonnesModal.tsx, CrmImmoColonneRow.tsx, CrmImmoAjouterColonneForm.tsx

**Vérification :** (a) node --test scripts/crm-immo/colonnes.test.ts vert. (b) Chez Ruth : ajouter une colonne, la renommer, la réordonner, RECHARGER TROIS FOIS et comparer l'ordre des en-têtes — identique les trois fois (preuve du double .order). (c) Renommer une colonne ne modifie AUCUN dossier (la clé du jsonb est l'id). (d) Les colonnes système n'exposent aucun bouton Supprimer ; nom n'expose pas non plus Masquer. (e) Réordonner au DOIGT par les chevrons sur téléphone.

### Étape 14 — La cloche dédiée, locale, et la preuve d'isolation dans les deux sens
👁 **David regarde** · 📦 commit naturel

**Fichiers :** useCrmImmoAlertes.ts, CrmImmoCloche.tsx, scripts/crm-immo/clocheIsolation.test.ts

**Vérification :** (a) node --test scripts/crm-immo/clocheIsolation.test.ts vert. (b) Relevé à deux mains : Ruth ouvre le module, Talvex passe active à false, Ruth clique « ajouter » → l'écriture échoue côté base et au battement suivant l'interface bascule sur le refus. (c) Relevé du chiffre de la cloche GÉNÉRALE avant/après ouverture du module : inchangé. (d) Réseau : un refetch à l'ouverture, puis rien pendant 5 min sauf retour de visibilité ; la re-dérivation à 60 s ne déclenche AUCUNE requête.

### Étape 15 — Mobile en fiches, pas un tableau comprimé
👁 **David regarde** · 📦 commit naturel

**Fichiers :** CrmImmoCards.tsx, scripts/crm-immo/theme.test.ts

**Vérification :** (a) node --test scripts/crm-immo/theme.test.ts vert (aucune couleur en dur, md:hidden présent, aucun h-full). (b) Viewport 375×812 : AUCUNE barre de défilement horizontale, scrollWidth === clientWidth sur le conteneur de la liste, et aucun <table> visible. C'est la contre-mesure à index.css:87-105, qui « fait marcher » un tableau nu en mobile exactement comme David l'a refusé.

### Étape 16 — Habillage Talixy — la seule étape purement cosmétique
👁 **David regarde** · 📦 commit naturel

**Fichiers :** src/pages/admin/views/CrmImmo.tsx (coquille tx-page), src/talixy/talixyUI.css (bloc desktop en fin de fichier + bloc mobile À L'INTÉRIEUR du @media max-width:767px ouvert ligne 2366 et fermé 2439)

**Vérification :** À l'œil sous Talixy à 1600 px, 1024 px et 375 px, PUIS sous un thème sombre : les deux rendus sont corrects. Vérifier que le tableau n'est pas étranglé par .tx-page-body (max-width 660px) ni décalé par la gouttière de .tx-page (padding-right 40px + 17.5vw) — le remède existe déjà, [data-tx-sys] (talixyUI.css:849-853). Un bloc mobile posé APRÈS la ligne 2439 ne s'applique jamais, sans aucune erreur. Contrôle de non-régression : les onglets Système, Statuts et la liste des Super Admins sont inchangés.

### Étape 17 — Sauvegarde / restauration, puis clôture
📦 commit naturel

**Fichiers :** src/pages/admin/views/sauvegarde/restoreConstants.ts (7-32 ET 46-79), useRestoreCrm.ts:12-17 ; en option et seul dans son commit : useAdminDashboardEffects.ts:37

**Vérification :** (a) Un export chez Bellisimmo contient les trois tables crm_immo_*, et la SIMULATION de restauration les liste aussi — c'est la seule façon de prendre l'écart entre les deux listes. crm_immo_acces est ABSENTE de l'export. (b) Clôture : diff typecheck-avant / typecheck-apres VIDE, npm run lint sans erreur nouvelle, npm run build vert, npx playwright test e2e/crm-immo-acces.spec.ts et e2e/crm-immo.spec.ts verts, les cinq node --test verts, et ls src/**/*.test.ts VIDE.

---

## 4. Arbitrages qui te restent — 7

### Visibilité de l'onglet : drapeau hidden (Option 1) ou droit d'accès (Option 2) ?

**Options :** Option 1 : déclarer { id: 'crm-immo', hidden: true } dans LAYOUT_SECTIONS et laisser Talvex démasquer pour Bellisimmo. Option 2 : ne jamais déclarer l'entrée dans la constante, et l'émettre dans `sections` (Sidebar.tsx:131) seulement si has_crm_immo_access dit oui.

**Recommandation : Option 2, sans réserve.**

*Pourquoi :* Le chemin de destruction de l'Option 1 tient en trois lignes vérifiées : « Par défaut » n'est gardé par rien (SidebarLayoutControls.tsx:227, alors que son voisin ligne 219 l'est bien), resetToDefault remplace le brouillon par la DÉCLARATION, drapeaux hidden compris (useSidebarLayout.ts:204), et confirmReorder l'enregistre tel quel, « const next = draft » (ligne 183). Et « Réorganiser » est ouvert à Ruth (SidebarFooterActions.tsx:37). Deux clics et elle perd son module, en base, sans comprendre. L'Option 2 n'est pas une seconde logique : `sections` est DÉJÀ un paramètre injecté du hook (useSidebarLayout.ts:100 et 113) que seul un useMemo à dépendances vides fige, et le panel Client fait exactement cela depuis toujours (ClientSidebar.tsx:84-87 + garde renderer ClientDashboard.tsx:140). Coût accepté : chez Bellisimmo, qui a déjà une configuration enregistrée, l'onglet apparaîtra EN BAS de la barre (sidebarLayout.ts:156-157) ; il se replace à la main, une fois, depuis « Réorganiser ».

### Lecture du droit côté client : SELECT sur crm_immo_acces ou RPC has_crm_immo_access ?

**Options :** SELECT direct avec .maybeSingle() puis relecture de `active` ; ou supabase.rpc('has_crm_immo_access', { p_company_id }).

**Recommandation : La RPC.**

*Pourquoi :* Le SELECT a un mode de panne silencieux précis : un retrait du module passe `active` à false sans supprimer la ligne (la colonne existe pour ça). Un SELECT écrit sans .eq('active', true) ramène toujours la ligne — onglet visible, badge qui compte — et c'est seulement à la première écriture que la RLS refuse, parce que les 12 policies, elles, appellent la fonction qui teste a.active. La RPC rend cette divergence impossible : le test de `active` est dans son corps (harden:113) et c'est LITTÉRALEMENT la même fonction que les policies évaluent. En prime, data===null d'un SELECT vaut autant « pas de droit » que « RLS m'a bloqué » que « ligne absente », error restant null dans les trois cas. Aucun type à régénérer : le client n'est pas typé contre le schéma (src/lib/supabase.ts:6-13).

### Peut-on masquer une colonne SYSTÈME en V1, et cela demande-t-il une 5e migration ?

**Options :** (a) V1 localStorage, comme les quatre CRM existants (useColumnOrder.ts:27-39, clés talvex_columns_*) : zéro migration, réglage par navigateur. (b) Réutiliser public.company_column_config avec un table_key 'crm_immo' : déjà en base, zéro migration, réglage par Société. (c) 5e migration : table propre au module, portant les trois mêmes policies que crm_immo_colonnes.

**Recommandation : (a) pour la V1. Les colonnes PERSO gardent position et masquee en base, où elles sont déjà ; seules l'ordre et le masquage des colonnes SYSTÈME passent en localStorage.**

*Pourquoi :* crm_immo_colonnes ne porte le drapeau masquee que pour les colonnes perso ; les 10 colonnes système sont de vraies colonnes de crm_immo_dossiers et n'ont aucune place pour leur ordre. L'option (b) semble gratuite mais sa RLS est plus étroite que celle de CRM Immo : SELECT sans aucun contrôle de rôle (donc vendeurs et clients liraient, ce que David a exclu), INSERT/UPDATE réservés à role='admin', AUCUNE policy pour company_super_admin ni super_admin, et aucun appel à has_crm_immo_access — un Groupe qui configurerait sa fille écrirait dans le vide, en silence. L'option (c) est propre mais c'est une migration, donc hors du périmètre « FRONT » de ce chantier. Point non négociable dans les trois cas : nom n'est jamais masquable (NOT NULL en base, CHECK crm_immo_dossiers_nom_non_vide).

### Que voit un Groupe en Visu chez une fille qui n'a PAS le module ?

**Options :** (a) Comme tout le monde : onglet absent, et écran de refus nommé si l'ouverture est forcée. (b) Onglet visible en lecture seule pour le Groupe. (c) Onglet visible pour le Groupe dès qu'UNE de ses filles a le module.

**Recommandation : (a), et c'est gratuit : aucun code spécifique.**

*Pourquoi :* La fonction se prononce sur son ARGUMENT, pas sur le rôle de l'appelant : la clause rôle est une habilitation à SAVOIR, elle n'est pas une réponse. Et useCompanyId() rend la Société VISITÉE (CompanyIdContext.tsx:27 : overrideCompanyId ?? authCompanyId ; CSAImpersonationRoutes.tsx:101-121 pour le Groupe). Donc has_crm_immo_access(useCompanyId()) vaut true chez Bellisimmo et false chez Torah, pour le Groupe comme pour Talvex. La crainte « la Visu verra CRM Immo partout » ne se réalise QUE si le front demande son rôle au lieu de demander le droit de la Société : le mot super_admin, isSAViewing et impersonatedAdmin ne doivent apparaître nulle part dans la décision d'accès. Relevé qui le prouve : les trois sœurs visitées dans la même session, sans déconnexion.

### Intervalle de rafraîchissement de la cloche V1 (sans Realtime)

**Options :** (a) Uniquement à l'ouverture du module. (b) Re-dérivation locale toutes les 60 s + refetch réseau à l'ouverture, au retour de visibilité de l'onglet, et toutes les 5 min. (c) Sondage réseau serré, 30 s.

**Recommandation : (b).**

*Pourquoi :* C'est exactement le découpage déjà en place dans useAgendaNotifications.ts : l'intervalle de 60 s (lignes 171-174) ne relance AUCUNE requête, il re-évalue depuis les lignes en mémoire — donc un loyer qui bascule à minuit ou une fin de contrat qui atteint J-30 apparaît sans coût. Le refetch réseau à 5 min, plus le retour de visibilité (patron useSecuringPoll.ts:25,35-36 qui met en pause sur onglet masqué), suffit pour capter un dossier ajouté ailleurs. (a) fait mentir durablement l'interface après une révocation ; (c) multiplie les requêtes sans rien gagner, les alertes étant dérivées de dates et non d'événements. Rappel : le droit lui-même se relit au MÊME battement, c'est à ça que sert refresh().

### Où déclarer le lazy() du module : adminLazyViews.ts ou CrmImmoGate.tsx ?

**Options :** (a) Dans adminLazyViews.ts, comme les 26 autres vues, puis case dans le renderer. (b) Dans CrmImmoGate.tsx, évalué seulement dans la branche « accordé ».

**Recommandation : (b).**

*Pourquoi :* Le morceau n'est de toute façon pas téléchargé avant d'être rendu, dans les deux cas — l'écart réel est la convention contre la colocalisation, pas la bande passante. (b) garantit par construction que le module n'est jamais monté hors de la branche accordée, et c'est ce que fait déjà CSATalvexGate.tsx:5. Le garde-fou utile reste intact : CrmImmoGate est un import normal du renderer, donc l'oublier dans le switch lève TS6133 (noUnusedLocals) au typecheck. Si vous préférez la convention, (a) marche aussi — mais alors un export jamais importé ne lève RIEN et la vue peut rester morte sans qu'aucun outil ne le dise.

### Valider ctx.fromTab (useAdminDashboardEffects.ts:37) maintenant ou plus tard ?

**Options :** (a) Maintenant, dans le même lot. (b) En dernier, seul dans son commit. (c) Pas du tout.

**Recommandation : (b).**

*Pourquoi :* C'est la seule porte du dépôt qui impose un onglet sans passer par l'interface, et elle n'est aujourd'hui qu'une assertion de type sur une chaîne venue de sessionStorage. La corriger profite à TOUS les onglets — donc c'est un changement dont le rayon dépasse CRM Immo, et il n'a rien à faire dans un commit du module. Elle n'est pas urgente parce que le garde du renderer refuse déjà : (c) reste tenable, mais alors le panel peut se lever directement sur un écran de refus, symptôme déroutant que David signalerait comme un bug.

---

## 5. Les tests — 8

### `scripts/crm-immo/clocheIsolation.test.ts`
**Prouve :** LE test exigé nommément : les deux cloches ne se mélangent dans AUCUN des deux sens. Lancé par « node --test scripts/crm-immo/clocheIsolation.test.ts » (harnais vérifié : 10/10 en 78 ms sur suppressionSysteme.test.ts, Node v24.15.0, TypeScript lu sans compilation). Assertions exactes — SENS 1 : const ligne = read('src/pages/admin/TopBar.tsx').split('\n').find(l => l.includes('const totalNotifCount =')); assert.equal((ligne.match(/\+/g) ?? []).length, 8, 'totalNotifCount garde exactement 9 termes') ; assert.equal((read('src/pages/admin/components/topbar/AdminNotificationCards.tsx').match(/key: '/g) ?? []).length, 9, 'CARDS reste a 9 cartes') ; assert.equal(DEFAULT_KEYS.length, 9) sur useNotifCardOrder.ts ; assert.equal((read('.../AdminMobileBellMenu.tsx').match(/\{ key: '/g) ?? []).length, 9) ; et assert.doesNotMatch(src, /crm[-_]?immo/i) sur les SEPT fichiers de la cloche générale (TopBar.tsx, AdminNotificationCards.tsx, AdminNotificationsHub.tsx, AdminMobileBellMenu.tsx, AdminNotificationsHubParts.tsx, useNotifCardOrder.ts, NotifHubShell.tsx). SENS 2, sur CrmImmoCloche.tsx et useCrmImmoAlertes.ts : assert.doesNotMatch(crmSrc, /\.\.\.CARDS/, 'la cloche CRM Immo ne concatene jamais les cartes de la Societe') et assert.doesNotMatch(crmSrc, /AdminNotificationCards|\bCARDS\b|unreadClientCount|unreadVendorCount|unreadSuperAdminCount|agendaPersoCount|agendaEquipeCount|proposalsCount|confirmedCount|rescheduleCount|useAgendaNotifications|useUnreadClientMessages|useUnreadVendorMessages|useUnreadFromSuperAdmin|useAdminProposalNotifs/). Plus assert.doesNotMatch(read('src/pages/admin/TopBar.tsx'), /CrmImmo/) et idem sur AdminDashboard.tsx, et assert.match(read('.../useCrmImmoAlertes.ts'), /has_crm_immo_access/).

**Casse si :** Quelqu'un ajoute un 10e terme à la somme de TopBar.tsx:127, une 10e carte à CARDS (immédiatement additionnée par le reduce de NotifHubShell.tsx:88-90), une entrée à la liste mobile ou à DEFAULT_KEYS, ou passe [...CARDS, carteCrmImmo] au coquillage. Chacun de ces gestes est INVISIBLE à l'écran tant que les compteurs valent zéro, et aucun garde-fou de type ne les attrape : la seule garde de type du dossier (CATEGORY_LABELS, Record<NotifCategory,string>) n'est vérifiée que par le typecheck, qui n'est pas dans le build. Un test e2e ne vaudrait rien ici : il prouverait que les deux chiffres sont séparés aujourd'hui, pas que personne ne les branchera demain.

### `e2e/crm-immo-acces.spec.ts`
**Prouve :** Que « masqué » et « interdit » sont deux choses différentes. Chez le compte e2e par défaut (<compte e2e par defaut> → Société « David Schemmama » <company_id du compte e2e>, AUCUNE ligne crm_immo_acces, vérifié en base) : l'entrée « CRM Immo » est absente de la barre latérale, ET une ouverture forcée affiche l'écran de refus nommé — expect(getByTestId('crm-immo-refus')).toBeVisible() ET expect(getByTestId('crm-immo-ajouter')).toHaveCount(0). Chez Bellisimmo : expect(getByRole('heading', { name: 'CRM Immo' })).toBeVisible().

**Casse si :** Le case 'crm-immo' disparaît du switch (le default: ligne 119 rendrait le Dashboard, et un test qui se contente de « la page ne plante pas » passerait), le garde glisse de la Porte vers la vue, ou la Porte se met à rendre null au lieu d'un refus nommé. C'est le seul test qui attrape l'ouverture par les deux casts mesurés (canal démo AdminDashboard.tsx:241, sessionStorage useAdminDashboardEffects.ts:37).

### `scripts/crm-immo/acces.test.ts`
**Prouve :** Qu'un droit INCONNU n'ouvre pas, et surtout qu'il n'est pas non plus un refus : assertion que l'état initial n'est NI accordé NI refusé, plus true→accordé, false/null/undefined→refusé, error→pas accordé.

**Casse si :** Quelqu'un « simplifie » les quatre états en un booléen, comme useIsWellnessClient.ts:5 (useState(false), pas de troisième état). Cette simplification ne fait tomber AUCUN rendu — l'écran se contente de clignoter pour un ayant droit et de rester blanc pour les autres — donc seul ce test la signale.

### `scripts/crm-immo/alertes.test.ts`
**Prouve :** Toute l'arithmétique que ni la base ni le navigateur ne contrôlent : rabattement du jour 31 (février 2026→28, 2028→29, 2100→28, 2000→29 ; avril→30 ; janvier→31 inchangé), fin de contrat à J-30 exactement et pas à J-31, les trois prédicats sur les quatre états possibles d'une ligne crm_immo_etats, compteBadge, les formats de période conformes aux deux expressions du CHECK (zéro de tête obligatoire), la MÊME période rendue pour deux fuseaux d'utilisateur différents, et le sort explicite d'une alerte traitée dont la date a changé.

**Casse si :** Quelqu'un écrit new Date(annee, 1, 31) — qui rend le 3 mars sans la moindre erreur, donc l'alerte de février ne se déclenche jamais ; ou reprend le motif de « aujourd'hui » employé partout dans le dépôt, new Date().toISOString().split('T')[0], qui est la journée UTC et se trompe d'un jour une partie de chaque journée ; ou lit le fuseau de l'utilisateur au lieu du fuseau de référence, auquel cas deux admins de Bellisimmo marquent et cherchent des périodes différentes et l'alerte ne s'éteint jamais pour le second ; ou appelle new Date() à l'intérieur du modèle, ce qui rend le test du 29 février impossible à écrire.

### `scripts/crm-immo/sidebarCrmImmo.test.ts`
**Prouve :** Que l'invisibilité est portée par le DROIT et jamais par le drapeau hidden : 'crm-immo' n'apparaît pas dans une déclaration inconditionnelle de LAYOUT_SECTIONS et jamais avec hidden:true ; sans droit l'entrée n'est pas émise ; avec droit reconcileLayout l'ajoute à une configuration déjà enregistrée ; et defaultEntries(sections_avec_droit) — exactement ce que resetToDefault pose dans le brouillon — contient toujours l'entrée VISIBLE. Plus : ICONS contient bien la clé 'crm-immo'.

**Casse si :** Quelqu'un déclare l'entrée hidden:true « par prudence » : « Par défaut » + « Valider » la remasquerait seul, et le même clic remettrait au passage TOUS les autres drapeaux hidden aux valeurs du code. Aujourd'hui RIEN ne l'attrape : les deux suites sidebar n'importent que les modules purs, et useSidebarLayout n'est testé nulle part. La dernière assertion attrape aussi l'icône oubliée, que ni le build ni le typecheck ne voient (ICONS est Record<string, ReactNode>, Sidebar.tsx:90).

### `scripts/crm-immo/colonnes.test.ts`
**Prouve :** Que l'ordre des colonnes est déterministe et que les colonnes système sont intouchables : deux colonnes de même position rendent le MÊME ordre à deux lectures (c'est created_at qui tranche) ; positionsApres() rend 0..n-1 sans trou et SIX champs par ligne ; une colonne système n'est jamais supprimable ; nom n'est jamais masquable, même si l'état mémorisé la liste masquée ; une clé inconnue dans l'état mémorisé est filtrée sans erreur.

**Casse si :** Quelqu'un lit crm_immo_colonnes avec ORDER BY position SEUL : la position n'est volontairement PAS unique (le COMMENT de la colonne le dit : « un glisser-déposer passe par un état transitoire en doublon »), Postgres n'a plus d'ordre déterministe et les colonnes s'échangent d'un rechargement à l'autre, sans aucun message. Ou quelqu'un écrit un upsert partiel { id, position } : nom et type sont NOT NULL sans DEFAULT, PostgREST émet un INSERT ... ON CONFLICT et l'INSERT est analysé avant la résolution du conflit — l'assertion des six champs attrape l'erreur avant qu'elle n'atteigne la base.

### `scripts/crm-immo/theme.test.ts`
**Prouve :** Qu'aucun fichier du module ne code une couleur en dur ni ne demande sa hauteur en pourcentage : échec si /#[0-9a-fA-F]{3,8}\b/ ou /rgba?\(/ apparaît hors tokens, si une classe de couleur Tailwind (text-white, bg-slate-*, text-gray-*) est présente, si 'md:hidden' est absent, ou si /h-full|height:\s*100%/ est trouvé.

**Casse si :** Une couleur en dur passe le build, passe le typecheck, s'affiche correctement sur les 11 thèmes sombres et devient illisible sur les 5 clairs — dont Talixy. Le contre-exemple est déjà dans le dépôt (CategoryDeleteConfirmModal.tsx:16,24,27). Et h-full : le <div key={scopeId}> de ThemeContext.tsx:274 n'a aucune hauteur, la chaîne en pourcentage y est coupée, l'élément prend la hauteur de son CONTENU — c'est l'incident déjà payé (27 439 px sur la page publique, documenté dans CoquilleIsraelHaya.tsx:107-118).

### `e2e/crm-immo.spec.ts`
**Prouve :** Le parcours réel chez Bellisimmo : ajout vérifié EN BASE, modification, suppression confirmée vérifiée en base, recherche, tri, filtres, et relevé que la cloche CRM Immo compte pendant que la cloche générale ne bouge pas. Mode serial, préfixe [TEST], nettoyage en afterAll, vérifications en base par les aides session/rest de e2e/helpers/boutique3d.ts.

**Casse si :** Une écriture est refusée par la RLS et avalée en silence : un UPDATE refusé ne rend AUCUNE erreur, il rend zéro ligne, et supabase-js rend { error: null }. Le motif existant du dépôt tombe droit dedans (ContentBlocksView.tsx:160 pose l'état local AVANT l'écriture et ne lit ni error ni count) : à l'écran tout fonctionne, au rechargement suivant tout est revenu comme avant. Seule une vérification EN BASE, sous le rôle authentifié et jamais sous execute_sql qui ignore la RLS, l'attrape.

---

## 6. Ce que ce plan NE fait PAS

CE PLAN NE FAIT PAS, et il faut le relire à chaque étape. (1) AUCUN Realtime : zéro supabase.channel dans tout le module ; la cloche charge une fois et re-dérive en mémoire. Un 7e canal ne croiserait rien, mais David n'en veut pas en V1. (2) AUCUNE touche à la coquille PWA : public/service-worker.js, public/manifest.webmanifest, src/main.tsx:51-53, src/lib/pushNotifications.ts, usePushNotifications.ts, PushNotificationSettings.tsx, sendPushForMessage.ts restent intacts. C'est déjà matériellement séparé : pour role 'admin' la coquille utilise des listes ÉCRITES EN DUR (pwaMobileShellConfig.tsx:25-31 et 54-59), setAppBadge n'existe nulle part dans le dépôt, et le push n'est déclenché qu'à l'ENVOI d'un message par 5 vues de chat — une alerte dérivée n'a rien à appeler. (3) AUCUN accès vendeurs ni clients : aucune policy touchée, aucun onglet ajouté aux panels vendor et client, et l'option company_column_config est écartée précisément parce que son SELECT ne contrôle aucun rôle. (4) AUCUN autre module modifié : ni CRM Leads, ni leads, ni clients, ni chat, ni agenda, ni rendez-vous, ni notifications globales. En particulier src/components/table/*, src/hooks/useCustomColumns.ts, src/components/filters/ListFilters.tsx et src/hooks/useSidebarLayout.ts sont COPIÉS comme patrons, jamais étendus — ColumnOrganizerModal est monté par quatre modules, useSidebarLayout par quatre panels. Contrôle au commit : git diff --stat ne doit montrer en MODIFICATION que les fichiers listés en a_modifier, tout le reste en ajout. (5) AUCUN oracle UUID, AUCUNE introspection publique : rien qui permette de deviner l'existence d'une Société ou d'un dossier ; has_crm_immo_access n'est pas exécutable par anon et ne répond qu'à qui a le droit de savoir. (6) AUCUNE 5e migration, AUCUN changement de schéma, AUCUN db push ni db reset : la couche BASE est fermée, les quatre migrations sont appliquées et byte-identiques au ledger. Si un arbitrage impose une table (ordre des colonnes système par Société), elle sera un chantier à part. (7) AUCUNE correction du bug réciproque de « Par défaut » (une Société peut ressusciter un onglet que Talvex avait masqué, ce qui contredit le commentaire SidebarLayoutControls.tsx:38-43) : défaut réel, indépendant de CRM Immo, à arbitrer séparément — le toucher ici serait exactement le mécanisme par lequel CRM Immo changerait l'état d'autres onglets. (8) AUCUN badge chiffré sur l'onglet de la sidebar : le panel Société n'a aucun mécanisme de pastille (visuBadgeLabel est une étiquette TEXTE), donc il n'y a rien à brancher par erreur — et rien à brancher du tout. (9) AUCUN *.test.ts sous src/ : structureCrmSync.ts:6 globe /src/**/*.{ts,tsx,css,json} comme MODULES, un import node:test y deviendrait une dépendance que Vite doit résoudre pour le navigateur ; les scripts sont globés en ?raw (ligne 10), d'où la règle. Contrôle : ls src/**/*.test.ts doit rester vide.
