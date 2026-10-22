import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Camera, Upload, FolderPlus, Folder, FolderOpen, ChevronLeft, File as FileIcon,
  Image as ImageIcon, Download, Pencil, Trash2, FolderInput, AlertTriangle, Loader2, Check, X,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  ACCEPT_PHOTO, ACCEPT_DOCUMENT, nomTronque, poidsLisible, afficheEnMiniature,
} from '../../../../lib/crmImmoDocuments';
import type { EtatDocuments, DocumentImmo } from './useCrmImmoDocuments';

/**
 * L'ONGLET DOCUMENTS — pensé pour être utilisé debout, chez le client, sur un téléphone.
 *
 * ---------- DEUX BOUTONS, ET PAS UN SEUL ----------
 *
 * L'attribut `capture` rend le champ CAMERA-SEULE : depuis ce champ, impossible de
 * reprendre une photo déjà dans la pellicule. Un bouton unique empêcherait donc d'envoyer
 * le bail photographié hier. Il en faut deux, et c'est aussi ce que David a demandé.
 *
 * Le champ « document » porte un `accept` MIXTE, et c'est mesuré : `image/*` SEUL prive
 * Chrome Android de caméra, un accept mélangeant des types non-image la rétablit.
 *
 * ---------- UN SEUL NIVEAU DE DOSSIERS ----------
 *
 * Pas d'explorateur Windows : la racine du dossier client, et des dossiers à un niveau.
 * La raison est mécanique — un parent_id auto-référent ferait compter l'ordre des lignes
 * à l'intérieur d'une table lors d'une restauration, qui insère dans l'ordre du fichier
 * sans tri topologique : un enfant restauré avant son parent violerait la clé étrangère.
 *
 * ---------- PAS DE POURCENTAGE D'OCTETS ----------
 *
 * supabase-js téléverse par `fetch`, sans aucun rappel de progression, dans la version
 * installée comme dans la dernière version stable. Une barre qui avance serait une
 * animation inventée. On annonce « fichier N sur M », qui est vrai, et le bouton se
 * désactive pendant l'envoi pour qu'il ne paraisse jamais inerte.
 */

interface Props {
  etat: EtatDocuments;
}

export default function CrmImmoDocuments({ etat }: Props) {
  const t = useThemeTokens();
  const [classeurOuvert, setClasseurOuvert] = useState<string | null>(null);
  const [miniatures, setMiniatures] = useState<Record<string, string>>({});
  const [cassees, setCassees] = useState<Record<string, true>>({});
  const [message, setMessage] = useState('');
  const [nouveauDossier, setNouveauDossier] = useState('');
  const [creerOuvert, setCreerOuvert] = useState(false);
  const [renomme, setRenomme] = useState<{ id: string; nom: string; classeur: boolean } | null>(null);
  const [aSupprimer, setASupprimer] = useState<DocumentImmo | null>(null);
  const [deplace, setDeplace] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);

  const champPhoto = useRef<HTMLInputElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const visibles = useMemo(
    () => etat.documents.filter(d => d.classeur_id === classeurOuvert),
    [etat.documents, classeurOuvert],
  );

  const nomDuClasseur = classeurOuvert === null
    ? null
    : (etat.classeurs.find(c => c.id === classeurOuvert)?.nom ?? null);

  /*
   * LES MINIATURES, EN UN SEUL APPEL. createSignedUrls prend une liste : cinquante photos
   * coutent une requete, pas cinquante. On ne demande que ce qu'un navigateur sait
   * vraiment afficher — mesure avec temoin, Chromium REFUSE de decoder un HEIC.
   */
  useEffect(() => {
    const aDemander = visibles
      .filter(d => d.statut === 'pret' && afficheEnMiniature(d.mime) && miniatures[d.chemin] === undefined)
      .map(d => d.chemin);
    if (aDemander.length === 0) return;
    let vivant = true;
    void etat.urlsMiniatures(aDemander).then(obtenues => {
      if (vivant && Object.keys(obtenues).length > 0) setMiniatures(prev => ({ ...prev, ...obtenues }));
    });
    return () => { vivant = false; };
  }, [visibles, miniatures, etat]);

  const ouvrir = useCallback(async (d: DocumentImmo, telecharger: boolean) => {
    setMessage('');
    const { url, error } = await etat.urlSignee(d.id);
    if (error !== null || url === null) { setMessage(error ?? 'Lien indisponible.'); return; }
    if (telecharger) {
      const a = document.createElement('a');
      a.href = url;
      a.download = d.nom_affiche;
      a.rel = 'noopener';
      a.click();
    } else {
      /* noopener : la page ouverte ne doit pas pouvoir toucher a celle-ci. */
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [etat]);

  const recevoir = useCallback((liste: FileList | null) => {
    if (liste === null || liste.length === 0) return;
    setMessage('');
    void etat.ajouter(Array.from(liste), classeurOuvert);
  }, [etat, classeurOuvert]);

  const agir = useCallback(async (p: Promise<{ error: string | null }>) => {
    const { error } = await p;
    setMessage(error ?? '');
    return error === null;
  }, []);

  /*
   * LA CLASSE TACTILE N'EST PAS DANS CETTE CONSTANTE, ET C'EST VOLONTAIRE.
   *
   * La garde des 44 px de cibleTactile.test.ts retrouve les classes d'un bouton sur SA
   * ligne className. Mise dans une constante partagee, la classe serait invisible pour
   * elle : la regle resterait verte sans rien mesurer. Chaque bouton la porte donc en
   * clair, comme le font deja les pilules de CrmImmoFilters.
   */
  const bouton = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 whitespace-nowrap';
  const petitBouton = 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 shrink-0';

  return (
    <div className="flex flex-col gap-3" data-testid="crm-immo-documents"
      onDragOver={e => { e.preventDefault(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={e => { e.preventDefault(); setSurvol(false); recevoir(e.dataTransfer.files); }}>

      {/* ---------- LES DEUX ENTREES DE FICHIER ----------
          Masquees, pilotees par les deux boutons. `text-base` est la pour satisfaire le
          garde des 16 px qui balaye tous les <input> du dossier : sur un champ en
          display:none il est inerte, et desarmer le garde protegerait moins les quatorze
          vrais champs de saisie du module. */}
      <input ref={champPhoto} type="file" accept={ACCEPT_PHOTO} capture="environment" multiple
        className="hidden text-base" data-testid="crm-immo-documents-champ-photo"
        onChange={e => { recevoir(e.target.files); e.target.value = ''; }} />
      <input ref={champFichier} type="file" accept={ACCEPT_DOCUMENT} multiple
        className="hidden text-base" data-testid="crm-immo-documents-champ-fichier"
        onChange={e => { recevoir(e.target.files); e.target.value = ''; }} />

      {/* ---------- LES ACTIONS ---------- */}
      <div className="flex flex-wrap items-stretch gap-2">
        <button type="button" className={`${bouton} max-md:min-h-[44px]`} disabled={etat.envoi.enCours}
          onClick={() => champPhoto.current?.click()}
          data-testid="crm-immo-documents-photo"
          style={{ background: t.accent.solid, color: t.text.inverse }}>
          <Camera className="w-4 h-4 shrink-0" />
          Prendre une photo
        </button>
        <button type="button" className={`${bouton} max-md:min-h-[44px]`} disabled={etat.envoi.enCours}
          onClick={() => champFichier.current?.click()}
          data-testid="crm-immo-documents-fichier"
          style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>
          <Upload className="w-4 h-4 shrink-0" />
          Ajouter un document
        </button>
        {classeurOuvert === null && (
          <button type="button" className={`${bouton} max-md:min-h-[44px]`} disabled={etat.envoi.enCours}
            onClick={() => { setCreerOuvert(v => !v); setNouveauDossier(''); }}
            data-testid="crm-immo-documents-nouveau-dossier"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
            <FolderPlus className="w-4 h-4 shrink-0" />
            Nouveau dossier
          </button>
        )}
      </div>

      {survol && (
        <p className="text-xs px-3 py-2 rounded-lg" data-testid="crm-immo-documents-depot"
          style={{ background: t.accent.bg, border: `1px dashed ${t.accent.border}`, color: t.accent.text }}>
          Déposez vos fichiers ici.
        </p>
      )}

      {creerOuvert && (
        <div className="flex items-stretch gap-2">
          <input type="text" value={nouveauDossier} maxLength={80}
            placeholder="Nom du dossier (Contrat, Quittances…)"
            data-testid="crm-immo-documents-nom-dossier"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm max-md:text-base max-md:min-h-[44px]"
            style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
            onChange={e => setNouveauDossier(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              void agir(etat.creerClasseur(nouveauDossier)).then(bon => {
                if (bon) { setNouveauDossier(''); setCreerOuvert(false); }
              });
            }} />
          <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label="Créer le dossier" title="Créer le dossier"
            style={{ background: t.accent.solid, color: t.text.inverse }}
            onClick={() => void agir(etat.creerClasseur(nouveauDossier)).then(bon => {
              if (bon) { setNouveauDossier(''); setCreerOuvert(false); }
            })}>
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------- L'ENVOI EN COURS ---------- */}
      {etat.envoi.enCours && (
        <p className="text-xs px-3 py-2 rounded-lg flex items-center gap-2 break-words"
          data-testid="crm-immo-documents-envoi"
          style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          {/* Un compteur d'etapes, jamais un pourcentage d'octets : le SDK n'en fournit pas. */}
          <span className="min-w-0">
            Envoi : fichier {etat.envoi.fait + 1} sur {etat.envoi.total}
            {etat.envoi.nom !== '' && ` — ${nomTronque(etat.envoi.nom, 28)}`}
          </span>
        </p>
      )}

      {etat.avertissements.length > 0 && (
        <div className="px-3 py-2 rounded-lg flex flex-col gap-1" data-testid="crm-immo-documents-avertissements"
          style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}>
          {etat.avertissements.map((a, i) => (
            <p key={i} className="text-xs break-words flex items-start gap-1.5" style={{ color: t.warning.text }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="min-w-0">{a}</span>
            </p>
          ))}
          <button type="button" className="self-start text-[11px] underline mt-0.5 max-md:min-h-[44px]"
            style={{ color: t.warning.text }} onClick={etat.oublierAvertissements}>
            Masquer
          </button>
        </div>
      )}

      {(message !== '' || etat.erreur !== '') && (
        <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid="crm-immo-documents-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {message || etat.erreur}
        </p>
      )}

      {/* ---------- OU SOMMES-NOUS ---------- */}
      {classeurOuvert !== null && (
        <button type="button" onClick={() => setClasseurOuvert(null)}
          data-testid="crm-immo-documents-retour"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold max-md:min-h-[44px]"
          style={{ color: t.text.link }}>
          <ChevronLeft className="w-4 h-4 shrink-0" />
          Tous les documents
          {nomDuClasseur !== null && <span style={{ color: t.text.tertiary }}>· {nomDuClasseur}</span>}
        </button>
      )}

      {etat.chargement && (
        <p className="text-xs" style={{ color: t.text.tertiary }}>Chargement…</p>
      )}

      {/* ---------- LES DOSSIERS, A LA RACINE SEULEMENT ---------- */}
      {classeurOuvert === null && etat.classeurs.length > 0 && (
        <div className="flex flex-col gap-1.5" data-testid="crm-immo-documents-classeurs">
          {etat.classeurs.map(c => {
            const combien = etat.documents.filter(d => d.classeur_id === c.id).length;
            const enRenommage = renomme?.id === c.id && renomme.classeur;
            return (
              <div key={c.id} className="flex items-stretch gap-2 px-3 py-2 rounded-xl"
                style={{ background: t.card.bg, border: `1px solid ${t.surface.borderLight}` }}>
                {enRenommage ? (
                  <>
                    <input type="text" value={renomme.nom} maxLength={80} autoFocus
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-sm max-md:text-base max-md:min-h-[44px]"
                      style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                      onChange={e => setRenomme({ ...renomme, nom: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') void agir(etat.renommerClasseur(c.id, renomme.nom)).then(b => b && setRenomme(null)); }} />
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label="Valider le nom du dossier" title="Valider le nom du dossier"
                      style={{ background: t.accent.solid, color: t.text.inverse }}
                      onClick={() => void agir(etat.renommerClasseur(c.id, renomme.nom)).then(b => b && setRenomme(null))}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label="Abandonner le renommage du dossier" title="Abandonner le renommage du dossier"
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => setRenomme(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setClasseurOuvert(c.id)}
                      data-testid="crm-immo-documents-ouvrir-classeur"
                      className="flex-1 min-w-0 flex items-center gap-2 text-left max-md:min-h-[44px]">
                      <Folder className="w-4 h-4 shrink-0" style={{ color: t.accent.text }} />
                      <span className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>{c.nom}</span>
                      <span className="text-[11px] shrink-0" style={{ color: t.text.tertiary }}>
                        {combien} doc{combien > 1 ? 's' : ''}
                      </span>
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label={`Renommer le dossier ${c.nom}`} title={`Renommer le dossier ${c.nom}`}
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => setRenomme({ id: c.id, nom: c.nom, classeur: true })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label={`Supprimer le dossier ${c.nom}`} title={`Supprimer le dossier ${c.nom}`}
                      data-testid="crm-immo-documents-supprimer-classeur"
                      style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}
                      onClick={() => void agir(etat.supprimerClasseur(c.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- LES DOCUMENTS ---------- */}
      {!etat.chargement && visibles.length === 0 && (
        <p className="text-xs px-3 py-4 rounded-xl text-center" data-testid="crm-immo-documents-vide"
          style={{ background: t.surface.secondary, color: t.text.tertiary }}>
          {classeurOuvert === null
            ? 'Aucun document pour ce dossier. Prenez une photo ou ajoutez un fichier.'
            : 'Ce dossier est vide.'}
        </p>
      )}

      <div className="flex flex-col gap-1.5" data-testid="crm-immo-documents-liste">
        {visibles.map(d => {
          const enRenommage = renomme?.id === d.id && !renomme.classeur;
          const vignette = miniatures[d.chemin];
          const incomplet = d.statut !== 'pret';
          return (
            /*
             * flex-wrap, et les actions passent SOUS le nom en etroit.
             *
             * Mesure a 320 px avant ce correctif : la ligne faisait 288 px, la vignette
             * 40 et les cinq boutons 169 — qui ne se compriment pas. Il restait 39 px
             * pour le nom du fichier, qui s'enroulait sur QUATRE lignes et portait la
             * ligne a 146 px de haut. Illisible, alors que les cibles etaient bonnes :
             * ce n'est pas un probleme de 44 px, c'est un probleme de place.
             */
            <div key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl"
              data-testid="crm-immo-documents-ligne"
              style={{
                background: t.card.bg,
                border: `1px solid ${incomplet ? t.warning.border : t.surface.borderLight}`,
              }}>
              {/* La vignette, ou une icone. onError couvre le HEIC ET tout format futur
                  qu'un navigateur ne saurait pas decoder : on ne devine aucune liste. */}
              <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ background: t.surface.secondary }}>
                {vignette !== undefined && cassees[d.id] === undefined ? (
                  <img src={vignette} alt="" className="w-10 h-10 object-cover"
                    onError={() => setCassees(prev => ({ ...prev, [d.id]: true }))} />
                ) : afficheEnMiniature(d.mime) ? (
                  <ImageIcon className="w-4 h-4" style={{ color: t.text.tertiary }} />
                ) : (
                  <FileIcon className="w-4 h-4" style={{ color: t.text.tertiary }} />
                )}
              </div>

              <div className="flex-1 min-w-0 basis-40 flex flex-col justify-center">
                {enRenommage ? (
                  <input type="text" value={renomme.nom} maxLength={200} autoFocus
                    className="w-full px-2 py-1 rounded-lg text-sm max-md:text-base max-md:min-h-[44px]"
                    style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}`, color: t.modal.fieldValue }}
                    onChange={e => setRenomme({ ...renomme, nom: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') void agir(etat.renommer(d.id, renomme.nom)).then(b => b && setRenomme(null)); }} />
                ) : (
                  <>
                    {/* nomTronque coupe AU MILIEU : `truncate` coupe par la fin et
                        masquerait l'extension, donc on ne distinguerait plus un .pdf
                        d'un .docx. */}
                    <p className="text-sm font-semibold" style={{ color: t.text.primary }}
                      title={d.nom_affiche} data-testid="crm-immo-documents-nom">
                      {nomTronque(d.nom_affiche, 34)}
                    </p>
                    <p className="text-[11px] flex flex-wrap items-center gap-x-1.5" style={{ color: t.text.tertiary }}>
                      <span>{poidsLisible(d.taille)}</span>
                      {d.mime_origine !== null && (
                        <span data-testid="crm-immo-documents-converti">· converti en JPEG</span>
                      )}
                      {incomplet && (
                        <span data-testid="crm-immo-documents-incomplet" style={{ color: t.warning.text }}>
                          · {d.statut === 'en_cours' ? 'Envoi incomplet' : 'Suppression incomplète'}
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* Les actions. Elles restent dans la ligne : aucun defilement horizontal
                  n'est necessaire pour les atteindre. */}
              <div className="flex items-stretch gap-1 shrink-0 max-md:w-full max-md:justify-end">
                {enRenommage ? (
                  <>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label="Valider le nom du document" title="Valider le nom du document"
                      style={{ background: t.accent.solid, color: t.text.inverse }}
                      onClick={() => void agir(etat.renommer(d.id, renomme.nom)).then(b => b && setRenomme(null))}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} aria-label="Abandonner le renommage du document" title="Abandonner le renommage du document"
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => setRenomme(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} disabled={incomplet}
                      aria-label={`Ouvrir ${d.nom_affiche}`} title={`Ouvrir ${d.nom_affiche}`} data-testid="crm-immo-documents-ouvrir"
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => void ouvrir(d, false)}>
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`} disabled={incomplet}
                      aria-label={`Télécharger ${d.nom_affiche}`} title={`Télécharger ${d.nom_affiche}`} data-testid="crm-immo-documents-telecharger"
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => void ouvrir(d, true)}>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`}
                      aria-label={`Renommer ${d.nom_affiche}`} title={`Renommer ${d.nom_affiche}`} data-testid="crm-immo-documents-renommer"
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => setRenomme({ id: d.id, nom: d.nom_affiche, classeur: false })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {(etat.classeurs.length > 0 || d.classeur_id !== null) && (
                      <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`}
                        aria-label={`Déplacer ${d.nom_affiche}`} title={`Déplacer ${d.nom_affiche}`} data-testid="crm-immo-documents-deplacer"
                        style={{ background: t.surface.secondary, color: t.text.secondary }}
                        onClick={() => setDeplace(deplace === d.id ? null : d.id)}>
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`}
                      aria-label={`Supprimer ${d.nom_affiche}`} title={`Supprimer ${d.nom_affiche}`} data-testid="crm-immo-documents-supprimer"
                      style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}
                      onClick={() => setASupprimer(d)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {deplace === d.id && (
                <div className="w-full flex flex-wrap gap-1.5 pt-2" data-testid="crm-immo-documents-choix-dossier">
                  {d.classeur_id !== null && (
                    <button type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`}
                      style={{ background: t.surface.secondary, color: t.text.secondary }}
                      onClick={() => void agir(etat.deplacer(d.id, null)).then(b => b && setDeplace(null))}>
                      Racine
                    </button>
                  )}
                  {etat.classeurs.filter(c => c.id !== d.classeur_id).map(c => (
                    <button key={c.id} type="button" className={`${petitBouton} max-md:min-h-[44px] max-md:px-3`}
                      style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}
                      onClick={() => void agir(etat.deplacer(d.id, c.id)).then(b => b && setDeplace(null))}>
                      {c.nom}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- LA CONFIRMATION DE SUPPRESSION ----------
          David : << demander confirmation >>. Elle dit aussi que le FICHIER part, pas
          seulement la fiche : c'est l'action irreversible, et elle doit etre nommee. */}
      {aSupprimer !== null && (
        <div className="px-3 py-2.5 rounded-xl flex flex-col gap-2" data-testid="crm-immo-documents-confirmer"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
          <p className="text-xs break-words" style={{ color: t.danger.text }}>
            Supprimer « {aSupprimer.nom_affiche} » ? Le fichier sera retiré du stockage : c’est définitif.
          </p>
          <div className="flex items-stretch gap-2">
            <button type="button" className={`${bouton} max-md:min-h-[44px]`}
              style={{ background: t.danger.text, color: t.text.inverse }}
              onClick={() => {
                const cible = aSupprimer;
                setASupprimer(null);
                void agir(etat.supprimer(cible.id));
              }}>
              Supprimer définitivement
            </button>
            <button type="button" className={`${bouton} max-md:min-h-[44px]`}
              style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
              onClick={() => setASupprimer(null)}>
              Annuler la suppression
            </button>
          </div>
        </div>
      )}

      {/* ---------- CE QU'UNE SAUVEGARDE NE CONTIENT PAS ----------
          Affiche a l'endroit ou l'on voit les documents, et non dans un ecran de
          sauvegarde que personne n'ouvre avant d'en avoir besoin. */}
      {etat.documents.length > 0 && (
        <p className="text-[11px] px-3 py-2 rounded-lg break-words" data-testid="crm-immo-documents-note-sauvegarde"
          style={{ background: t.surface.secondary, color: t.text.tertiary }}>
          Une sauvegarde CRM Immo enregistre les fiches de ces documents (nom, dossier, type, date),
          mais <strong>pas les fichiers eux-mêmes</strong>. Conservez vos originaux.
        </p>
      )}
    </div>
  );
}
