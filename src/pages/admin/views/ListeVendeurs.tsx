import { useState, useEffect, useRef } from 'react';
import { List, Eye, EyeOff, X, Trash2, MessageSquarePlus, ChevronDown, LogIn, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  created_at: string;
  auth_user_id?: string | null;
}

interface Comment {
  id: string;
  vendor_id: string;
  content: string;
  created_at: string;
}

type ModalTab = 'informations' | 'mot-de-passe' | 'commentaires';

function PinDisplay({ password, vendorId }: { password: string; vendorId: string }) {
  const [show, setShow] = useState(false);
  const [editPin, setEditPin] = useState(password.split(''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setEditPin(password.split(''));
  }, [password]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...editPin];
    next[index] = digit;
    setEditPin(next);
    if (digit && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !editPin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...editPin];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setEditPin(next);
    pinRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const changed = editPin.join('') !== password;

  async function handleSave() {
    const newPass = editPin.join('');
    if (newPass.length < 6) return;
    setSaving(true);
    await supabase.from('vendors').update({ password: newPass }).eq('id', vendorId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
          Mot de passe (6 chiffres)
        </p>
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {show ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      <div className="flex gap-2.5">
        {editPin.map((digit, i) => (
          <input
            key={i}
            ref={el => { pinRefs.current[i] = el; }}
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-11 h-11 text-center text-lg font-bold text-white rounded-xl outline-none focus:ring-2 focus:ring-cyan-500/60 transition-all"
            style={{
              background: digit ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.05)',
              border: digit ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: digit ? '0 0 10px rgba(34,211,238,0.15)' : 'none',
            }}
          />
        ))}
      </div>
      {changed && (
        <button
          onClick={handleSave}
          disabled={saving || editPin.join('').length < 6}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      )}
      {saved && <p className="text-xs text-emerald-400">Mot de passe mis à jour.</p>}
    </div>
  );
}

function CommentsTab({ vendorId }: { vendorId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [vendorId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('vendor_comments')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    await supabase.from('vendor_comments').insert({ vendor_id: vendorId, content: newComment.trim() });
    setNewComment('');
    await fetchComments();
    setLoading(false);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    await supabase.from('vendor_comments').delete().in('id', Array.from(selected));
    setSelected(new Set());
    await fetchComments();
  }

  async function deleteAll() {
    await supabase.from('vendor_comments').delete().eq('vendor_id', vendorId);
    setSelected(new Set());
    await fetchComments();
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === comments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(comments.map(c => c.id)));
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
          placeholder="Ajouter un commentaire..."
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <button
          onClick={addComment}
          disabled={loading || !newComment.trim()}
          className="px-3 py-2.5 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5 text-xs font-semibold text-white self-start"
          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          <MessageSquarePlus className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {comments.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors select-none">
            <input
              type="checkbox"
              checked={selected.size === comments.length && comments.length > 0}
              onChange={toggleAll}
              className="accent-cyan-500 w-3.5 h-3.5"
            />
            Tout sélectionner
          </label>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-400 transition-all hover:bg-rose-400/10"
                style={{ border: '1px solid rgba(251,113,133,0.2)' }}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer la sélection ({selected.size})
              </button>
            )}
            <button
              onClick={deleteAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 transition-all hover:text-rose-400 hover:bg-rose-400/10"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Trash2 className="w-3 h-3" />
              Supprimer tout
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">Aucun commentaire</p>
        ) : (
          comments.map(c => (
            <div
              key={c.id}
              onClick={() => toggleSelect(c.id)}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: selected.has(c.id) ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.03)',
                border: selected.has(c.id) ? '1px solid rgba(34,211,238,0.2)' : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleSelect(c.id)}
                onClick={e => e.stopPropagation()}
                className="accent-cyan-500 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 break-words">{c.content}</p>
                <p className="text-[10px] text-slate-600 mt-1">{formatDate(c.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DetailModal({ vendor, onClose, onUpdate }: { vendor: Vendor; onClose: () => void; onUpdate: () => void }) {
  const [tab, setTab] = useState<ModalTab>('informations');
  const [firstName, setFirstName] = useState(vendor.first_name);
  const [lastName, setLastName] = useState(vendor.last_name);
  const [email, setEmail] = useState(vendor.email);
  const [phone, setPhone] = useState(vendor.phone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tabs: { id: ModalTab; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'mot-de-passe', label: 'Mot de passe' },
    { id: 'commentaires', label: 'Commentaires' },
  ];

  async function saveInfo() {
    setSaving(true);
    await supabase.from('vendors').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    }).eq('id', vendor.id);
    setSaving(false);
    setSaved(true);
    onUpdate();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1420 0%, #0a1019 100%)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.06)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-white font-semibold text-sm">{vendor.first_name} {vendor.last_name}</p>
            <p className="text-slate-600 text-xs">{vendor.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
              style={
                tab === t.id
                  ? { color: '#22d3ee', borderBottom: '2px solid #22d3ee', marginBottom: '-1px' }
                  : { color: '#64748b' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 h-72 overflow-y-auto">
          {tab === 'informations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveInfo}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {saved && <p className="text-xs text-emerald-400">Informations mises à jour.</p>}
              </div>
            </div>
          )}

          {tab === 'mot-de-passe' && (
            <PinDisplay password={vendor.password} vendorId={vendor.id} />
          )}

          {tab === 'commentaires' && (
            <CommentsTab vendorId={vendor.id} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ListeVendeursProps {
  onConnectAsVendor?: (vendor: Vendor) => void;
  onOpenChat?: (vendor: Vendor) => void;
}

export default function ListeVendeurs({ onConnectAsVendor, onOpenChat }: ListeVendeursProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setVendors(data);
    setLoading(false);
  }

  function handleUpdate() {
    fetchVendors();
    if (selectedVendor) {
      supabase.from('vendors').select('*').eq('id', selectedVendor.id).maybeSingle().then(({ data }) => {
        if (data) setSelectedVendor(data);
      });
    }
  }

  const maskedPassword = '••••••';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Liste vendeurs</h2>
          <p className="text-slate-600 text-xs mt-0.5">{vendors.length} vendeur{vendors.length !== 1 ? 's' : ''} enregistré{vendors.length !== 1 ? 's' : ''}</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.08)', boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
        >
          <List className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.1)' }}
            >
              <List className="w-5 h-5 text-cyan-500/40" />
            </div>
            <p className="text-slate-600 text-sm">Aucun vendeur enregistré</p>
            <p className="text-slate-700 text-xs">Créez un vendeur depuis l'onglet "Vendeur"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Prénom', 'Nom', 'Adresse email', 'Mot de passe', 'Téléphone', 'Actions'].map(col => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor, idx) => (
                  <tr
                    key={vendor.id}
                    className="group transition-all duration-150"
                    style={{
                      borderBottom: idx < vendors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white font-medium">{vendor.first_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white font-medium">{vendor.last_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-400">{vendor.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500 font-mono tracking-widest">{maskedPassword}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-400">{vendor.phone || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 transition-all hover:scale-105"
                          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
                        >
                          <ChevronDown className="w-3 h-3" />
                          Détail
                        </button>
                        <button
                          onClick={() => onConnectAsVendor?.(vendor)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 transition-all hover:scale-105"
                          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)' }}
                        >
                          <LogIn className="w-3 h-3" />
                          Connect
                        </button>
                        <button
                          onClick={() => onOpenChat?.(vendor)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 transition-all hover:scale-105"
                          style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}
                          title="Ouvrir le chat"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVendor && (
        <DetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
