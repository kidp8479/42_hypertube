# Hypertube - 42 post-tronc-commun

## Context

- 42 slug `42cursus-hypertube`, 15750 XP, category "Web".
- RNCP contribution: Titre 6, Option 1 "Développement web et mobile",
  sous-catégorie Web (seuil : min 15 000 XP / min 2 projets - Hypertube
  seul dépasse déjà le seuil XP, un 2e projet web viendra ensuite,
  probablement Red-tetris, pour le nombre de projets).
- Subject PDF: `pdf/en.subject_hypertube.pdf` dans
  `/home/kidp/42/veille-42-projets/` (version 7.1, daté - reconfirmer les
  règles exactes sur l'intra avant la soutenance finale ; ce fichier est
  un résumé de travail, pas exhaustif).
- Étudiant post-tronc-commun, campus Paris, stage visé React/NestJS/
  TypeORM. Projet choisi car son sujet n'impose aucune contrainte de
  framework (contrairement à Matcha/Camagru, qui imposent un
  micro-framework sans ORM) - occasion de pratiquer la stack de stage en
  conditions réelles sur un projet à forte valeur portfolio.

## Stack

- Décidé : backend **NestJS** + **TypeORM** (PostgreSQL) ; frontend
  **React**.
- Pas figé : lib auth, gestion torrent, transcodage.

## Eliminatory constraints (0 si violé)

- **Torrent** : toute lib "clé en main" créant un stream depuis un
  torrent interdite (webtorrent, pulsar, peerflix explicitement cités).
  Téléchargement "à la main" (protocole BitTorrent ou libs bas niveau
  type parsing/tracker uniquement, pas de lib de streaming prête à
  l'emploi). Le stream vers le navigateur doit démarrer avant la fin du
  téléchargement complet.
- **Sources légales uniquement** (ex. legittorrents.info, archive.org),
  au moins 2 sources externes pour la recherche.
- **Sécurité** : pas de mot de passe en clair en DB, pas d'injection SQL,
  pas d'injection HTML/JS, validation de tous les formulaires et
  uploads, `.env` exclu du git.
- **Aucune erreur/warning en console** navigateur ni côté serveur pendant
  la soutenance.
- **Auth** : email+password (hashé) + OAuth "42 strategy" + au moins 1
  autre provider + reset password par email + logout 1-clic + choix de
  langue (défaut anglais).
- **API RESTful avec OAuth2** (`POST /oauth/token` avec client+secret ->
  token), endpoints imposés (`/users`, `/users/:id`, `/movies`,
  `/movies/:id`, `/comments`, `/comments/:id`,
  `/movies/:movie_id/comments`), codes HTTP corrects (403 sur tentative
  de modif d'un autre profil). Preuve du caractère RESTful demandée en
  soutenance.

## Functional spec (résumé - relire le PDF en cas de doute)

- Bibliothèque de vidéos (connectés uniquement) : recherche sur ≥2
  sources légales, résultats en vignettes triées par nom si recherche,
  sinon les plus populaires. Vignette = nom, année, note IMDb/OMDb/TMDb,
  cover, statut vu/pas vu. Pagination infinie (scroll). Tri/filtre par
  nom, genre, note, année.
- Page vidéo : lecteur intégré, résumé, casting, durée, note, cover,
  commentaires (lecture + écriture). Téléchargement torrent en tâche de
  fond non bloquante si pas déjà téléchargé ; fichier conservé côté
  serveur après téléchargement complet, **supprimé si non regardé
  pendant 1 mois**. Sous-titres anglais si disponibles + langue préférée
  de l'utilisateur si le film n'est pas déjà dans cette langue.
  Transcodage à la volée si le format n'est pas nativement lisible par
  le navigateur (mkv minimum à supporter).

## 42 process checklist

<!-- instancié depuis .claude/standards/school-42.md -->

- Repo visibility: private (par défaut, pas de contrainte "public" sur
  ce sujet - à confirmer sur l'intra)
- Login in repo name: n/a
- Imposed directory structure: n/a (monorepo backend/frontend, structure
  libre)
- Evaluation runs on: the evaluated group's machine
- Solo or team: solo
- Seeded test accounts: <à définir avant la première session
  `browser-e2e`>

## Engineering standards

Project-agnostic standards: `.claude/standards/engineering.md`. Écarts /
ajouts propres à ce projet :

- `synchronize: true` (TypeORM) reste acceptable en dev tant que le
  schéma `User` bouge encore (hashing/reset en cours, puis
  `movies`/`comments` à venir) - migrations réelles avant la soutenance
  ou avant d'avoir des données réelles à préserver, pas avant.
- Docs Compodoc (JSDoc `/** */`) sur toute méthode/classe dont le WHY
  n'est pas évident à la lecture - publique ou privée (ex. `AuthService.
  dummyHash`, `UsersService.findAvailableUsername`). Pas de commentaire
  quand le nom + la signature suffisent déjà à comprendre le WHY.

## Not yet decided / à trancher au démarrage de la session de travail

- Détail de l'implémentation du client BitTorrent (from scratch vs libs
  bas niveau autorisées type `bittorrent-protocol` / `bencode` /
  `parse-torrent` - à vérifier au cas par cas)
- Sources de recherche vidéo légales à utiliser (2 minimum)
- Provider OMDb vs TMDb pour les métadonnées
- Deuxième stratégie OAuth (en plus de 42) : Google ? GitHub ?
- Structure du monorepo, docker-compose
- Stratégie de transcodage (ffmpeg à la volée, cache des formats)

## Don't forget

- Le sujet est daté (version 7.1) - toujours confirmer les règles
  exactes sur l'intra avant la soutenance finale, ce fichier n'est qu'un
  résumé de travail.
- Vérifier meta.intra.42.fr pour la certification RNCP avant de
  considérer ce projet "acquis" pour la sous-catégorie Web.
