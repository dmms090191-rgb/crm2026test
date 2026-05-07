import type { TableDoc } from './databaseDocTypes';

export const CHAT_TABLES: TableDoc[] = [
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
];
