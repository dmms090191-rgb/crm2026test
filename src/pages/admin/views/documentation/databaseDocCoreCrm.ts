import type { TableDoc } from './databaseDocTypes';

export const CORE_CRM_TABLES: TableDoc[] = [
  {
    name: 'leads',
    group: 'Core CRM',
    description:
      'Table centrale du CRM. Contient tous les prospects importés ou créés manuellement. Chaque lead dispose de colonnes structurées (prenom, nom, email, telephone) extraites du champ jsonb data lors du backfill, ainsi que du champ data brut qui conserve toutes les colonnes CSV originales.',
    quickUnderstanding: {
      role: 'Stocker les prospects et leur état dans le pipeline de vente.',
      usedBy: 'Admin (CRM, import, vue d\'ensemble), Vendeur (leads assignés), Client (indirectement via rdv_proposals).',
      relatedTables: ['import_history', 'statuts', 'vendors', 'rdv_proposals', 'conversations', 'client_messages'],
    },
    example:
      'Un fichier CSV de 500 contacts est importé → 500 lignes créées dans leads, chacune liée à un import_history. L\'admin assigne 100 leads au vendeur Jean → vendor_id mis à jour. Jean change le statut de 20 leads → champ statut mis à jour.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'import_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → import_history.id (SET NULL on delete)' },
      { name: 'data', type: 'jsonb', nullable: false, default: '{}', constraints: 'Données brutes CSV originales' },
      { name: 'imported_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
      { name: 'statut', type: 'text', nullable: false, default: "'Nouveau'", constraints: 'Valeur libre — correspond au nom dans statuts' },
      { name: 'actif', type: 'boolean', nullable: false, default: 'true' },
      { name: 'vendor_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → vendors.id' },
      { name: 'prenom', type: 'text', nullable: true, constraints: 'Backfillé depuis data.prenom' },
      { name: 'nom', type: 'text', nullable: true, constraints: 'Backfillé depuis data.nom' },
      { name: 'email', type: 'text', nullable: true, constraints: 'Backfillé depuis data.email, index conditionnel UNIQUE' },
      { name: 'telephone', type: 'text', nullable: true, constraints: 'Backfillé depuis data.telephone, index conditionnel UNIQUE' },
      { name: 'source', type: 'text', nullable: true, default: "'csv_import'" },
      { name: 'source_file', type: 'text', nullable: true },
    ],
    foreignKeys: [
      { column: 'import_id', referencesTable: 'import_history', referencesColumn: 'id', description: 'Lien vers l\'import qui a créé ce lead. NULL si ajouté manuellement.', direction: 'outgoing' },
      { column: 'vendor_id', referencesTable: 'vendors', referencesColumn: 'id', description: 'Vendeur auquel ce lead est assigné. NULL si non assigné.', direction: 'outgoing' },
      { column: 'id', referencesTable: 'rdv_proposals', referencesColumn: 'lead_id', description: 'Propositions de RDV pour ce lead.', direction: 'incoming' },
      { column: 'id', referencesTable: 'conversations', referencesColumn: 'lead_id', description: 'Conversations chat liées à ce lead.', direction: 'incoming' },
    ],
    indexes: [
      { name: 'leads_pkey', columns: ['id'], unique: true },
      { name: 'leads_email_unique', columns: ['email'], unique: true, condition: 'WHERE email IS NOT NULL AND email != \'\'' },
      { name: 'leads_telephone_unique', columns: ['telephone'], unique: true, condition: 'WHERE telephone IS NOT NULL AND telephone != \'\'' },
    ],
    policies: [
      { name: 'Auth can select leads', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can insert leads', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can update leads', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can delete leads', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
    triggers: [
      { name: 'trg_cleanup_import_history', event: 'AFTER DELETE', function: 'cleanup_orphan_import_history()', description: 'Supprime les entrées import_history orphelines lorsque tous leurs leads sont supprimés.' },
    ],
  },
  {
    name: 'vendors',
    group: 'Core CRM',
    description:
      'Table des vendeurs du CRM. Chaque vendeur a un compte Supabase Auth (auth_user_id) créé via une Edge Function, et un profil dans cette table. Permet de gérer les leads assignés, la messagerie et l\'agenda.',
    quickUnderstanding: {
      role: 'Profil des commerciaux avec leurs informations et lien vers leur compte Auth.',
      usedBy: 'Admin (création, liste, assignation), Vendeur (profil propre), tous les modules de chat.',
      relatedTables: ['leads', 'rdv_proposals', 'conversations', 'vendor_admin_messages', 'vendor_comments'],
    },
    example:
      'L\'admin crée un vendeur via le formulaire → Edge Function create-user crée le compte Auth → une ligne est insérée dans vendors avec auth_user_id. Le vendeur se connecte et voit ses leads via vendor_id.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'first_name', type: 'text', nullable: false, default: "''" },
      { name: 'last_name', type: 'text', nullable: false, default: "''" },
      { name: 'email', type: 'text', nullable: false, default: "''", constraints: 'UNIQUE' },
      { name: 'password', type: 'text', nullable: false, default: "''", constraints: 'Stocké en clair pour référence admin — Auth gère la vraie auth' },
      { name: 'phone', type: 'text', nullable: false, default: "''" },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      { name: 'auth_user_id', type: 'uuid', nullable: true, constraints: 'Référence auth.users.id' },
    ],
    foreignKeys: [
      { column: 'id', referencesTable: 'leads', referencesColumn: 'vendor_id', description: 'Leads assignés à ce vendeur.', direction: 'incoming' },
      { column: 'id', referencesTable: 'rdv_proposals', referencesColumn: 'vendor_id', description: 'Propositions de RDV créées par ce vendeur.', direction: 'incoming' },
      { column: 'id', referencesTable: 'vendor_comments', referencesColumn: 'vendor_id', description: 'Commentaires admin sur ce vendeur.', direction: 'incoming' },
    ],
    indexes: [
      { name: 'vendors_pkey', columns: ['id'], unique: true },
      { name: 'vendors_email_key', columns: ['email'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can select vendors', operation: 'SELECT', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
      { name: 'Authenticated users can insert vendors', operation: 'INSERT', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
      { name: 'Authenticated users can update vendors', operation: 'UPDATE', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
      { name: 'Authenticated users can delete vendors', operation: 'DELETE', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
    ],
  },
  {
    name: 'statuts',
    group: 'Core CRM',
    description:
      'Référentiel des statuts de leads personnalisables. L\'admin crée et gère les statuts (nom + couleur hex). Les leads référencent les statuts par valeur texte (pas par FK), ce qui garantit qu\'un lead conserve son statut même si le statut est supprimé.',
    quickUnderstanding: {
      role: 'Paramétrage des statuts disponibles dans le pipeline de vente.',
      usedBy: 'Admin (page Statuts), tous les rôles via le champ leads.statut.',
      relatedTables: ['leads'],
    },
    example:
      'L\'admin crée le statut "Qualifié" en vert → apparaît dans le menu déroulant du CRM. Le vendeur change le statut d\'un lead → leads.statut = "Qualifié". Si le statut est supprimé, les leads existants conservent la valeur "Qualifié" en texte.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'nom', type: 'text', nullable: false, constraints: 'UNIQUE — nom affiché dans le CRM' },
      { name: 'couleur', type: 'text', nullable: false, default: "'#38bdf8'", constraints: 'Code hexadécimal' },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'statuts_pkey', columns: ['id'], unique: true },
      { name: 'statuts_nom_key', columns: ['nom'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can read statuts', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert statuts', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update statuts', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete statuts', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'import_history',
    group: 'Core CRM',
    description:
      'Historique de chaque import CSV. Enregistre les statistiques d\'un import (nombre de leads, doublons, erreurs) et les colonnes détectées. Supprimé automatiquement quand tous les leads de l\'import sont supprimés via le trigger trg_cleanup_import_history.',
    quickUnderstanding: {
      role: 'Traçabilité et statistiques des imports de fichiers CSV.',
      usedBy: 'Admin (page Import, historique des imports).',
      relatedTables: ['leads'],
    },
    example:
      'Import de 200 leads → 1 ligne import_history avec lead_count=200, new_leads_count=180, duplicates_count=20. Si l\'admin supprime tous les leads de cet import → trigger supprime automatiquement la ligne import_history.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'file_name', type: 'text', nullable: false, default: "''" },
      { name: 'lead_count', type: 'integer', nullable: false, default: '0', constraints: 'Total de lignes dans le fichier' },
      { name: 'columns', type: 'jsonb', nullable: false, default: '[]', constraints: 'Liste des colonnes CSV détectées' },
      { name: 'imported_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
      { name: 'new_leads_count', type: 'integer', nullable: false, default: '0' },
      { name: 'duplicates_count', type: 'integer', nullable: false, default: '0' },
      { name: 'errors_count', type: 'integer', nullable: false, default: '0' },
      { name: 'import_mode', type: 'text', nullable: false, default: "'ignore'", constraints: "Valeurs : 'ignore' | 'update'" },
      { name: 'source_file', type: 'text', nullable: true },
      { name: 'imported_by', type: 'uuid', nullable: true, constraints: 'auth.uid() de l\'utilisateur qui a importé' },
    ],
    foreignKeys: [
      { column: 'id', referencesTable: 'leads', referencesColumn: 'import_id', description: 'Leads créés lors de cet import.', direction: 'incoming' },
    ],
    indexes: [
      { name: 'import_history_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Auth can select import_history', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can insert import_history', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can update import_history', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can delete import_history', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'rdv_proposals',
    group: 'Core CRM',
    description:
      'Propositions de rendez-vous créées par les vendeurs pour leurs leads. Contient les informations de contact dupliquées (lead_name, lead_phone, lead_email) pour garantir la lisibilité même si le lead est supprimé. Statut géré par l\'admin.',
    quickUnderstanding: {
      role: 'Pipeline de prise de rendez-vous entre vendeurs et leads.',
      usedBy: 'Vendeur (création), Admin (validation, agenda), Client (consultation).',
      relatedTables: ['vendors', 'leads'],
    },
    example:
      'Le vendeur propose un RDV le 20/03 à 14h pour le lead Martin → 1 ligne avec status=\'pending\'. L\'admin accepte → status=\'accepted\'. Le RDV apparaît dans l\'agenda.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'vendor_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → vendors.id' },
      { name: 'lead_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → leads.id' },
      { name: 'lead_name', type: 'text', nullable: false, default: "''", constraints: 'Dupliqué pour résilience' },
      { name: 'lead_phone', type: 'text', nullable: false, default: "''", constraints: 'Dupliqué pour résilience' },
      { name: 'lead_email', type: 'text', nullable: false, default: "''", constraints: 'Dupliqué pour résilience' },
      { name: 'proposed_date', type: 'date', nullable: false },
      { name: 'proposed_time', type: 'text', nullable: false, default: "''" },
      { name: 'notes', type: 'text', nullable: false, default: "''" },
      { name: 'status', type: 'text', nullable: false, default: "'pending'", constraints: "Valeurs : 'pending' | 'accepted' | 'refused'" },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
    ],
    foreignKeys: [
      { column: 'vendor_id', referencesTable: 'vendors', referencesColumn: 'id', description: 'Vendeur ayant proposé le RDV.', direction: 'outgoing' },
      { column: 'lead_id', referencesTable: 'leads', referencesColumn: 'id', description: 'Lead concerné par le RDV.', direction: 'outgoing' },
    ],
    indexes: [
      { name: 'rdv_proposals_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can read rdv_proposals', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert rdv_proposals', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update rdv_proposals', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete rdv_proposals', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'registrations',
    group: 'Core CRM',
    description:
      'Formulaire d\'auto-inscription client. Les visiteurs non connectés soumettent leurs informations via la page publique → ligne insérée. L\'admin valide ou refuse. Seul le rôle anon peut insérer (INSERT public sans authentification).',
    quickUnderstanding: {
      role: 'Capturer les demandes d\'inscription de nouveaux clients.',
      usedBy: 'Public (soumission formulaire), Admin (validation dans la page Inscriptions).',
      relatedTables: ['registration_requests'],
    },
    example:
      'Un visiteur remplit le formulaire d\'inscription → 1 ligne avec status=\'pending\'. L\'admin voit la demande dans la liste et peut l\'approuver (crée un compte) ou la refuser.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'first_name', type: 'text', nullable: false, default: "''" },
      { name: 'last_name', type: 'text', nullable: false, default: "''" },
      { name: 'email', type: 'text', nullable: false, default: "''" },
      { name: 'password', type: 'text', nullable: false, default: "''" },
      { name: 'phone', type: 'text', nullable: false, default: "''" },
      { name: 'status', type: 'text', nullable: false, default: "'pending'", constraints: "Valeurs : 'pending' | 'approved' | 'refused'" },
      { name: 'registered_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'registrations_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Auth can select registrations', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Anon can insert registrations', operation: 'INSERT', roles: ['anon'], condition: 'true' },
      { name: 'Auth can update registrations', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Auth can delete registrations', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'registration_requests',
    group: 'Core CRM',
    description:
      'Alternative à registrations — demandes d\'inscription avec validation admin. Accessible en insertion par les utilisateurs anonymes ET authentifiés. Permet aux vendeurs de soumettre des demandes pour leurs clients.',
    quickUnderstanding: {
      role: 'Demandes d\'inscription avec workflow de validation admin.',
      usedBy: 'Public (anon), Vendeurs (authenticated), Admin (validation).',
      relatedTables: ['registrations'],
    },
    example:
      'Un vendeur enregistre un nouveau client via le dashboard vendeur → ligne insérée par un utilisateur authentifié. L\'admin valide → le client reçoit ses accès.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'first_name', type: 'text', nullable: false, default: "''" },
      { name: 'last_name', type: 'text', nullable: false, default: "''" },
      { name: 'email', type: 'text', nullable: false, default: "''" },
      { name: 'password', type: 'text', nullable: false, default: "''" },
      { name: 'phone', type: 'text', nullable: false, default: "''" },
      { name: 'status', type: 'text', nullable: false, default: "'pending'", constraints: "Valeurs : 'pending' | 'approved' | 'refused'" },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'registration_requests_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can view all requests', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Anyone can submit a registration request', operation: 'INSERT', roles: ['anon', 'authenticated'], condition: 'true' },
      { name: 'Authenticated users can update requests', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete requests', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
];
