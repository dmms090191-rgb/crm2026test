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
