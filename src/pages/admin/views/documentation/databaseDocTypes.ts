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
  group: 'Core CRM' | 'Chat' | 'Documentation interne' | 'Non classe';
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
