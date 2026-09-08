import { useEffect } from 'react';

type Setter<T> = (updater: (cur: T | null) => T | null) => void;

/**
 * Garde des selections ouvertes alignees sur une liste rechargee.
 *
 * Un modal ouvert tient un INSTANTANE de l'element sur lequel il porte. Quand
 * la liste est rafraichie apres un enregistrement, cet instantane devient
 * obsolete : le modal — et tout ce qu'il transmet ensuite, comme l'identite
 * emportee dans une Visu — continuerait d'afficher les anciennes valeurs
 * jusqu'a un F5.
 *
 * On re-derive donc chaque selection depuis la liste fraiche, par id. Aucune
 * seconde source de verite : la liste reste la seule reference.
 */
export function useSyncedFromList<T extends { id: string }>(list: T[], ...setters: Setter<T>[]) {
  useEffect(() => {
    const sync = (cur: T | null) => (cur ? (list.find(x => x.id === cur.id) ?? cur) : cur);
    setters.forEach(set => set(sync));
    // Les setters de useState sont stables : seule la liste doit declencher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);
}
