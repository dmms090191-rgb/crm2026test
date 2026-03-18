import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Pipette, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Statut {
  id: string;
  nom: string;
  couleur: string;
  created_at: string;
}

const PRESET_COLORS = [
  '#38bdf8', '#22d3ee', '#34d399', '#4ade80',
  '#fbbf24', '#f97316', '#f87171', '#fb7185',
  '#a78bfa', '#818cf8', '#e879f9', '#94a3b8',
];

const MAX_FAVORITES = 6;
const FAVORITES_KEY = 'statuts_favorite_colors';

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

export default function Statuts() {
  const [statuts, setStatuts] = useState<Statut[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState('#38bdf8');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]'); } catch { return []; }
  });
  const colorInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('statuts').select('*').order('created_at', { ascending: true });
    setStatuts((data ?? []) as Statut[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFavorites = (favs: string[]) => {
    setFavorites(favs);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  };

  const addToFavorites = (color: string) => {
    if (favorites.includes(color)) return;
    const updated = [color, ...favorites].slice(0, MAX_FAVORITES);
    saveFavorites(updated);
  };

  const removeFromFavorites = (color: string) => {
    saveFavorites(favorites.filter(c => c !== color));
  };

  const handleCreate = async () => {
    setError('');
    if (!nom.trim()) { setError('Le nom du statut est requis.'); return; }
    const duplicate = statuts.some(s => s.nom.toLowerCase() === nom.trim().toLowerCase());
    if (duplicate) { setError('Un statut avec ce nom existe déjà.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('statuts').insert({ nom: nom.trim(), couleur });
    if (err) { setError('Erreur lors de la création.'); setSaving(false); return; }
    setNom('');
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('statuts').delete().eq('id', id);
    setStatuts(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold">Statuts</h2>
        <p className="text-slate-600 text-xs mt-0.5">Créez et gérez les statuts personnalisés du CRM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <h3 className="text-white text-sm font-bold">Créer un statut</h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600">
              Nom du statut
            </label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Ex: Prioritaire, En attente..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-700 focus:outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={e => (e.currentTarget.style.borderColor = `${couleur}55`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600">
              Couleur
            </label>

            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCouleur(c)}
                  className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: c,
                    boxShadow: couleur === c ? `0 0 0 2px #0a0f1a, 0 0 0 4px ${c}` : 'none',
                    transform: couleur === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c}
                />
              ))}

              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)',
                }}
                title="Couleur personnalisée"
              >
                <Pipette className="w-3.5 h-3.5" />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={couleur}
                  onChange={e => setCouleur(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                  tabIndex={-1}
                />
              </button>
            </div>

            {favorites.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-slate-600" />
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600">Favoris</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map(c => (
                    <div key={c} className="relative group">
                      <button
                        onClick={() => setCouleur(c)}
                        className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                        style={{
                          background: c,
                          boxShadow: couleur === c ? `0 0 0 2px #0a0f1a, 0 0 0 4px ${c}` : 'none',
                          transform: couleur === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                        title={c}
                      />
                      <button
                        onClick={() => removeFromFavorites(c)}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex transition-all"
                        style={{ background: '#f87171', color: 'white' }}
                        title="Retirer des favoris"
                      >
                        <span className="text-[8px] font-bold leading-none">×</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-slate-600 text-[10px]">Couleur choisie</span>
                <span className="font-mono text-slate-400 text-[10px]">{couleur}</span>
                <div
                  className="w-4 h-4 rounded-md"
                  style={{ background: couleur }}
                />
              </div>
              <button
                onClick={() => addToFavorites(couleur)}
                disabled={favorites.includes(couleur) || favorites.length >= MAX_FAVORITES}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                style={{
                  background: favorites.includes(couleur) ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
                  color: favorites.includes(couleur) ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${favorites.includes(couleur) ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: favorites.length >= MAX_FAVORITES && !favorites.includes(couleur) ? 0.4 : 1,
                  cursor: favorites.length >= MAX_FAVORITES && !favorites.includes(couleur) ? 'not-allowed' : 'pointer',
                }}
                title={favorites.length >= MAX_FAVORITES && !favorites.includes(couleur) ? 'Maximum 6 favoris' : 'Sauvegarder en favori'}
              >
                <Star className="w-3 h-3" />
                {favorites.includes(couleur) ? 'En favori' : 'Ajouter favori'}
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-3">Aperçu</p>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: colorWithAlpha(couleur, 0.1),
                  color: couleur,
                  border: `1px solid ${colorWithAlpha(couleur, 0.25)}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: couleur, boxShadow: `0 0 5px ${couleur}` }}
                />
                {nom.trim() || 'Nom du statut'}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: '#f87171' }}>{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${couleur}22 0%, ${couleur}11 100%)`,
              border: `1px solid ${couleur}44`,
              color: couleur,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Création...' : 'Créer le statut'}
          </button>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-sm font-bold">Statuts créés</h3>
            <span
              className="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              {statuts.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : statuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <Plus className="w-4 h-4 text-slate-700" />
              </div>
              <p className="text-slate-600 text-xs">Aucun statut créé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {statuts.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl group transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${s.couleur}30`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: s.couleur, boxShadow: `0 0 6px ${s.couleur}99` }}
                    />
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: colorWithAlpha(s.couleur, 0.1),
                        color: s.couleur,
                        border: `1px solid ${colorWithAlpha(s.couleur, 0.22)}`,
                      }}
                    >
                      {s.nom}
                    </span>
                    <span className="font-mono text-[10px] text-slate-700">{s.couleur}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
