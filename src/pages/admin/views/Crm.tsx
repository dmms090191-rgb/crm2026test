import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Users,
  Phone,
  Mail,
  X,
  KeyRound,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  LogIn,
  Trash2,
  ArrowRightLeft,
  UserCheck,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ImportedLead {
  id: string;
  data: Record<string, string>;
  imported_at: string;
  statut?: string;
  actif?: boolean;
  vendor_id?: string | null;
}

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ImpersonatedClient {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface ChatLead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
}

interface StatutDef {
  id: string;
  nom: string;
  couleur: string;
}

const cardStyle = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const colSep = { borderRight: '1px solid rgba(255,255,255,0.06)' };

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function colorWithAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getStatutCfg(couleur: string) {
  return {
    color: couleur,
    bg: colorWithAlpha(couleur, 0.08),
    border: colorWithAlpha(couleur, 0.22),
    dot: couleur,
  };
}

const FALLBACK_COLOR = '#38bdf8';

function getInitials(nom: string, prenom: string) {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

const gradients = [
  'linear-gradient(135deg, #22d3ee, #2563eb)',
  'linear-gradient(135deg, #60a5fa, #1d4ed8)',
  'linear-gradient(135deg, #2dd4bf, #0891b2)',
  'linear-gradient(135deg, #38bdf8, #0284c7)',
  'linear-gradient(135deg, #34d399, #0d9488)',
];

interface DetailModalProps {
  lead: ImportedLead;
  gradIndex: number;
  onClose: () => void;
  statutDefs: StatutDef[];
}

function DetailModal({ lead, gradIndex, onClose, statutDefs }: DetailModalProps) {
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const mdp = lead.data['MotDePasse'] ?? '';
  const statut = lead.statut ?? '';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
  const initials = getInitials(nom, prenom);
  const grad = gradients[gradIndex % gradients.length];

  const [comment, setComment] = useState('');
  const [savedComment, setSavedComment] = useState(lead.data['Commentaire'] ?? '');
  const [savingComment, setSavingComment] = useState(false);
  const [showMdp, setShowMdp] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComment(savedComment);
  }, [savedComment]);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleSaveComment = async () => {
    setSavingComment(true);
    const newData = { ...lead.data, Commentaire: comment };
    await supabase.from('leads').update({ data: newData }).eq('id', lead.id);
    setSavedComment(comment);
    setSavingComment(false);
  };

  const handleConnect = () => {
    window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1420 0%, #080e18 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="h-1 w-full"
          style={{ background: grad }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-4 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: grad, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          >
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <h3 className="text-white text-lg font-bold leading-tight truncate">
              {prenom || ''} {nom || '—'}
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

        <div className="px-6 pb-4 space-y-2.5">
          <InfoRow
            icon={<Mail className="w-3.5 h-3.5" />}
            label="Email"
            value={email || '—'}
            onCopy={email ? () => handleCopy(email, 'email') : undefined}
            copied={copied === 'email'}
          />
          <InfoRow
            icon={<Phone className="w-3.5 h-3.5" />}
            label="Téléphone"
            value={tel || '—'}
            onCopy={tel ? () => handleCopy(tel, 'tel') : undefined}
            copied={copied === 'tel'}
          />
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2.5">
              <span style={{ color: '#fbbf24' }}>
                <KeyRound className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-0.5">Mot de passe</p>
                <p className="text-sm font-mono text-slate-300">
                  {showMdp ? (mdp || '—') : (mdp ? '••••••' : '—')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mdp && (
                <>
                  <button
                    onClick={() => setShowMdp(v => !v)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs font-bold"
                    style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}
                    title={showMdp ? 'Masquer' : 'Afficher'}
                  >
                    {showMdp ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopy(mdp, 'mdp')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'rgba(251,191,36,0.08)', color: copied === 'mdp' ? '#34d399' : '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}
                    title="Copier"
                  >
                    {copied === 'mdp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600">Commentaire</span>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Ajouter une note sur ce lead..."
              rows={3}
              className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-700 resize-none focus:outline-none leading-relaxed"
            />
            {comment !== savedComment && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveComment}
                  disabled={savingComment}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(34,211,238,0.1)',
                    color: '#22d3ee',
                    border: '1px solid rgba(34,211,238,0.2)',
                    opacity: savingComment ? 0.6 : 1,
                  }}
                >
                  {savingComment ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: '#34d399' }}
          >
            <LogIn className="w-3 h-3" />
            Connecter
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-slate-600">{icon}</span>
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-0.5">{label}</p>
          <p className="text-xs text-slate-300">{value}</p>
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: copied ? '#34d399' : 'rgba(255,255,255,0.2)', background: 'transparent' }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.color = '#22d3ee'; e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; } }}
          title="Copier"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

interface TransferModalProps {
  count: number;
  onClose: () => void;
  onConfirm: (vendorId: string | null) => void;
}

function TransferModal({ count, onClose, onConfirm }: TransferModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('vendors').select('id, first_name, last_name, email').order('last_name', { ascending: true }).then(({ data }) => {
      setVendors((data ?? []) as Vendor[]);
      setLoading(false);
    });
  }, []);

  const q = search.toLowerCase();
  const filtered = vendors.filter(v => {
    const full = `${v.first_name} ${v.last_name}`.toLowerCase();
    const fullRev = `${v.last_name} ${v.first_name}`.toLowerCase();
    return full.includes(q) || fullRev.includes(q) || (v.email ?? '').toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (selected === undefined) return;
    setTransferring(true);
    await onConfirm(selected);
    setTransferring(false);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1420 0%, #080e18 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #22d3ee, #3b82f6)' }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <ArrowRightLeft className="w-4 h-4" style={{ color: '#22d3ee' }} />
            </div>
            <div>
              <h3 className="text-white text-base font-bold">Transférer des leads</h3>
              <p className="text-slate-500 text-xs">{count} lead{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Rechercher un vendeur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-700 focus:outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        <div className="px-6 pb-4 space-y-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelected(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: selected === null ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selected === null ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">Admin</p>
                  <p className="text-[10px] text-slate-600">Retirer d'un vendeur</p>
                </div>
                {selected === null && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#22d3ee' }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>

              {filtered.map(vendor => {
                const isSelected = selected === vendor.id;
                const initials = `${vendor.first_name?.[0] ?? ''}${vendor.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <button
                    key={vendor.id}
                    onClick={() => setSelected(vendor.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)' }}>
                      {initials || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{vendor.first_name} {vendor.last_name}</p>
                      <p className="text-[10px] text-slate-600 truncate">{vendor.email}</p>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#22d3ee' }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}

              {!loading && filtered.length === 0 && search && (
                <p className="text-center text-slate-600 text-xs py-4">Aucun vendeur trouvé</p>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected === undefined || transferring}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: selected === undefined ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.12)',
              color: selected === undefined ? 'rgba(34,211,238,0.3)' : '#22d3ee',
              border: selected === undefined ? '1px solid rgba(34,211,238,0.1)' : '1px solid rgba(34,211,238,0.25)',
              opacity: transferring ? 0.7 : 1,
            }}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {transferring ? 'Transfert...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CrmProps {
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
}

export default function Crm({ onConnectAsClient, onOpenChat }: CrmProps) {
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [statutDefs, setStatutDefs] = useState<StatutDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVendor, setFilterVendor] = useState<string>('tous');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterTel, setFilterTel] = useState('');
  const [filterPrenom, setFilterPrenom] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [detailLead, setDetailLead] = useState<{ lead: ImportedLead; index: number } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const loadStatuts = useCallback(async () => {
    const { data } = await supabase.from('statuts').select('id, nom, couleur').order('created_at', { ascending: true });
    setStatutDefs((data ?? []) as StatutDef[]);
  }, []);

  const loadVendors = useCallback(async () => {
    const { data } = await supabase.from('vendors').select('id, first_name, last_name, email').order('last_name', { ascending: true });
    setVendors((data ?? []) as Vendor[]);
  }, []);

  const handleTransfer = async (vendorId: string | null) => {
    const ids = Array.from(selected);
    await supabase.from('leads').update({ vendor_id: vendorId }).in('id', ids);
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, vendor_id: vendorId } : l));
    setSelected(new Set());
    setShowTransfer(false);
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, data, imported_at, statut, actif, vendor_id')
      .order('imported_at', { ascending: false });
    setLeads((data ?? []) as ImportedLead[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); loadStatuts(); loadVendors(); }, [load, loadStatuts, loadVendors]);

  useEffect(() => {
    const leadsChannel = supabase
      .channel('leads-crm')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        load
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'leads' },
        (payload) => {
          setLeads(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as ImportedLead;
          setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
        }
      )
      .subscribe();
    const statutsChannel = supabase
      .channel('statuts-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuts' }, loadStatuts)
      .subscribe();
    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(statutsChannel);
    };
  }, [load, loadStatuts]);

  const handleStatut = async (id: string, statut: string) => {
    const prev = leads.find(l => l.id === id)?.statut;
    setLeads(ls => ls.map(l => l.id === id ? { ...l, statut } : l));
    const { error } = await supabase.from('leads').update({ statut }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, statut: prev } : l));
  };

  const handleToggleActif = async (id: string, current: boolean) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: !current } : l));
    const { error } = await supabase.from('leads').update({ actif: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: current } : l));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (detailLead?.lead.id === id) setDetailLead(null);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await supabase.from('leads').delete().in('id', ids);
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    setDeleting(false);
  };

  const filtered = leads
    .filter(l => {
      const nom = (l.data['Nom'] ?? '').toLowerCase();
      const prenom = (l.data['Prenom'] ?? '').toLowerCase();
      const email = (l.data['Email'] ?? '').toLowerCase();
      const tel = (l.data['Telephone'] ?? '').toLowerCase();
      if (filterNom && !nom.includes(filterNom.toLowerCase())) return false;
      if (filterPrenom && !prenom.includes(filterPrenom.toLowerCase())) return false;
      if (filterEmail && !email.includes(filterEmail.toLowerCase())) return false;
      if (filterTel && !tel.includes(filterTel.toLowerCase())) return false;
      if (statutFilter === 'sans_statut') {
        const nomStatut = l.statut ?? '';
        const statutConnu = statutDefs.some(s => s.nom === nomStatut);
        if (nomStatut !== '' && statutConnu) return false;
      } else if (statutFilter !== 'Tous' && (l.statut ?? '') !== statutFilter) return false;
      if (filterVendor === 'admin' && l.vendor_id !== null) return false;
      if (filterVendor !== 'tous' && filterVendor !== 'admin' && l.vendor_id !== filterVendor) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.imported_at).getTime();
      const db = new Date(b.imported_at).getTime();
      return sortOrder === 'recent' ? db - da : da - db;
    });

  const filteredIds = filtered.map(l => l.id);
  const allChecked = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const someChecked = filteredIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => {
        const n = new Set(prev);
        filteredIds.forEach(id => n.delete(id));
        return n;
      });
    } else {
      setSelected(prev => {
        const n = new Set(prev);
        filteredIds.forEach(id => n.add(id));
        return n;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">CRM</h2>
          <p className="text-slate-600 text-xs mt-0.5">Gestion de la relation client</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => setShowTransfer(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  color: '#22d3ee',
                  border: '1px solid rgba(34,211,238,0.25)',
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transférer {selected.size} lead{selected.size > 1 ? 's' : ''}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.25)',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </button>
            </>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}>
            <Users className="w-3.5 h-3.5" />
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">Filtres de recherche</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <select
                value={filterVendor}
                onChange={e => setFilterVendor(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl text-xs text-slate-300 focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <option value="tous" style={{ background: '#0a0f1a' }}>Tous les vendeurs</option>
                <option value="admin" style={{ background: '#0a0f1a' }}>Admin (sans vendeur)</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#0a0f1a' }}>{v.first_name} {v.last_name}</option>
                ))}
              </select>
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={filterEmail}
                onChange={e => setFilterEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Rechercher par numero..."
                value={filterTel}
                onChange={e => setFilterTel(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div className="relative">
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Rechercher par prenom..."
                value={filterPrenom}
                onChange={e => setFilterPrenom(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={filterNom}
                onChange={e => setFilterNom(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div className="relative">
              <select
                value={statutFilter}
                onChange={e => setStatutFilter(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl text-xs text-slate-300 focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <option value="Tous" style={{ background: '#0a0f1a' }}>Tous les statuts</option>
                {statutDefs.map(s => (
                  <option key={s.id} value={s.nom} style={{ background: '#0a0f1a' }}>{s.nom}</option>
                ))}
                <option value="sans_statut" style={{ background: '#0a0f1a' }}>Sans statut</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')}
                className="w-full pl-3 pr-7 py-2 rounded-xl text-xs text-slate-300 focus:outline-none appearance-none cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <option value="recent" style={{ background: '#0a0f1a' }}>Plus récent</option>
                <option value="ancien" style={{ background: '#0a0f1a' }}>Plus ancien</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Users className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-slate-600 text-sm">Aucun lead importé</p>
            <p className="text-slate-700 text-xs">Importez un fichier CSV depuis l'onglet Import de leads</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <th className="px-5 py-3 w-10" style={colSep}>
                      <CheckBox
                        checked={allChecked}
                        indeterminate={!allChecked && someChecked}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 w-12" style={colSep}>#</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Nom</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Prénom</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Email</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Téléphone</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Statut</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Vendeur</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600" style={colSep}>Accès</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const nom = lead.data['Nom'] ?? '';
                    const prenom = lead.data['Prenom'] ?? '';
                    const email = lead.data['Email'] ?? '';
                    const tel = lead.data['Telephone'] ?? '';
                    const statut = lead.statut ?? '';
                    const statutDef = statutDefs.find(s => s.nom === statut);
                    const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
                    const initials = getInitials(nom, prenom);
                    const grad = gradients[i % gradients.length];

                    const actif = lead.actif !== false;
                    const isSelected = selected.has(lead.id);
                    const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;
                    return (
                      <tr
                        key={lead.id}
                        className="group transition-all duration-150"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: isSelected ? 'rgba(248,113,113,0.04)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(248,113,113,0.04)' : 'transparent'; }}
                      >
                        <td className="px-5 py-3.5" style={colSep}>
                          <CheckBox checked={isSelected} onChange={() => toggleOne(lead.id)} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 tabular-nums" style={colSep}>{i + 1}</td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ background: grad, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                            >
                              {initials || '?'}
                            </div>
                            <span className="text-sm font-semibold text-white">{nom || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <span className="text-sm text-slate-300">{prenom || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-400">{email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-400">{tel || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <div className="relative inline-flex items-center">
                            <span
                              className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full flex-shrink-0 z-10"
                              style={{ background: statut ? cfg.dot : 'rgba(148,163,184,0.5)', boxShadow: statut ? `0 0 4px ${cfg.dot}` : 'none' }}
                            />
                            <select
                              value={statut}
                              onChange={e => handleStatut(lead.id, e.target.value)}
                              className="rounded-lg text-xs font-semibold pl-5 pr-6 py-1 focus:outline-none cursor-pointer appearance-none"
                              style={{
                                background: statut ? cfg.bg : 'rgba(148,163,184,0.08)',
                                color: statut ? cfg.color : 'rgba(148,163,184,0.7)',
                                border: `1px solid ${statut ? cfg.border : 'rgba(148,163,184,0.18)'}`,
                              }}
                            >
                              <option value="" style={{ background: '#0a0f1a' }}>Sans statut</option>
                              {statutDefs.map(s => (
                                <option key={s.id} value={s.nom} style={{ background: '#0a0f1a' }}>{s.nom}</option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-1.5 w-3 h-3"
                              style={{ color: statut ? cfg.color : 'rgba(148,163,184,0.5)' }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          {assignedVendor ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)' }}>
                                {`${assignedVendor.first_name?.[0] ?? ''}${assignedVendor.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                              </div>
                              <span className="text-xs text-slate-300 truncate max-w-[100px]">{assignedVendor.first_name} {assignedVendor.last_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">Admin</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5" style={colSep}>
                          <button
                            onClick={() => handleToggleActif(lead.id, actif)}
                            className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
                            style={{
                              width: 36,
                              height: 20,
                              background: actif ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)',
                              border: actif ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            }}
                            title={actif ? 'Désactiver' : 'Activer'}
                          >
                            <span
                              className="absolute rounded-full transition-all duration-300"
                              style={{
                                width: 12,
                                height: 12,
                                left: actif ? 20 : 3,
                                background: actif ? '#34d399' : 'rgba(255,255,255,0.3)',
                                boxShadow: actif ? '0 0 6px rgba(52,211,153,0.8)' : 'none',
                              }}
                            />
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailLead({ lead, index: i })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', color: '#22d3ee' }}
                            >
                              <ChevronDown className="w-3 h-3" />
                              Détail
                            </button>
                            <button
                              onClick={() => onConnectAsClient?.({ id: lead.id, nom: lead.data['Nom'] ?? '', prenom: lead.data['Prenom'] ?? '', email: lead.data['Email'] ?? '' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: '#34d399' }}
                            >
                              <LogIn className="w-3 h-3" />
                              Connect
                            </button>
                            <button
                              onClick={() => onOpenChat?.({ id: lead.id, nom: lead.data['Nom'] ?? '', prenom: lead.data['Prenom'] ?? '', email: lead.data['Email'] ?? '', tel: lead.data['Telephone'] ?? '' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)', color: '#fbbf24' }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-slate-700">{filtered.length} lead{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}</p>
              {selected.size > 0 && (
                <p className="text-xs" style={{ color: '#f87171' }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</p>
              )}
              {filtered.length === 0 && (filterNom || filterPrenom || filterEmail || filterTel) && (
                <p className="text-xs text-slate-700">Aucun résultat pour ces filtres</p>
              )}
            </div>
          </>
        )}
      </div>

      {detailLead && (
        <DetailModal
          lead={detailLead.lead}
          gradIndex={detailLead.index}
          onClose={() => setDetailLead(null)}
          statutDefs={statutDefs}
        />
      )}

      {showTransfer && (
        <TransferModal
          count={selected.size}
          onClose={() => setShowTransfer(false)}
          onConfirm={handleTransfer}
        />
      )}
    </div>
  );
}

function CheckBox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-center rounded transition-all duration-150 focus:outline-none flex-shrink-0"
      style={{
        width: 16,
        height: 16,
        background: checked || indeterminate ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
        border: checked || indeterminate ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!checked && indeterminate && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <path d="M1 1H7" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
