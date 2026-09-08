import type { ComponentProps } from 'react';
import AdminEditorPanels from './dashboard/AdminEditorPanels';
import EditorSaveThemeModal from '../../components/editor/EditorSaveThemeModal';

/**
 * Les props des panneaux sont reprises telles quelles depuis AdminEditorPanels :
 * elles restent donc exactes par construction, sans duplication de types.
 */
interface Props extends ComponentProps<typeof AdminEditorPanels> {
  saveThemeOpen: boolean;
  setSaveThemeOpen: (v: boolean) => void;
  effectiveAdminId: string | null;
  companyId: string | null;
}

/** Panneaux d'editeur et modale de sauvegarde de theme. Extrait tel quel. */
export default function AdminEditorSlots({
  tabsVisible, setTabsVisible, tabsCollapsed, setTabsCollapsed,
  fondsVisible, setFondsVisible, couleurVisible, setCouleurVisible,
  savedVisible, setSavedVisible, savedRefreshKey, setSavedRefreshKey,
  getPositionFor, updatePositionFor, contenuPos,
  logoZoneRef, sidebarBodyRef, topbarZoneRef, contentZoneRef,
  saveThemeOpen, setSaveThemeOpen, effectiveAdminId, companyId,
}: Props) {
  return (
    <>
      <AdminEditorPanels
        tabsVisible={tabsVisible} setTabsVisible={setTabsVisible}
        tabsCollapsed={tabsCollapsed} setTabsCollapsed={setTabsCollapsed}
        fondsVisible={fondsVisible} setFondsVisible={setFondsVisible}
        couleurVisible={couleurVisible} setCouleurVisible={setCouleurVisible}
        savedVisible={savedVisible} setSavedVisible={setSavedVisible}
        savedRefreshKey={savedRefreshKey} setSavedRefreshKey={setSavedRefreshKey}
        getPositionFor={getPositionFor} updatePositionFor={updatePositionFor}
        contenuPos={contenuPos}
        logoZoneRef={logoZoneRef} sidebarBodyRef={sidebarBodyRef}
        topbarZoneRef={topbarZoneRef} contentZoneRef={contentZoneRef}
      />
      <EditorSaveThemeModal open={saveThemeOpen} onClose={() => setSaveThemeOpen(false)} ownerUserId={effectiveAdminId} ownerCompanyId={companyId} />
    </>
  );
}
