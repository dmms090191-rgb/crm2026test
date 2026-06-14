import type { AiApi } from '../SAApiIaModal';

export interface CreditInfo {
  credit: string;
  checkedAt: string;
  status: string | null;
}

export function maskValue(val: string | null, visibleEnd = 4): string {
  if (!val) return '';
  if (val.length <= visibleEnd) return '*'.repeat(val.length);
  return '*'.repeat(val.length - visibleEnd) + val.slice(-visibleEnd);
}

export function formatApiForCopy(api: AiApi, creditMap?: Record<string, CreditInfo>): string {
  const lines: string[] = [];
  lines.push(`Nom : ${api.name}`);
  lines.push(`Lien : ${api.url || 'Non renseigne'}`);
  lines.push(`Email / ID : ${api.account_email || 'Non renseigne'}`);
  lines.push(`Connexion Gmail : ${api.gmail_login ? 'Oui' : 'Non'}`);
  if (!api.gmail_login && api.account_password) lines.push(`Mot de passe : Masque`);
  lines.push(`ID API : ${api.api_id ? 'Configuree' : 'Non renseignee'}`);
  lines.push(`Cle API : ${api.api_key ? 'Configuree' : 'Non renseignee'}`);
  const credit = creditMap?.[api.id]?.credit ?? api.remaining_credit;
  lines.push(`Credit : ${credit || 'Non renseigne'}`);
  lines.push(`Cout : ${api.cost || 'Non renseigne'}`);
  lines.push(`Date achat : ${api.purchase_date || 'Non renseignee'}`);
  lines.push(`Notes : ${api.notes || '-'}`);
  return lines.join('\n');
}

export function formatAllApisForCopy(apis: AiApi[], creditMap?: Record<string, CreditInfo>): string {
  const sep = '\n\n----------------------------\n\n';
  return 'API IA TALVEX\n\n' + apis.map(a => formatApiForCopy(a, creditMap)).join(sep);
}
