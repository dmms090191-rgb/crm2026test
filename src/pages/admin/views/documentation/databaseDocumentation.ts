
export interface ColumnDoc {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  primaryKey?: boolean;
  isSystem?: boolean;
  constraints?: string;
}

export interface ForeignKeyDoc {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  description: string;
  direction: 'outgoing' | 'incoming';
}

export interface IndexDoc {
  name: string;
  columns: string[];
  unique: boolean;
  condition?: string;
}

export interface PolicyDoc {
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roles: string[];
  condition?: string;
}

export interface TriggerDoc {
  name: string;
  event: string;
  function: string;
  description: string;
}

export interface TableDoc {
  name: string;
  group: 'Core CRM' | 'Chat' | 'Documentation interne';
  description: string;
  quickUnderstanding: {
    role: string;
    usedBy: string;
    relatedTables: string[];
  };
  example: string;
  columns: ColumnDoc[];
  foreignKeys: ForeignKeyDoc[];
  indexes: IndexDoc[];
  policies: PolicyDoc[];
  triggers?: TriggerDoc[];
}

export interface SqlView {
  name: string;
  description: string;
  sql: string;
  returns: string;
}

export interface SqlFunction {
  name: string;
  description: string;
  trigger?: string;
}

export interface DatabaseDoc {
  lastSyncedAt: string;
  groups: Array<{ id: string; label: string; color: string }>;
  tables: TableDoc[];
  views: SqlView[];
  functions: SqlFunction[];
  globalRules: string[];
}

const DATABASE_DOC: DatabaseDoc = {
  lastSyncedAt: '2026-03-17',
  groups: [
    { id: 'Core CRM', label: 'Core CRM', color: '#38bdf8' },
    { id: 'Chat', label: 'Chat', color: '#34d399' },
    { id: 'Documentation interne', label: 'Documentation interne', color: '#fb923c' },
  ],
  tables: [
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
    {
      name: 'conversations',
      group: 'Chat',
      description:
        'Table pivot du système de messagerie moderne (conversations/messages). Chaque conversation relie un lead à un vendeur. Contient un champ type pour distinguer les conversations client-vendeur. Indexée sur lead_id et vendor_auth_id pour des requêtes performantes.',
      quickUnderstanding: {
        role: 'Fil de conversation entre un lead/client et un vendeur.',
        usedBy: 'Vendeur (chat client), Client (messagerie).',
        relatedTables: ['leads', 'vendors', 'messages'],
      },
      example:
        'Le vendeur ouvre le chat avec le lead Dupont → une conversation est créée ou récupérée. Tous les messages du fil sont liés à cette conversation via conversation_id.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'lead_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → leads.id' },
        { name: 'vendor_auth_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'auth.uid() du vendeur' },
        { name: 'type', type: 'text', nullable: false, default: "'client-vendor'", constraints: "Valeur fixe : 'client-vendor'" },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      ],
      foreignKeys: [
        { column: 'lead_id', referencesTable: 'leads', referencesColumn: 'id', description: 'Lead concerné par cette conversation.', direction: 'outgoing' },
        { column: 'id', referencesTable: 'messages', referencesColumn: 'conversation_id', description: 'Messages de cette conversation.', direction: 'incoming' },
      ],
      indexes: [
        { name: 'conversations_pkey', columns: ['id'], unique: true },
        { name: 'idx_conversations_lead_id', columns: ['lead_id'], unique: false },
        { name: 'idx_conversations_vendor_auth_id', columns: ['vendor_auth_id'], unique: false },
      ],
      policies: [
        { name: 'Authenticated users can read conversations', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert conversations', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update conversations', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      ],
    },
    {
      name: 'messages',
      group: 'Chat',
      description:
        'Messages du système de chat moderne. Liés à une conversation. Supporte les fichiers joints (file_url, file_name, file_type) et la suppression douce (soft delete via deleted_at et deleted_by_role). Indexé sur conversation_id et created_at.',
      quickUnderstanding: {
        role: 'Contenu textuel et fichiers échangés dans une conversation.',
        usedBy: 'Vendeur, Client — via le module ChatView.',
        relatedTables: ['conversations'],
      },
      example:
        'Le client envoie "Bonjour" → 1 message avec sender_role=\'client\'. Le vendeur répond → sender_role=\'vendor\'. Le client supprime son message → deleted_at=now(), deleted_by_role=\'client\', mais la ligne reste en base.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'conversation_id', type: 'uuid', nullable: false, isSystem: true, constraints: 'FK → conversations.id' },
        { name: 'sender_role', type: 'text', nullable: false, constraints: "Valeurs : 'client' | 'vendor' | 'admin'" },
        { name: 'sender_auth_id', type: 'uuid', nullable: true, constraints: 'auth.uid() de l\'expéditeur' },
        { name: 'sender_name', type: 'text', nullable: true },
        { name: 'content', type: 'text', nullable: true },
        { name: 'file_url', type: 'text', nullable: true },
        { name: 'file_name', type: 'text', nullable: true },
        { name: 'file_type', type: 'text', nullable: true },
        { name: 'deleted_at', type: 'timestamptz', nullable: true, constraints: 'NULL = visible, non-NULL = supprimé (soft delete)' },
        { name: 'deleted_by_role', type: 'text', nullable: true, constraints: 'Rôle qui a effectué la suppression' },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      ],
      foreignKeys: [
        { column: 'conversation_id', referencesTable: 'conversations', referencesColumn: 'id', description: 'Conversation parent de ce message.', direction: 'outgoing' },
      ],
      indexes: [
        { name: 'messages_pkey', columns: ['id'], unique: true },
        { name: 'idx_messages_conversation_id', columns: ['conversation_id'], unique: false },
        { name: 'idx_messages_created_at', columns: ['created_at'], unique: false },
      ],
      policies: [
        { name: 'Authenticated users can read messages', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert messages', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update messages', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete messages', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
    },
    {
      name: 'client_messages',
      group: 'Chat',
      description:
        'Système de messagerie direct client ↔ admin/vendeur (legacy). Stocke les messages avec leur expéditeur (client ou admin). Supporte les pièces jointes et la suppression logique via le champ deleted (boolean, pas soft delete horodaté).',
      quickUnderstanding: {
        role: 'Messagerie directe entre un client et l\'équipe CRM.',
        usedBy: 'Client (messagerie), Admin (chat client), Vendeur (optionnel via vendor_id).',
        relatedTables: ['vendors'],
      },
      example:
        'Le client envoie un message → sender=\'client\', client_auth_id=uuid. L\'admin répond → sender=\'admin\'. Le message est lu → read=true.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'sender', type: 'text', nullable: false, default: "'client'", constraints: "Valeurs : 'client' | 'admin' | 'vendor'" },
        { name: 'client_auth_id', type: 'uuid', nullable: false, constraints: 'auth.uid() du client' },
        { name: 'read', type: 'boolean', nullable: false, default: 'false' },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'file_url', type: 'text', nullable: true },
        { name: 'file_name', type: 'text', nullable: true },
        { name: 'file_type', type: 'text', nullable: true },
        { name: 'deleted', type: 'boolean', nullable: false, default: 'false', constraints: 'Suppression logique (pas de horodatage)' },
        { name: 'vendor_id', type: 'uuid', nullable: true, constraints: 'FK → vendors.id (optionnel)' },
      ],
      foreignKeys: [
        { column: 'vendor_id', referencesTable: 'vendors', referencesColumn: 'id', description: 'Vendeur associé à cette conversation client.', direction: 'outgoing' },
      ],
      indexes: [
        { name: 'client_messages_pkey', columns: ['id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can read client_messages', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert client_messages', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update client_messages', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete client_messages', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
    },
    {
      name: 'vendor_admin_messages',
      group: 'Chat',
      description:
        'Messages échangés entre un vendeur et l\'admin. Politique RLS ouverte au rôle public (pas seulement authenticated) pour SELECT, INSERT et UPDATE — conçu pour que les vendeurs non encore entièrement authentifiés puissent communiquer. DELETE possède deux policies : admin (tout supprimer) et vendeur (ses propres messages).',
      quickUnderstanding: {
        role: 'Canal de communication privé entre chaque vendeur et l\'admin.',
        usedBy: 'Vendeur (chat admin), Admin (chat vendeur).',
        relatedTables: ['vendors'],
      },
      example:
        'Le vendeur Jean envoie une question → vendor_auth_id=Jean.uid, sender=\'vendor\'. L\'admin répond → sender=\'admin\'. Jean supprime son message → policy "Vendor can delete own messages" vérifie auth.uid()=vendor_auth_id.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'vendor_auth_id', type: 'uuid', nullable: true, constraints: 'auth.uid() du vendeur' },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'sender', type: 'text', nullable: false, default: "'vendor'", constraints: "Valeurs : 'vendor' | 'admin'" },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'file_url', type: 'text', nullable: true },
        { name: 'file_name', type: 'text', nullable: true },
        { name: 'file_type', type: 'text', nullable: true },
        { name: 'deleted', type: 'boolean', nullable: false, default: 'false' },
        { name: 'vendor_id', type: 'uuid', nullable: true, isSystem: true, constraints: 'FK → vendors.id' },
      ],
      foreignKeys: [
        { column: 'vendor_id', referencesTable: 'vendors', referencesColumn: 'id', description: 'Profil CRM du vendeur.', direction: 'outgoing' },
      ],
      indexes: [
        { name: 'vendor_admin_messages_pkey', columns: ['id'], unique: true },
        { name: 'vendor_admin_messages_vendor_id_idx', columns: ['vendor_id'], unique: false },
      ],
      policies: [
        { name: 'Anyone can select vendor_admin_messages', operation: 'SELECT', roles: ['public'], condition: 'true' },
        { name: 'Anyone can insert vendor_admin_messages', operation: 'INSERT', roles: ['public'], condition: 'true' },
        { name: 'Anyone can update vendor_admin_messages', operation: 'UPDATE', roles: ['public'], condition: 'true' },
        { name: 'Admin can delete any message', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
        { name: 'Vendor can delete own messages', operation: 'DELETE', roles: ['authenticated'], condition: "auth.uid() = vendor_auth_id AND sender = 'vendor'" },
      ],
    },
    {
      name: 'vendor_comments',
      group: 'Chat',
      description:
        'Commentaires internes de l\'admin sur un vendeur. Visible uniquement par les utilisateurs authentifiés. Permet à l\'admin de noter des observations sur chaque vendeur (performance, comportement, etc.).',
      quickUnderstanding: {
        role: 'Notes et commentaires admin sur les vendeurs — usage interne uniquement.',
        usedBy: 'Admin uniquement.',
        relatedTables: ['vendors'],
      },
      example:
        'L\'admin note "Jean est en retard sur ses objectifs du mois" dans le profil du vendeur Jean → 1 ligne vendor_comments avec vendor_id=Jean.id.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'vendor_id', type: 'uuid', nullable: false, isSystem: true, constraints: 'FK → vendors.id' },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      ],
      foreignKeys: [
        { column: 'vendor_id', referencesTable: 'vendors', referencesColumn: 'id', description: 'Vendeur concerné par ce commentaire.', direction: 'outgoing' },
      ],
      indexes: [
        { name: 'vendor_comments_pkey', columns: ['id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can select vendor_comments', operation: 'SELECT', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
        { name: 'Authenticated users can insert vendor_comments', operation: 'INSERT', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
        { name: 'Authenticated users can update vendor_comments', operation: 'UPDATE', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
        { name: 'Authenticated users can delete vendor_comments', operation: 'DELETE', roles: ['authenticated'], condition: 'auth.uid() IS NOT NULL' },
      ],
    },
    {
      name: 'crm_documentation',
      group: 'Documentation interne',
      description:
        'Stockage du contenu des onglets de documentation CRM. Chaque onglet (contexte-chatgpt, technologies, base-de-donnees, etc.) a une ligne. PK sur tab_id (texte). Un trigger met à jour updated_at automatiquement à chaque modification.',
      quickUnderstanding: {
        role: 'Persistence du contenu textuel de la documentation interne du CRM.',
        usedBy: 'Admin — page Documentation CRM.',
        relatedTables: [],
      },
      example:
        'L\'admin modifie l\'onglet "Optimisations" → upsert sur tab_id=\'optimisations\' avec le nouveau contenu. Le trigger met à jour updated_at.',
      columns: [
        { name: 'tab_id', type: 'text', nullable: false, primaryKey: true, constraints: 'Identifiant de l\'onglet (ex: technologies, base-de-donnees)' },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'crm_documentation_pkey', columns: ['tab_id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can read documentation', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert documentation', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update documentation', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      ],
      triggers: [
        { name: 'trg_crm_documentation_updated_at', event: 'BEFORE UPDATE', function: 'update_crm_documentation_updated_at()', description: 'Met à jour updated_at à now() avant chaque UPDATE.' },
      ],
    },
    {
      name: 'crm_notes',
      group: 'Documentation interne',
      description:
        'Notes horodatées associées à une date et un créneau horaire. Utilisées pour les réunions, décisions ou observations internes. Les champs time_start et time_end sont des textes libres (ex: "14:00") pour plus de flexibilité.',
      quickUnderstanding: {
        role: 'Prise de notes datées et horodatées pour les équipes internes.',
        usedBy: 'Admin — onglet Contexte ChatGPT (section Notes).',
        relatedTables: [],
      },
      example:
        'Note de réunion du 17/03 à 10h00-11h30 → note_date=2026-03-17, time_start=\'10:00\', time_end=\'11:30\', title=\'Réunion stratégique\'.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'title', type: 'text', nullable: false, default: "''" },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'note_date', type: 'date', nullable: false, default: 'CURRENT_DATE' },
        { name: 'time_start', type: 'text', nullable: false, default: "''", constraints: 'Format libre — ex: 14:00' },
        { name: 'time_end', type: 'text', nullable: false, default: "''", constraints: 'Format libre — ex: 15:30' },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'crm_notes_pkey', columns: ['id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can select notes', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert notes', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update notes', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete notes', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
    },
    {
      name: 'crm_ideas',
      group: 'Documentation interne',
      description:
        'Tableau d\'idées avec statut et position d\'affichage. Permet de suivre les idées de fonctionnalités ou d\'améliorations. Le champ status permet de filtrer par état (idea, in-progress, done). Le champ position contrôle l\'ordre d\'affichage.',
      quickUnderstanding: {
        role: 'Kanban ou liste d\'idées et améliorations à implémenter.',
        usedBy: 'Admin — onglet Idées.',
        relatedTables: [],
      },
      example:
        'L\'admin crée l\'idée "Ajouter pagination" → status=\'idea\', position=0. Quand le développement commence → status=\'in-progress\'. Une fois livré → status=\'done\'.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'title', type: 'text', nullable: false, default: "''" },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'idea_date', type: 'date', nullable: false, default: 'CURRENT_DATE' },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'status', type: 'text', nullable: false, default: "'idea'", constraints: "Valeurs suggérées : 'idea' | 'in-progress' | 'done'" },
        { name: 'position', type: 'integer', nullable: false, default: '0', constraints: 'Ordre d\'affichage' },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'crm_ideas_pkey', columns: ['id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can read ideas', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert ideas', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update ideas', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete ideas', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
    },
    {
      name: 'crm_context_cards',
      group: 'Documentation interne',
      description:
        'Cartes de contexte affichées dans l\'onglet "Contexte ChatGPT". Chaque carte contient un titre et un contenu. Ordonnées par position. Un trigger met à jour updated_at automatiquement.',
      quickUnderstanding: {
        role: 'Blocs de contexte structurés pour préparer les prompts ChatGPT.',
        usedBy: 'Admin — onglet Contexte ChatGPT.',
        relatedTables: [],
      },
      example:
        'Carte "Stack technique" avec contenu "React + Supabase + Tailwind" → sert de bloc de contexte réutilisable pour les sessions ChatGPT.',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
        { name: 'title', type: 'text', nullable: false, default: "''" },
        { name: 'content', type: 'text', nullable: false, default: "''" },
        { name: 'position', type: 'integer', nullable: false, default: '0', constraints: 'Ordre d\'affichage' },
        { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'crm_context_cards_pkey', columns: ['id'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can select context cards', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert context cards', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update context cards', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete context cards', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
      triggers: [
        { name: 'trg_crm_context_cards_updated_at', event: 'BEFORE UPDATE', function: 'update_crm_context_cards_updated_at()', description: 'Met à jour updated_at à now() avant chaque UPDATE.' },
      ],
    },
    {
      name: 'sidebar_order',
      group: 'Documentation interne',
      description:
        'Persistance de l\'ordre des éléments dans la sidebar de la documentation CRM. PK composite (group_id, item_key) — pas de colonne id. Deux groupes : "docs" (onglets de documentation) et "pages" (pages CRM). Upsert via onConflict=\'group_id,item_key\'.',
      quickUnderstanding: {
        role: 'Sauvegarder l\'ordre de réorganisation des onglets de la documentation.',
        usedBy: 'Admin — mode réorganisation de la documentation CRM.',
        relatedTables: [],
      },
      example:
        'L\'admin glisse l\'onglet "Technologies" en première position → upsert de toutes les lignes du groupe "docs" avec les nouvelles positions. La prochaine ouverture charge l\'ordre sauvegardé.',
      columns: [
        { name: 'group_id', type: 'text', nullable: false, primaryKey: true, constraints: "Valeurs : 'docs' | 'pages'" },
        { name: 'item_key', type: 'text', nullable: false, primaryKey: true, constraints: 'id de l\'onglet ou label de la page' },
        { name: 'position', type: 'integer', nullable: false, default: '0' },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'sidebar_order_pkey', columns: ['group_id', 'item_key'], unique: true },
      ],
      policies: [
        { name: 'Authenticated users can read sidebar order', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can insert sidebar order', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can update sidebar order', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
        { name: 'Authenticated users can delete sidebar order', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
      ],
    },
  ],
  views: [
    {
      name: 'leads_sans_statut_count',
      description: 'Compte le nombre de leads dont le champ statut est vide ou NULL. Utilisé dans le dashboard Vue d\'ensemble pour identifier les leads non qualifiés.',
      sql: "SELECT COUNT(*) FROM leads WHERE statut IS NULL OR statut = ''",
      returns: 'bigint (count)',
    },
  ],
  functions: [
    {
      name: 'cleanup_orphan_import_history()',
      description: 'Appelée après chaque DELETE sur leads. Si un import_history n\'a plus aucun lead associé (import_id), la ligne import_history est supprimée automatiquement. Évite les entrées orphelines dans l\'historique.',
      trigger: 'trg_cleanup_import_history — AFTER DELETE ON leads',
    },
    {
      name: 'update_crm_documentation_updated_at()',
      description: 'Met à jour le champ updated_at de crm_documentation à now() avant chaque UPDATE. Assure la traçabilité des modifications de documentation.',
      trigger: 'trg_crm_documentation_updated_at — BEFORE UPDATE ON crm_documentation',
    },
    {
      name: 'update_crm_context_cards_updated_at()',
      description: 'Met à jour le champ updated_at de crm_context_cards à now() avant chaque UPDATE.',
      trigger: 'trg_crm_context_cards_updated_at — BEFORE UPDATE ON crm_context_cards',
    },
    {
      name: 'find_duplicate_leads()',
      description: 'Détecte les doublons potentiels dans la table leads en comparant les adresses email et numéros de téléphone. Utilisée par le pipeline d\'import CSV pour la déduplication.',
    },
  ],
  globalRules: [
    'RLS activé sur toutes les tables — aucun accès sans policy explicite.',
    'Index conditionnels sur leads.email et leads.telephone : UNIQUE uniquement si non-NULL et non-vide. Permet plusieurs leads sans email sans violer la contrainte.',
    'vendor_admin_messages utilise le rôle "public" pour SELECT/INSERT/UPDATE — accessible sans authentification complète.',
    'sidebar_order a une PK composite (group_id, item_key) — pas de colonne id séparée. L\'upsert utilise onConflict=\'group_id,item_key\'.',
    'crm_documentation utilise tab_id (texte) comme PK — pas d\'UUID. Chaque onglet = 1 ligne avec son identifiant métier.',
    'leads.statut est un texte libre référençant statuts.nom — pas de FK. Si un statut est supprimé, les leads conservent leur valeur texte.',
    'rdv_proposals duplique lead_name, lead_phone, lead_email pour conserver la lisibilité si le lead est supprimé.',
    'messages implémente un soft delete (deleted_at + deleted_by_role). Les messages "supprimés" restent en base et sont filtrés côté application.',
    'Realtime activé sur la table leads — les mises à jour sont propagées en temps réel via Supabase Realtime (Postgres Changes).',
  ],
};

export default DATABASE_DOC;
