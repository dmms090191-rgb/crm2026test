import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Pipette, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { Statut, PRESET_COLORS, MAX_FAVORITES, FAVORITES_KEY, colorWithAlpha } from './statuts/colorUtils';
import StatutsList from './statuts/StatutsList';

export default function Statuts() {
  const tokens = useThemeTokens();
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
        <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Statuts</h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.label.hint }}>Créez et gérez les statuts personnalisés du CRM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: tokens.card.bg,
            border: `1px solid ${tokens.card.border}`,
          }}
        >
          <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Créer un statut</h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.label.hint }}>
              Nom du statut
            </label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Ex: Prioritaire, En attente..."
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: tokens.input.bg,
                border: `1px solid ${tokens.input.border}`,
                color: tokens.input.text,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = `${couleur}55`)}
              onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.label.hint }}>
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
                    boxShadow: couleur === c ? `0 0 0 2px ${tokens.surface.primary}, 0 0 0 4px ${c}` : 'none',
                    transform: couleur === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c}
                />
              ))}

              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: tokens.surface.secondary,
                  border: `1px solid ${tokens.surface.border}`,
                  color: tokens.text.tertiary,
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
                  <Star className="w-3 h-3" style={{ color: tokens.label.hint }} />
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.label.hint }}>Favoris</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map(c => (
                    <div key={c} className="relative group">
                      <button
                        onClick={() => setCouleur(c)}
                        className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                        style={{
                          background: c,
                          boxShadow: couleur === c ? `0 0 0 2px ${tokens.surface.primary}, 0 0 0 4px ${c}` : 'none',
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
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}
              >
                <span className="text-[10px]" style={{ color: tokens.label.hint }}>Couleur choisie</span>
                <span className="font-mono text-[10px]" style={{ color: tokens.text.tertiary }}>{ couleur}</span>
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
                  background: favorites.includes(couleur) ? 'rgba(251,191,36,0.1)' : tokens.surface.secondary,
                  color: favorites.includes(couleur) ? '#fbbf24' : tokens.text.tertiary,
                  border: `1px solid ${favorites.includes(couleur) ? 'rgba(251,191,36,0.2)' : tokens.input.border}`,
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
            style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}
          >
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: tokens.label.hint }}>Aperçu</p>
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
            <p className="text-xs font-medium" style={{ color: tokens.danger.text }}>{error}</p>
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

        <StatutsList statuts={statuts} loading={loading} onDelete={handleDelete} tokens={tokens} />
      </div>
    </div>
  );
}
