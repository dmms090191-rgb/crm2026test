export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
export const ACCEPT_STRING = '.png,.jpg,.jpeg,.webp,.svg';

export function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/company-logos/';
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}
