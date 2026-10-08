import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCabinets } from './cabinets/useCabinets';
import CabinetsTable from './cabinets/CabinetsTable';
import CabinetCreateModal from './cabinets/CabinetCreateModal';
import CabinetDeleteModal from './cabinets/CabinetDeleteModal';
import CabinetOuvert from './cabinets/CabinetOuvert';
import type { Cabinet } from './cabinets/cabinetTypes';

/**
 * Page « Cabinets » du panel Societe.
 *
 * Une Societe gere PLUSIEURS cabinets : cette page en est la liste. Elle reprend exactement
 * les fonctions du module Boutique — ajouter, ouvrir, selection multiple, suppression
 * definitive confirmee, bouton d'actions — parce que c'est ce qui a ete demande : le meme
 * module, pour un autre metier.
 *
 * Les deux modules restent SEPARES jusque dans la base : `cabinets` est sa propre table,
 * avec ses propres policies. Un cabinet n'est pas une boutique portant une etiquette.
 */
export default function Cabinets() {
  const t = useThemeTokens();
  const { cabinets, loading, error, create, supprimer } = useCabinets();
  const [showCreate, setShowCreate] = useState(false);
  const [ouvert, setOuvert] = useState<Cabinet | null>(null);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState('');

  // La selection ne survit pas a la disparition de ses lignes : apres une suppression ou un
  // rechargement, un id qui n'est plus dans la liste sortirait le compteur du bouton de la
  // realite. On ne renvoie un nouvel ensemble que s'il a reellement change, sinon le rendu
  // boucle.
  useEffect(() => {
    setSelection(prev => {
      if (prev.size === 0) return prev;
      const vivants = new Set(cabinets.map(c => c.id));
      const garde = new Set([...prev].filter(id => vivants.has(id)));
      return garde.size === prev.size ? prev : garde;
    });
  }, [cabinets]);

  // Un cabinet ouvert puis supprime ailleurs ne doit pas laisser son espace a l'ecran : on
  // revient a la liste plutot que d'afficher la fiche d'une ligne qui n'existe plus.
  useEffect(() => {
    setOuvert(prev => (prev && !cabinets.some(c => c.id === prev.id) ? null : prev));
  }, [cabinets]);

  const basculer = useCallback((id: string) => {
    setSelection(prev => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id); else suivant.add(id);
      return suivant;
    });
  }, []);

  const basculerTout = useCallback(() => {
    setSelection(prev => (prev.size === cabinets.length ? new Set() : new Set(cabinets.map(c => c.id))));
  }, [cabinets]);

  const confirmerSuppression = useCallback(async () => {
    setSuppression(true);
    setErreurSuppression('');
    const res = await supprimer([...selection]);
    setSuppression(false);
    if (res.error) { setErreurSuppression(res.error); return; }
    setSelection(new Set());
    setConfirmation(false);
  }, [selection, supprimer]);

  const nomsChoisis = cabinets.filter(c => selection.has(c.id)).map(c => c.name);

  // L'espace du cabinet remplace la liste plutot que de s'ajouter en dessous : meme raison
  // que pour la boutique, deux surfaces de cette taille se disputeraient le defilement.
  if (ouvert) {
    return <CabinetOuvert cabinet={ouvert} onFermer={() => setOuvert(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: t.text.primary }}>Cabinets</h2>
          <p className="text-xs mt-0.5" style={{ color: t.input.placeholder }}>
            Gérez les cabinets de votre société.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* N'apparait qu'a partir d'un cabinet coche : sans selection, rien a supprimer. */}
          {selection.size > 0 && (
            <button type="button" onClick={() => { setErreurSuppression(''); setConfirmation(true); }}
              data-testid="cabinets-supprimer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              <Trash2 className="w-4 h-4" />
              Supprimer ({selection.size})
            </button>
          )}
          <button type="button" onClick={() => setShowCreate(true)}
            data-testid="cabinets-ajouter"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: t.accent.solid, color: t.text.inverse }}>
            <Plus className="w-4 h-4" />
            Ajouter un cabinet
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {error}
        </p>
      )}

      <CabinetsTable
        cabinets={cabinets}
        loading={loading}
        onOuvrir={(c) => { setSelection(new Set()); setOuvert(c); }}
        selection={selection}
        onBasculer={basculer}
        onBasculerTout={basculerTout}
      />

      {showCreate && (
        <CabinetCreateModal onClose={() => setShowCreate(false)} onCreate={create} />
      )}

      {confirmation && selection.size > 0 && (
        <CabinetDeleteModal
          noms={nomsChoisis}
          suppression={suppression}
          erreur={erreurSuppression}
          onAnnuler={() => { if (!suppression) setConfirmation(false); }}
          onConfirmer={confirmerSuppression}
        />
      )}
    </div>
  );
}
