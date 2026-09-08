import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImpersonatedAdminInfo } from '../adminDashboardTypes';

/**
 * Identite AFFICHEE du panel Societe.
 *
 * Trois entrees possibles, par ordre de fraicheur :
 *
 *   1. une modification enregistree DANS cette session  (`applyNameEdit`)
 *   2. l'instantane de la Societe visualisee            (`impersonatedAdmin`)
 *   3. l'identite du compte connecte                    (`setAdminName`)
 *
 * L'ordre compte. Un instantane recu au montage est forcement plus ancien
 * qu'une valeur que le backend vient de confirmer : sans la priorite (1), un
 * changement de nom fait depuis « Accès & sécurité » en Visu restait invisible
 * jusqu'a une nouvelle entree en Visu.
 *
 * Ce n'est pas une source parallele : c'est le meme `adminName`, avec une
 * regle de precedence explicite. Rien n'est persiste.
 */
export function useAdminIdentity(impersonatedAdmin?: ImpersonatedAdminInfo | null) {
  const [adminName, setAdminName] = useState('Administrateur');
  const [adminEmail, setAdminEmail] = useState('');
  /** Une edition confirmee par le backend prime sur l'instantane. */
  const [edited, setEdited] = useState(false);

  // Changer d'entite visualisee remet le compteur a zero : l'edition
  // precedente concernait une AUTRE Societe.
  const lastId = useRef<string | null>(null);
  const currentId = impersonatedAdmin?.id ?? null;
  if (lastId.current !== currentId) {
    lastId.current = currentId;
    if (edited) setEdited(false);
  }

  useEffect(() => {
    if (!impersonatedAdmin) return;
    const name = [impersonatedAdmin.first_name, impersonatedAdmin.last_name].filter(Boolean).join(' ');
    if (name) setAdminName(name);
  }, [impersonatedAdmin]);

  const impersonatedName = impersonatedAdmin
    ? [impersonatedAdmin.first_name, impersonatedAdmin.last_name].filter(Boolean).join(' ')
    : '';

  /**
   * Appele apres un enregistrement REUSSI. Met a jour l'identite affichee
   * partout ou elle est lue — topbar, carte identite, dashboard — dans le
   * meme rendu, sans navigation ni rechargement.
   */
  const applyNameEdit = useCallback((firstName: string, lastName: string) => {
    setAdminName([firstName, lastName].filter(Boolean).join(' ') || 'Administrateur');
    setEdited(true);
  }, []);

  return {
    adminName,
    setAdminName,
    setAdminEmail,
    applyNameEdit,
    identityName: edited ? adminName : (impersonatedName || adminName),
    identityEmail: impersonatedAdmin?.email ?? adminEmail,
  };
}
