-- Retire trois politiques PERMISSIVE « USING true » sur public.registration_requests.
--
-- LE DEFAUT, MESURE LE 25/10/2026 (role postgres, qui ignore la RLS) :
--
--   Authenticated users can view all requests     SELECT  PERMISSIVE  authenticated  USING true
--   Authenticated users can update requests       UPDATE  PERMISSIVE  authenticated  USING true
--   Authenticated users can delete requests       DELETE  PERMISSIVE  authenticated  USING true
--
-- Trois politiques « SA only » existent a cote, correctement bornees par get_my_role().
-- Elles ne restreignent RIEN : en PostgreSQL, des politiques PERMISSIVE se cumulent en OU.
-- Le USING true l'emporte donc toujours, et n'importe quel compte connecte — un client
-- suffit — peut lire, modifier et supprimer TOUTES les demandes d'inscription. Or la table
-- porte une colonne `password` en texte.
--
-- POURQUOI CE N'EST PAS UNE URGENCE, ET POURQUOI IL FAUT QUAND MEME LE FAIRE MAINTENANT :
-- la table est VIDE (0 ligne au 25/10/2026). Il n'y a donc aucune donnee exposee a cet
-- instant. Mais le defaut est latent : la premiere demande d'inscription deposee le
-- deviendrait, sans que rien ne le signale. On ferme avant que cela n'arrive.
--
-- CE QUI RESTE APRES : les trois politiques « SA only », qui disent exactement ce qu'elles
-- veulent dire. L'insertion par un visiteur anonyme n'est pas touchee — c'est elle qui
-- permet a quelqu'un de demander un acces.

drop policy if exists "Authenticated users can view all requests" on public.registration_requests;
drop policy if exists "Authenticated users can update requests" on public.registration_requests;
drop policy if exists "Authenticated users can delete requests" on public.registration_requests;
