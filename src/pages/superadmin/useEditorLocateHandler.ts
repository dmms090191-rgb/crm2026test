import { useEffect } from 'react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import type { SAView } from './SuperAdminSidebar';

const BUTTON_VIEW_MAP: Record<string, SAView> = {
  btn_voir_audit: 'dashboard',
  btn_generate_logo: 'logo',
  btn_reorganize_logos: 'logo',
  btn_download_logo: 'logo',
  btn_resize_logo: 'logo',
  btn_select_logo_active: 'logo',
};

export function useEditorLocateHandler(activeView: SAView, setActiveView: (v: SAView) => void) {
  const editorCtx = useEditorMode();

  useEffect(() => {
    editorCtx.registerLocateHandler((btnId: string) => {
      const targetView = BUTTON_VIEW_MAP[btnId];
      if (targetView && activeView !== targetView) setActiveView(targetView);
      const scrollToBtn = () => {
        let attempts = 0;
        const poll = () => {
          const el = document.querySelector(`[data-editor-btn-id="${btnId}"]`);
          if (!el) { if (++attempts < 40) setTimeout(poll, 120); return; }
          requestAnimationFrame(() => {
            const main = el.closest('main');
            if (main) {
              const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
              main.scrollTo({ top: Math.max(0, r.top - m.top + main.scrollTop - m.clientHeight / 2 + r.height / 2), behavior: 'smooth' });
            } else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        };
        setTimeout(poll, targetView && activeView !== targetView ? 400 : 100);
      };
      scrollToBtn();
    });
    return () => { editorCtx.registerLocateHandler(null); };
  }, [activeView, editorCtx]);
}
