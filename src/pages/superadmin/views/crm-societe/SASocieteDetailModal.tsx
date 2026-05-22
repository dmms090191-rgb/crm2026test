import { useState } from 'react';
import { X, MessageSquare, Info } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import SASocieteCommentsTab from './SASocieteCommentsTab';
import SASocieteInfoTab from './SASocieteInfoTab';

interface Props {
  prospect: Prospect;
  saStatuts: SAStatut[];
  onClose: () => void;
}

const TABS = [
  { key: 'comments', label: 'Commentaires', icon: MessageSquare },
  { key: 'info', label: 'Informations', icon: Info },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function SASocieteDetailModal({ prospect, saStatuts, onClose }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<TabKey>('comments');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '90vh',
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: t.modal.shadow,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: t.text.tertiary }}>Detail societe</p>
            <p className="text-sm font-bold truncate mt-0.5" style={{ color: t.modal.title }}>{prospect.nom}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1 pt-2 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all relative"
                style={{ color: isActive ? '#0ea5e9' : t.text.tertiary }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#0ea5e9' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {activeTab === 'comments' && <SASocieteCommentsTab societeId={prospect.id} />}
          {activeTab === 'info' && <SASocieteInfoTab prospect={prospect} saStatuts={saStatuts} />}
        </div>
      </div>
    </div>
  );
}
