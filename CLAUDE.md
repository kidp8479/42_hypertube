# Hypertube — 42 post-tronc-commun

## Contexte

Projet 42 (slug `42cursus-hypertube`, 15750 XP, catégorie "Web"). Compte pour le
**RNCP Titre 6, Option 1 "Développement web et mobile", sous-catégorie Web**
(seuil : min 15 000 XP / min 2 projets — Hypertube seul dépasse déjà le seuil XP,
un 2e projet web sera fait ensuite, probablement **Red-tetris**, pour valider le
nombre de projets requis).

Sujet complet : `pdf/en.subject_hypertube.pdf` dans le dossier de veille
(`/home/kidp/42/veille-42-projets/`). Ne pas hésiter à aller relire le PDF
original en cas de doute — ce fichier résume les points clés mais n'est pas
exhaustif.

Étudiant post-tronc-commun, campus Paris, stage visé en **React / NestJS /
TypeORM**. Ce projet est choisi précisément parce que son sujet **n'impose
aucune contrainte de framework** (contrairement à Matcha/Camagru qui imposent
un micro-framework sans ORM) — c'est l'occasion de pratiquer la stack de stage
en conditions réelles sur un projet à forte valeur portfolio.

## Stack décidée

- Backend : **NestJS** + **TypeORM** (PostgreSQL)
- Frontend : **React**
- Rien d'autre n'est figé (auth lib, gestion torrent, transcodage, etc. —
  à décider en solo ou avec Claude selon l'avancement)

## Contraintes du sujet (à ne jamais violer — 0 non négociable si non respecté)

- **Torrent** : toute lib "clé en main" qui crée un stream depuis un torrent est
  interdite (webtorrent, pulsar, peerflix explicitement cités). Le téléchargement
  du torrent doit être fait "à la main" (implémentation du protocole BitTorrent
  ou libs bas niveau type parsing/tracker uniquement, pas de lib de streaming
  prête à l'emploi). Le stream vers le navigateur doit démarrer avant la fin du
  téléchargement complet ("streaming pendant le download").
- **Sources légales uniquement** : contenu libre de droits (ex. legittorrents.info,
  archive.org). Au moins 2 sources externes pour la recherche.
- **Sécurité (éliminatoire)** : pas de mot de passe en clair en DB, pas
  d'injection SQL possible, pas d'injection HTML/JS, validation de tous les
  formulaires et uploads, `.env` exclu du git (jamais de secret commit).
- **Aucune erreur/warning** en console navigateur ni côté serveur pendant la
  soutenance → 0 non négociable.
- Auth : email+password (hashé) + **OAuth "42 strategy" + au moins 1 autre
  provider** + reset password par email + logout 1-clic + choix de langue
  (défaut anglais).
- Bibliothèque de vidéos (utilisateurs connectés uniquement) : recherche sur
  ≥2 sources externes légales, résultats en vignettes triées par nom si
  recherche, sinon les plus populaires. Vignette = nom, année, note IMDb/OMDb/
  TMDb, cover, statut vu/pas vu. Pagination infinie (scroll, pas de lien "page
  suivante"). Tri/filtre par nom, genre, note, année.
- Page vidéo : lecteur intégré, résumé, casting (réalisateur, acteurs
  principaux...), durée, note, cover, commentaires (lecture + écriture).
  Téléchargement du torrent en tâche de fond non-bloquante si pas déjà
  téléchargé ; fichier conservé côté serveur après téléchargement complet mais
  **supprimé si non regardé pendant 1 mois**. Sous-titres anglais si
  disponibles + sous-titres dans la langue préférée de l'utilisateur si le film
  n'est pas déjà dans cette langue. Transcodage à la volée si le format n'est
  pas nativement lisible par le navigateur (mkv minimum à supporter).
- **API RESTful avec OAuth2** (`POST /oauth/token` avec client+secret → token) —
  endpoints précis imposés (`/users`, `/users/:id`, `/movies`, `/movies/:id`,
  `/comments`, `/comments/:id`, `/movies/:movie_id/comments`), y compris codes
  HTTP corrects (403 sur tentative de modif d'un autre profil, etc.). Preuve
  du caractère RESTful demandée en soutenance.

## Pas encore décidé / à trancher au démarrage de la session de travail

- Détail de l'implémentation du client BitTorrent (from scratch vs libs bas
  niveau autorisées type `bittorrent-protocol` / `bencode` / `parse-torrent` —
  à vérifier au cas par cas si elles comptent comme "streaming depuis un
  torrent" ou pas)
- Sources de recherche vidéo légales à utiliser (2 minimum)
- Provider OMDb vs TMDb pour les métadonnées
- Deuxième stratégie OAuth (en plus de 42) : Google ? GitHub ?
- Structure du monorepo (backend/frontend séparés vs workspace), docker-compose
- Stratégie de transcodage (ffmpeg à la volée, cache des formats convertis)

## Ne pas oublier

- Le sujet est daté (version 7.1) — toujours confirmer les règles exactes sur
  l'intra avant la defense finale, ce fichier n'est qu'un résumé de travail.
- Vérifier meta.intra.42.fr pour la certification RNCP avant de considérer ce
  projet "acquis" pour la sous-catégorie Web (seuils XP/nb projets à
  reconfirmer côté officiel).
