import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogIn, ArrowLeft } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { ImportedLead, StatutDef } from './types';
import { getStatutCfg, FALLBACK_COLOR, getInitials, gradients } from './utils';
import CrmPinDisplay from './CrmPinDisplay';
import CrmCommentsTab from './CrmCommentsTab';

type TabId = 'mot-de-passe' | 'commentaires';

interface DetailModalProps {
  lead: ImportedLead;
  gradIndex: number;
  onClose: () => void;
  statutDefs: StatutDef[];
  onBack?: () => void;
}

export default function DetailModal({ lead, gradIndex, onClose, statutDefs, onBack }: DetailModalProps) {
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<TabId>('commentaires');
  const [leadData, setLeadData] = useState<Record<string, string>>(lead.data);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const statut = lead.statut ?? '';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
  const initials = getInitials(nom, prenom);
  const grad = gradients[gradIndex % gradients.length];
  const mdp = leadData['MotDePasse'] ?? '';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'commentaires', label: 'Commentaires' },
    { id: 'mot-de-passe', label: 'Mot de passe' },
  ];

  const handleConnect = () => {
    window.open(`mailto:${email}`, '_blank');
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="flex items-center justify-center px-4 py-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: 'min(26rem, calc(100vw - 64px))',
          maxHeight: 'calc(100vh - 48px)',
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="h-1 w-full flex-shrink-0" style={{ background: grad }} />

        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
            onMouseEnter={e => { e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; e.currentTarget.style.color = tokens.modal.closeBtnHoverText; }}
            onMouseLeave={e => { e.currentTarget.style.background = tokens.modal.closeBtnBg; e.currentTarget.style.color = tokens.modal.closeBtnText; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-4 flex-shrink-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: grad, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', color: tokens.text.primary }}
          >
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight truncate" style={{ color: tokens.modal.title }}>
              {prenom || ''} {nom || '\u2014'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
                {statut}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
              style={
                tab === t.id
                  ? { color: tokens.accent.text, borderBottom: `2px solid ${tokens.accent.text}`, marginBottom: '-1px' }
                  : { color: tokens.text.quaternary }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-5 flex-1 overflow-y-auto min-h-0">
          {tab === 'commentaires' && (
            <CrmCommentsTab leadId={lead.id} leadData={leadData} onDataUpdate={setLeadData} />
          )}
          {tab === 'mot-de-passe' && (
            <CrmPinDisplay password={mdp} leadId={lead.id} leadData={leadData} onPasswordUpdate={setLeadData} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}
          >
            <LogIn className="w-3 h-3" />
            Connecter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
