export interface BackupTableConfig {
  name: string;
  label: string;
  category: 'core' | 'chat' | 'crm' | 'config';
}

export const CRM_BACKUP_TABLES: BackupTableConfig[] = [
  { name: 'statuts', label: 'Statuts', category: 'core' },
  { name: 'vendors', label: 'Vendeurs', category: 'core' },
  { name: 'registrations', label: 'Inscriptions', category: 'core' },
  { name: 'registration_requests', label: 'Demandes inscription', category: 'core' },
  { name: 'user_preferences', label: 'Preferences utilisateur', category: 'config' },
  { name: 'sidebar_order', label: 'Ordre sidebar', category: 'config' },
  { name: 'import_history', label: 'Historique imports', category: 'core' },
  { name: 'leads', label: 'Leads', category: 'core' },
  { name: 'conversations', label: 'Conversations', category: 'chat' },
  { name: 'messages', label: 'Messages', category: 'chat' },
  { name: 'client_messages', label: 'Messages client', category: 'chat' },
  { name: 'vendor_admin_messages', label: 'Messages vendeur-admin', category: 'chat' },
  { name: 'vendor_comments', label: 'Commentaires vendeur', category: 'chat' },
  { name: 'rdv_proposals', label: 'Propositions RDV', category: 'core' },
  { name: 'crm_amelioration_categories', label: 'Categories ameliorations', category: 'crm' },
  { name: 'crm_ameliorations', label: 'Ameliorations', category: 'crm' },
  { name: 'crm_context_cards', label: 'Cartes contexte', category: 'crm' },
  { name: 'crm_custom_pages', label: 'Pages custom', category: 'crm' },
  { name: 'crm_discovered_tables', label: 'Tables decouvertes', category: 'crm' },
  { name: 'crm_documentation', label: 'Documentation', category: 'crm' },
  { name: 'crm_ideas', label: 'Idees', category: 'crm' },
  { name: 'crm_notes', label: 'Notes', category: 'crm' },
  { name: 'crm_page_checklist_items', label: 'Checklist pages', category: 'crm' },
  { name: 'crm_tasks', label: 'Taches', category: 'crm' },
  { name: 'content_blocks', label: 'Blocs contenu', category: 'crm' },
  { name: 'content_block_infos', label: 'Infos blocs contenu', category: 'crm' },
  { name: 'content_block_tasks', label: 'Taches blocs contenu', category: 'crm' },
  { name: 'doc_tab_labels', label: 'Labels onglets doc', category: 'crm' },
  { name: 'audit_history', label: 'Historique audit', category: 'crm' },
  { name: 'crm_system_categories', label: 'Categories systeme', category: 'crm' },
  { name: 'crm_system_statuses', label: 'Statuts systeme', category: 'crm' },
  { name: 'crm_system_items', label: 'Elements systeme', category: 'crm' },
];

export const CRM_TABLE_NAMES = CRM_BACKUP_TABLES.map((t) => t.name);

export const SCHEMA_VERSION = '20260317042359';

export const RESTORE_ORDER = [
  'statuts',
  'vendors',
  'registrations',
  'registration_requests',
  'user_preferences',
  'sidebar_order',
  'import_history',
  'leads',
  'conversations',
  'messages',
  'client_messages',
  'vendor_admin_messages',
  'vendor_comments',
  'rdv_proposals',
  'crm_amelioration_categories',
  'crm_ameliorations',
  'crm_context_cards',
  'crm_custom_pages',
  'crm_discovered_tables',
  'crm_documentation',
  'crm_ideas',
  'crm_notes',
  'crm_page_checklist_items',
  'crm_tasks',
  'content_blocks',
  'content_block_infos',
  'content_block_tasks',
  'doc_tab_labels',
  'audit_history',
  'crm_system_categories',
  'crm_system_statuses',
  'crm_system_items',
] as const;

export const TABLE_PRIMARY_KEYS: Record<string, string> = {
  statuts: 'id',
  vendors: 'id',
  registrations: 'id',
  registration_requests: 'id',
  user_preferences: 'user_id',
  sidebar_order: 'group_id,item_key',
  import_history: 'id',
  leads: 'id',
  conversations: 'id',
  messages: 'id',
  client_messages: 'id',
  vendor_admin_messages: 'id',
  vendor_comments: 'id',
  rdv_proposals: 'id',
  crm_amelioration_categories: 'id',
  crm_ameliorations: 'id',
  crm_context_cards: 'id',
  crm_custom_pages: 'id',
  crm_discovered_tables: 'table_name',
  crm_documentation: 'tab_id',
  crm_ideas: 'id',
  crm_notes: 'id',
  crm_page_checklist_items: 'id',
  crm_tasks: 'id',
  content_blocks: 'id',
  content_block_infos: 'id',
  content_block_tasks: 'id',
  doc_tab_labels: 'tab_id',
  audit_history: 'id',
  crm_system_categories: 'id',
  crm_system_statuses: 'id',
  crm_system_items: 'id',
};

export interface FkRule {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  optional?: boolean;
}

export const FK_RULES: Record<string, FkRule[]> = {
  leads: [
    { column: 'vendor_id', referencedTable: 'vendors', referencedColumn: 'id', optional: true },
  ],
  conversations: [
    { column: 'lead_id', referencedTable: 'leads', referencedColumn: 'id' },
  ],
  messages: [
    { column: 'conversation_id', referencedTable: 'conversations', referencedColumn: 'id' },
  ],
  client_messages: [
    { column: 'vendor_id', referencedTable: 'vendors', referencedColumn: 'id', optional: true },
  ],
  vendor_admin_messages: [
    { column: 'vendor_id', referencedTable: 'vendors', referencedColumn: 'id', optional: true },
  ],
  vendor_comments: [
    { column: 'vendor_id', referencedTable: 'vendors', referencedColumn: 'id' },
  ],
  rdv_proposals: [
    { column: 'lead_id', referencedTable: 'leads', referencedColumn: 'id' },
    { column: 'vendor_id', referencedTable: 'vendors', referencedColumn: 'id' },
  ],
  crm_ameliorations: [
    { column: 'category_id', referencedTable: 'crm_amelioration_categories', referencedColumn: 'id', optional: true },
  ],
  content_block_infos: [
    { column: 'block_id', referencedTable: 'content_blocks', referencedColumn: 'id' },
  ],
  content_block_tasks: [
    { column: 'block_id', referencedTable: 'content_blocks', referencedColumn: 'id' },
  ],
  crm_system_categories: [
    { column: 'parent_id', referencedTable: 'crm_system_categories', referencedColumn: 'id', optional: true },
  ],
  crm_system_items: [
    { column: 'category_id', referencedTable: 'crm_system_categories', referencedColumn: 'id' },
    { column: 'status_id', referencedTable: 'crm_system_statuses', referencedColumn: 'id', optional: true },
  ],
};

export const BATCH_SIZE = 500;
