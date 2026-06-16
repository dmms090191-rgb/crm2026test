import { usePanelHiddenTabs } from './usePanelHiddenTabs';

export function useHiddenNotifCards(
  companyId?: string | null,
  targetUserId?: string | null,
) {
  return usePanelHiddenTabs('admin_notifications', companyId, targetUserId);
}
