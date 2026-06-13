import { useState } from 'react';
import { MousePointerClick, ArrowRight, Paintbrush, Type, MapPin, ChevronDown } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../contexts/editorModeHelpers';
import type { EditorPanelTokens } from './editorPanelTheme';
import type { ButtonTargetDef } from '../../contexts/editorModeTypes';

interface ButtonTab {
  id: string;
  label: string;
  buttons: ButtonTargetDef[];
}

interface ButtonSection {
  title: string;
  tabs: ButtonTab[];
}

const BUTTON_SECTIONS: ButtonSection[] = [
  {
    title: 'Principal',
    tabs: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        buttons: [
          { id: 'btn_voir_audit', label: "Voir l'audit" },
        ],
      },
      {
        id: 'logo',
        label: 'Logo',
        buttons: [
          { id: 'btn_generate_logo', label: 'Generer logo' },
          { id: 'btn_reorganize_logos', label: 'Reorganiser' },
          { id: 'btn_download_logo', label: 'Telecharger' },
          { id: 'btn_resize_logo', label: 'Taille' },
          { id: 'btn_select_logo_active', label: 'Selectionner comme actif' },
        ],
      },
      { id: 'site-talvex', label: 'Site', buttons: [] },
      { id: 'application', label: 'Application', buttons: [] },
      { id: 'themes', label: 'Themes', buttons: [] },
      { id: 'tuto', label: 'Tuto', buttons: [] },
    ],
  },
  {
    title: 'Gestion',
    tabs: [
      { id: 'admins', label: 'Liste admins', buttons: [] },
      { id: 'mon-compte', label: 'Mon compte', buttons: [] },
      { id: 'crm-societe', label: 'CRM Societe', buttons: [] },
      { id: 'sites', label: 'Sites & Domaines', buttons: [] },
      { id: 'statuts', label: 'Statuts', buttons: [] },
    ],
  },
  {
    title: 'Contact',
    tabs: [
      { id: 'chat-admin', label: 'Chat Admin', buttons: [] },
    ],
  },
  {
    title: 'Outils & Systeme',
    tabs: [
      { id: 'api-ia', label: 'API IA', buttons: [] },
      { id: 'ameliorations', label: 'Ameliorations', buttons: [] },
      { id: 'fonctions-talvex', label: 'Fonctions Talvex', buttons: [] },
      { id: 'cerveau-ia', label: 'Cerveau IA SA', buttons: [] },
    ],
  },
  {
    title: 'Maintenance',
    tabs: [
      { id: 'system', label: 'System', buttons: [] },
      { id: 'documentation-crm', label: 'Documentation CRM', buttons: [] },
      { id: 'tests-systeme', label: 'Tests Systeme', buttons: [] },
    ],
  },
];

const BUTTON_TARGETS: ButtonTargetDef[] = BUTTON_SECTIONS.flatMap(s =>
  s.tabs.flatMap(t => t.buttons),
);

interface Props {
  ctx: ReturnType<typeof useEditorMode>;
  pt: EditorPanelTokens;
}

export default function EditorBoutonsContent({ ctx, pt }: Props) {
  const [openTabs, setOpenTabs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of BUTTON_SECTIONS) {
      for (const tab of section.tabs) {
        if (tab.buttons.length > 0) initial.add(tab.id);
      }
    }
    return initial;
  });

  const toggleTab = (tabId: string) => {
    setOpenTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const sectionsWithButtons = BUTTON_SECTIONS.filter(s =>
    s.tabs.some(t => t.buttons.length > 0),
  );

  return (
    <div className="px-1.5 py-1 flex flex-col gap-0.5">
      {sectionsWithButtons.map(section => (
        <div key={section.title}>
          <div className="px-2.5 pt-2.5 pb-1">
            <span
              className="text-[8px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: pt.accent.text }}
            >
              {section.title}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 px-0.5">
            {section.tabs.map(tab => {
              const hasButtons = tab.buttons.length > 0;
              const isOpen = openTabs.has(tab.id);
              const btnCount = tab.buttons.length;
              const customizedCount = tab.buttons.filter(
                b => ctx.buttonOverrides[b.id]?.bg || ctx.buttonOverrides[b.id]?.textColor,
              ).length;

              return (
                <div key={tab.id}>
                  <button
                    onClick={() => hasButtons && toggleTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all duration-150 ${hasButtons ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
                    style={{
                      background: isOpen && hasButtons ? pt.surface.secondary : 'transparent',
                      color: isOpen && hasButtons ? pt.text.primary : pt.text.secondary,
                      border: isOpen && hasButtons ? `1px solid ${pt.surface.border}` : '1px solid transparent',
                    }}
                    disabled={!hasButtons}
                  >
                    {hasButtons && (
                      <ChevronDown
                        className="w-3 h-3 flex-shrink-0 transition-transform duration-200"
                        style={{
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                          color: isOpen ? pt.accent.solid : pt.label.muted,
                        }}
                      />
                    )}
                    <span className="flex-1 text-left">{tab.label}</span>
                    {hasButtons && (
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        {customizedCount > 0 && (
                          <span
                            className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: pt.accent.bg, color: pt.accent.text }}
                          >
                            {customizedCount}/{btnCount}
                          </span>
                        )}
                        <span
                          className="text-[8px] font-bold px-1 py-0.5 rounded"
                          style={{ color: pt.label.muted }}
                        >
                          {btnCount}
                        </span>
                      </span>
                    )}
                  </button>

                  {hasButtons && isOpen && (
                    <div className="flex flex-col gap-1 pl-4 pr-0.5 pt-1 pb-1.5">
                      {tab.buttons.map(btn => {
                        const active = ctx.activeButtonTarget === btn.id;
                        const ovr = ctx.buttonOverrides[btn.id];
                        const hasBg = !!ovr?.bg;
                        const hasText = !!ovr?.textColor;
                        return (
                          <div key={btn.id} className="flex items-center gap-1">
                            <button
                              onClick={() => ctx.setActiveButtonTarget(active ? null : btn.id)}
                              className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 hover:scale-[1.01]"
                              style={{
                                background: active
                                  ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
                                  : pt.surface.secondary,
                                color: active ? '#fff' : pt.text.primary,
                                border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
                                boxShadow: active
                                  ? `0 4px 16px ${pt.accent.bg}`
                                  : '0 1px 3px rgba(0,0,0,0.08)',
                              }}
                            >
                              <MousePointerClick className="w-3 h-3 flex-shrink-0" />
                              <span className="flex-1 text-left truncate">{btn.label}</span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                {hasBg && (
                                  <span className="flex items-center gap-0.5" title="Fond">
                                    <Paintbrush className="w-2 h-2 opacity-50" />
                                    <span
                                      className="w-3 h-3 rounded-md"
                                      style={{
                                        background: resolveZoneBg(ovr.bg!),
                                        border: `1px solid ${pt.swatchBorder}`,
                                      }}
                                    />
                                  </span>
                                )}
                                {hasText && (
                                  <span className="flex items-center gap-0.5" title="Texte">
                                    <Type className="w-2 h-2 opacity-50" />
                                    <span
                                      className="w-3 h-3 rounded-md"
                                      style={{
                                        background: ovr.textColor!,
                                        border: `1px solid ${pt.swatchBorder}`,
                                      }}
                                    />
                                  </span>
                                )}
                              </span>
                              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); ctx.locateButton(btn.id); }}
                              title="Localiser ce bouton"
                              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105"
                              style={{
                                background: pt.surface.secondary,
                                border: `1px solid ${pt.surface.border}`,
                                color: pt.text.secondary,
                              }}
                            >
                              <MapPin className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mx-2 mt-2 mb-1">
        <p className="text-[9px] leading-relaxed" style={{ color: pt.label.muted }}>
          Selectionne un bouton, puis choisis fond ou texte dans le panneau Couleur.
        </p>
      </div>
    </div>
  );
}

export { BUTTON_TARGETS, BUTTON_SECTIONS };