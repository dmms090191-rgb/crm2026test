import { Image, Palette, Paintbrush, FolderOpen, Save, SaveAll, Loader2, Check, ArrowLeft, Download } from 'lucide-react';

export type CalquerTab = 'logo' | 'couleur' | 'couleur-logo';

interface Props {
  activeTab: CalquerTab;
  onTabChange: (tab: CalquerTab) => void;
  hasImage: boolean;
  hasTransformed: boolean;
  onLoad: () => void;
  onSave: () => void;
  onDownload: () => void;
  hasActiveSession: boolean;
  onSaveChanges: () => void;
  savingChanges: boolean;
  changesSaved: boolean;
  onBackToWelcome?: () => void;
}

const TABS: { key: CalquerTab; label: string; icon: typeof Image }[] = [
  { key: 'logo', label: 'Logo', icon: Image },
  { key: 'couleur', label: 'Arriere-plan', icon: Palette },
  { key: 'couleur-logo', label: 'Couleur logo', icon: Paintbrush },
];

export default function CalquerLogoTabBar({
  activeTab, onTabChange, hasImage, hasTransformed,
  onLoad, onSave, onDownload,
  hasActiveSession, onSaveChanges, savingChanges, changesSaved, onBackToWelcome,
}: Props) {
  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5"
      style={{
        background: 'rgba(15,23,42,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
      {onBackToWelcome && (
        <button onClick={onBackToWelcome}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 mr-1"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ArrowLeft className="w-3 h-3" />
          Retour
        </button>
      )}
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <button key={key} onClick={() => onTabChange(key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
            style={{
              background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
              color: active ? '#60a5fa' : 'rgba(148,163,184,0.6)',
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}

      <div className="flex-1" />

      {hasTransformed && (
        <button onClick={onDownload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#34d399',
          }}>
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
      )}

      <button onClick={onLoad}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.25)',
          color: '#60a5fa',
        }}>
        <FolderOpen className="w-3.5 h-3.5" />
        Charger
      </button>

      <button onClick={onSave} disabled={!hasImage}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:enabled:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: hasImage ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasImage ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: hasImage ? '#4ade80' : 'rgba(148,163,184,0.4)',
        }}>
        <Save className="w-3.5 h-3.5" />
        Sauvegarder
      </button>

      {hasActiveSession && (
        <button onClick={onSaveChanges} disabled={savingChanges}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:enabled:scale-[1.02] disabled:opacity-60"
          style={{
            background: changesSaved ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${changesSaved ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.3)'}`,
            color: changesSaved ? '#4ade80' : '#fbbf24',
          }}>
          {savingChanges ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : changesSaved ? <Check className="w-3.5 h-3.5" />
            : <SaveAll className="w-3.5 h-3.5" />}
          {savingChanges ? 'Mise a jour...' : changesSaved ? 'Sauvegarde' : 'Sauvegarder'}
        </button>
      )}
    </div>
  );
}
