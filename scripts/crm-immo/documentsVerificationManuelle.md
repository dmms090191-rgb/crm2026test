# Documents CRM Immo — vérification manuelle

Ce qui suit est la seule partie du module que je n'ai pas pu vérifier moi-même : il faut
une session connectée, et je n'en ai aucune. Compte dix minutes.

Tout le reste — RLS, policies Storage, accès anonyme, séquences de suppression,
signatures, responsive — est mesuré et automatisé.

---

## Avant de commencer

Ouvre un dossier client dans **CRM Immo → Détails → Documents**, et garde cette requête
sous la main pour l'état de départ. Elle sert de point zéro à toutes les suivantes.

```sql
select d.nom_affiche, d.mime, d.taille, d.statut, d.mime_origine,
       c.nom as classeur, d.chemin,
       (select count(*) from storage.objects o
         where o.bucket_id = 'crm-immo-documents' and o.name = d.chemin) as objet_present
from crm_immo_documents d
left join crm_immo_classeurs c on c.id = d.classeur_id
order by d.created_at desc;
```

`objet_present` doit valoir **1** pour chaque ligne en statut `pret`. C'est la colonne
qui compte : elle croise la fiche en base et le fichier réel dans le stockage.

---

## 1. Ajouter un PDF

**Ajouter un document** → choisis un PDF.

Attendu : le document apparaît immédiatement, avec son poids. La requête ci-dessus doit
montrer `statut = pret`, `mime = application/pdf`, `mime_origine = null`, et
`objet_present = 1`.

Le chemin doit avoir exactement trois segments : `{company_id}/{dossier_id}/{uuid}.pdf`.

## 2. Ajouter une image

Même bouton, avec un JPG ou un PNG.

Attendu : une **miniature** s'affiche. Si l'image fait plus de 2560 px de côté, elle a
été réencodée — `mime` vaut alors `image/jpeg` et `mime_origine` porte le type d'origine,
et la mention « converti en JPEG » s'affiche sous le nom. Vérifie que l'image n'est pas
**couchée** : c'est le test de l'orientation EXIF sur ton appareil réel.

## 3. Deux fichiers du même nom

Ajoute deux fois le **même** fichier.

Attendu : deux lignes distinctes, deux chemins distincts, aucun écrasement.

```sql
select nom_affiche, count(*) as fiches, count(distinct chemin) as chemins
from crm_immo_documents group by nom_affiche having count(*) > 1;
```

`fiches` et `chemins` doivent être égaux.

## 4. Un faux type — le point que tu voulais fermer

Renomme un `.exe`, un `.zip` ou n'importe quel fichier en `.pdf`, et tente de l'ajouter.

**Attendu : refus**, avec « Ce fichier annonce un PDF, mais son contenu n'en est pas un.
Il a probablement été renommé. » Et **aucune ligne créée** :

```sql
select count(*) from crm_immo_documents where nom_affiche like '%.pdf';
```

Le compte ne doit pas avoir bougé.

## 5. Un fichier trop lourd

Un fichier de plus de 15 Mo.

Attendu : refus, avec le poids réel et la limite dans le message. Aucune ligne créée.

## 6. Ouvrir et télécharger

Les deux boutons de la ligne.

Attendu : le fichier s'ouvre dans un nouvel onglet, et se télécharge sous son **nom
affiché** — pas sous son nom technique.

**Le point de sécurité** : regarde l'URL de l'onglet ouvert. Elle doit contenir `token=`
et un chemin sous `/object/sign/`. Si tu y vois `/object/public/`, dis-le-moi : ce serait
une URL permanente, et c'est exactement ce qu'on a exclu. Recharge cette URL deux minutes
plus tard : elle doit être **expirée**.

## 7. Renommer

Le crayon, puis Entrée.

Attendu : le nom affiché change, et le chemin **ne change pas**.

```sql
select nom_affiche, chemin, created_at, updated_at from crm_immo_documents
order by updated_at desc limit 3;
```

`updated_at` doit avoir avancé, `chemin` être identique, `objet_present` toujours 1.

## 8. Créer un dossier, puis déplacer

**Nouveau dossier** → `Contrat`. Puis le bouton de déplacement sur un document, et choisis
`Contrat`.

Attendu : le document disparaît de la racine et apparaît dans le dossier. Essaie ensuite
de créer un second dossier nommé `contrat` (minuscule) : il doit être **refusé** avec
« Un dossier « contrat » existe déjà ici. »

```sql
select c.nom, count(d.id) as documents
from crm_immo_classeurs c left join crm_immo_documents d on d.classeur_id = c.id
group by c.nom;
```

## 9. Supprimer un dossier non vide

Le bouton de suppression du dossier `Contrat`, qui contient un document.

Attendu : **refus**, avec « Ce dossier contient encore 1 document. Déplacez-les ou
supprimez-les d'abord. » Le dossier est toujours là.

## 10. Supprimer un document — le contrôle le plus important

Note d'abord son chemin :

```sql
select id, nom_affiche, chemin from crm_immo_documents order by created_at desc limit 1;
```

Supprime-le, confirme. Puis, avec le chemin relevé :

```sql
select
  (select count(*) from crm_immo_documents where chemin = 'COLLE_LE_CHEMIN_ICI') as fiche,
  (select count(*) from storage.objects
     where bucket_id = 'crm-immo-documents' and name = 'COLLE_LE_CHEMIN_ICI') as objet;
```

**Les deux doivent valoir 0.** Une fiche sans objet, ou un objet sans fiche, est le défaut
que toute la séquence cherche à éviter.

## 11. Le bouton caméra — sur ton téléphone

Ouvre l'application sur l'iPhone ou le Samsung, va dans Documents, et touche
**Prendre une photo**.

Attendu : l'appareil photo s'ouvre **directement**, sans passer par la galerie. Prends un
document en photo. Vérifie ensuite :

- la photo apparaît, **droite** et non couchée ;
- le texte est lisible quand on l'ouvre ;
- le poids tourne autour de 700 Ko si elle a été convertie ;
- pendant l'envoi, « Envoi : fichier 1 sur 1 » s'affiche et le bouton est grisé.

C'est le seul point qui ne peut être vérifié que sur un vrai téléphone. Si l'appareil
photo n'ouvre pas directement sur Android, dis-le-moi : ce serait l'attribut `capture`
qui n'est pas pris en compte par ce navigateur-là.

## 12. Supprimer le dossier client

Avec des documents dedans. Note combien :

```sql
select count(*) from crm_immo_documents where dossier_id = 'ID_DU_DOSSIER';
```

Supprime le dossier. Puis :

```sql
select
  (select count(*) from crm_immo_dossiers where id = 'ID_DU_DOSSIER') as dossier,
  (select count(*) from crm_immo_documents where dossier_id = 'ID_DU_DOSSIER') as fiches,
  (select count(*) from storage.objects where bucket_id = 'crm-immo-documents'
     and name like 'COMPANY_ID/ID_DU_DOSSIER/%') as objets;
```

**Les trois doivent valoir 0.**

---

## Et après

Reste une requête de contrôle utile à garder, celle qui dirait qu'un défaut s'est glissé
quelque part. Elle doit toujours ne rien rendre.

```sql
-- Des fiches dont le fichier a disparu, ou des fichiers sans fiche.
select 'fiche sans objet' as quoi, d.nom_affiche, d.chemin
  from crm_immo_documents d
 where d.statut = 'pret'
   and not exists (select 1 from storage.objects o
                    where o.bucket_id = 'crm-immo-documents' and o.name = d.chemin)
union all
select 'objet sans fiche', o.name, o.name
  from storage.objects o
 where o.bucket_id = 'crm-immo-documents'
   and not exists (select 1 from crm_immo_documents d where d.chemin = o.name);
```
