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
- Bascule `synchronize: true` → migrations TypeORM : pas encore, le schéma
  `User` bouge encore trop vite (hashing/reset password en cours, puis
  `movies`/`comments` à venir). À faire une fois le schéma `User` stabilisé
  (fin HYP-10) ou avant d'avoir des données réelles à préserver — pas avant.

## Standards d'ingénierie (workflow "vraie boîte")

Projet volontairement traité comme un vrai projet pro, pas un rendu d'école
jetable : sécurité, clarté du code et discipline de process sont pris au
sérieux, pas juste "assez pour valider le sujet".

**Revue de code**
- Une issue Linear = une branche = une PR, même en solo — se relire le diff
  avant merge (skill `/code-review`) plutôt que merger direct sur `main`.
- CI (lint/format/typecheck/test/build) doit être verte avant merge. Ne
  jamais bypasser le hook pre-commit ou la CI (`--no-verify` interdit sauf
  demande explicite).
- Chaque nouvel endpoint/service ship avec au moins un test unitaire avant
  merge ; les flows d'auth (register/login/reset/logout) ont aussi un test
  e2e.

**Sécurité — checklist à appliquer à tout endpoint touchant à
l'authentification ou aux données utilisateur**
- Aucun secret en clair : mots de passe hashés (argon2id, recommandé plutôt
  que bcrypt — standard OWASP actuel), tokens de reset password générés
  aléatoirement, à usage unique, expiration courte, et **hashés en base**
  (jamais stockés en clair, même logique que le mot de passe).
- Toute route mutative (`PATCH`/`DELETE` sur une ressource utilisateur) doit
  vérifier authentification + ownership (`req.user.id` == ressource visée)
  → 403 si ce n'est pas le propriétaire, jamais un accès silencieux. Le
  scaffold `nest g resource` type (`GET /users`, `PATCH /users/:id`, etc.)
  n'a par défaut **aucun guard** — à verrouiller avant tout merge sur `main`,
  jamais laissé "temporairement" ouvert au-delà d'une branche de travail.
- Ne jamais faire fuiter l'existence d'un compte (login, register,
  reset-password) : mêmes messages d'erreur, pas de différence de timing
  exploitable.
- Rate-limiter les endpoints d'auth (login, register, reset-password) —
  `@nestjs/throttler` ou équivalent, protection contre le brute-force et le
  spam d'emails de reset.
- Validation stricte de tout input (déjà en place via le `ValidationPipe`
  global `whitelist`/`forbidNonWhitelisted`/`transform`) — ne jamais faire
  confiance à un ID ou un rôle fourni par le client pour une décision
  d'autorisation.
- `synchronize: true` (TypeORM) reste acceptable en dev mais doit être
  remplacé par de vraies migrations avant la soutenance — état de schéma
  reproductible, pas de risque de perte de données silencieuse.
- Secrets uniquement via `.env` (gitignoré) — jamais dans le code, l'historique
  git, Slack ou Linear. Gitleaks + Dependabot déjà branchés en CI : traiter
  les PR Dependabot rapidement plutôt que les laisser s'accumuler.

**Clarté du code et commentaires**
- Commenter le POURQUOI, pas le QUOI (déjà la pratique dans `user.entity.ts`
  / `users.service.ts` — continuer ainsi). Un commentaire qui répète ce que
  le nom de la variable/fonction dit déjà ne sert à rien.
- Docs Compodoc sur les classes/méthodes exposées publiquement (entités,
  services, controllers) — pas besoin sur le code privé/évident.
- Tout ce qui est écrit dans le repo (code, commentaires, commits, docs)
  reste en anglais, y compris les commentaires inline — la conversation
  avec Claude reste en français ([[feedback_docs_in_english]]). Vérifier
  qu'aucun commentaire français ne s'est glissé dans le code avant de
  merger.

## Ne pas oublier

- Le sujet est daté (version 7.1) — toujours confirmer les règles exactes sur
  l'intra avant la defense finale, ce fichier n'est qu'un résumé de travail.
- Vérifier meta.intra.42.fr pour la certification RNCP avant de considérer ce
  projet "acquis" pour la sous-catégorie Web (seuils XP/nb projets à
  reconfirmer côté officiel).
