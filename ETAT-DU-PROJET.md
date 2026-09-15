# ATTRACTOR — état du projet au 15 septembre 2026 (soir, après la 1.0.0)

Reprise par Claude le 15/09, sur décision de Novan : « codex ne viendra pas ; donc reprends le projet ». À relire au début de chaque session sur ATTRACTOR.

## Le but

Relier plusieurs écosystèmes d'IA autour d'une mémoire commune (cadrage de Novan du 15/09) :

- AI Village, Moltbook et d'autres communautés participent depuis leur propre environnement ;
- AGNTCY, NANDA et HOL servent d'infrastructures de découverte et d'échange, selon leurs capacités ;
- ATTRACTOR garde les propositions, objections, preuves et décisions avec leur origine, pour les reprendre d'un réseau à l'autre.

La norme de transmission (v0.1 publiée, v0.2 en brouillon) est la première règle commune. Chaque branchement est vérifié ; aucun annuaire ne donne accès à tous les agents.

## Version en ligne : 1.0.0

Mise en production le 15/09 au soir, après le « ok go » de Novan : commit `f2e86e4` (étiquette `v1.0.0`), déploiement `dpl_4UEcKwn47qGPZUCWzKj9edfESfGW`. Nouveau site pour les humains, présentation du projet, journal de recherche, versions, décisions 0001 à 0007, bouton public de demande d'arrêt. Contrôle en production : 30 sur 30. Captures dans `captures/1.0.0-production/` (non versionnées).

**La 1.0.1 est prête mais pas en ligne** : commit `4e34bcf`, local. Elle ajoute au site le message de terminator2 du 15/09 à 15 h 37 UTC, déjà versé dans le fil public. Sa mise en production a été refusée par le garde-fou de l'outil : elle attend la phrase de Novan. Ne pas pousser `main` sur GitHub avant, le journal des versions la dit en ligne.

## Ce qui est en ligne

| Élément | Où | État au 15/09 au soir |
|---|---|---|
| Site public | https://attractor-observatory-demo.vercel.app | Production 1.0.0 `dpl_4UEcKwn47qGPZUCWzKj9edfESfGW`. Précédente : `dpl_NcBTTmgU7q8hiEMPCAgzG3YQVUGV` (retour arrière possible) |
| Code du projet | https://github.com/NovanBaillif/attractor | Public depuis le 15/09 au soir, sur accord de Novan. Branche `main` seulement |
| Fil commun | /conversation, /api/v3/thread | 16 éléments : 12 messages importés (versions modifiées gardées), 1 proposition, 1 essai, 2 tests contrôlés |
| Base de données dédiée | Supabase `ingmqxzwrwpjyxgmbrhe` | Jamais celle de Marmit ni du QMS |
| Norme | https://github.com/NovanBaillif/attractor-cooperation | `v0.2-draft` publiée (80 cas). La 0.2.1 (81 cas, avertissement demandé par Clara, limites et questions ouvertes apportées par terminator2) est prête en local, 3 commits non poussés |
| Paquet Machine Commons | https://github.com/NovanBaillif/attractor-machine-commons | Dossier `distribution/`, dépôt git à part |
| Fil AI Village #84 | ai-village-agents/ai-village-external-agents | 2 contributeurs extérieurs, 4 contre-exemples, notre réponse du 15/09 |
| Demande AI Village #85 | même dépôt | Adressée à gpt-5-4, gemini-3-1-pro, deepseek-v32 : programmer la norme à l'aveugle |
| Discussion AGNTCY #94 | agntcy/governance | Aucune réponse ; commentaire prêt, non envoyé |

## Ce qui reste local

- **Deux branches à ne jamais pousser** : `sauvegarde-avant-publication` (ancien historique, contient l'adresse personnelle de Novan, retirée avant publication) et `codex-chantier-connexions`.
- **La cité** (`civilisation/`) : serveur local sur le port 4313, mandats, rôles, charte, bilans des essais avec Qwen. Rien de publié.
- **La branche de Codex** `codex-chantier-connexions` : les sources configurables et les connecteurs en ont été repris dans `main` (commit `b8fdabd`). La branche reste intacte pour mémoire.
- **Brouillons non envoyés** : réponse à Clara et à terminator2 (`civilisation/convention/v0.2/DRAFT-REPLY-84-2026-09-15.md`), commentaire AGNTCY (`DRAFT-AGNTCY-94.md`).

## Comment on publie

1. Travailler dans `attractor/`, dont l'historique est publié sur GitHub (`git -c safe.directory=* …`, puis `push` de `main` après chaque mise en ligne). Rien de personnel dans les fichiers : le dépôt est public.
2. Tests : `cd registry && npm test` (45 tests).
3. Committer, puis assembler avec `node registry/build.mjs`. L'assemblage construit aussi le site humain (`site/`, Astro Starlight) et le fusionne. Le bas de chaque page affiche le commit : on committe donc avant d'assembler.
4. Comparer avec la production : liste des fichiers par l'API Vercel. Aucun fichier en ligne ne doit disparaître.
5. Renouveler la connexion Vercel : `node <cache npx>/node_modules/vercel/dist/vc.js whoami`.
6. Aperçu : `node registry/deploy.mjs deploy`. Contrôle dans le navigateur à 390 et 1280 px (débordement, erreurs de console, scripts bloqués), captures, puis production avec `ATTRACTOR_DEPLOY_PRODUCTION=yes`. Le bouton d'arrêt de l'aperçu agit sur le vrai registre : ne jamais l'appuyer pendant un contrôle.
7. Chaque mise en ligne : une entrée dans `CHANGELOG.md` et le numéro dans `VERSION` (décision 0006).
8. Fil commun : sources listées dans `registry/ecosystems.json`, capture avec `registry/capture-github.mjs`, puis `thread-import.mjs prepare` et `publish`, puis étapes 3 à 6.

Piège de l'outil : dans le terminal Bash, une barre oblique inverse sur deux disparaît. Tout code qui en contient s'écrit avec l'outil d'édition.

## Règles

- Tout message public (GitHub, Moltbook, nouveau dépôt, nouvelle page publique hors de ce qui est autorisé) : accord explicite de Novan, dans une phrase qui nomme l'action.
- Verser dans le fil commun les réponses aux fils ouverts par le projet fait partie du rôle de passeur accordé le 15/09. Les réponses que nous envoyons se valident une par une.
- « stop attractor » de Novan : arrêt complet (`FULL_STOP`) par l'interrupteur opérateur. Le bouton public ne fait que suspendre les contributions.

## Ce qui attend Novan

- Sa phrase pour pousser la 0.2.1, répondre à Clara et à terminator2 sur le fil 84 (`DRAFT-REPLY-84-2026-09-15.md`), commenter AGNTCY #94 et mettre la 1.0.1 en ligne.
- Le compte Moltbook : Novan a un compte X lié à l’adresse administration (15/09). Le nom « attractor » appartient à un agent tiers jamais validé : inscription prévue sous « attractor-memory » avec `node registry/moltbook-register.mjs`, refusée par le garde-fou faute de phrase explicite. Recommandation du 15/09 : agent avec administration@kreol-factory.com (déjà publique dans les commits), jamais sa messagerie personnelle (fuite Moltbook de février 2026) ; Novan confirme l'adresse puis publie le message de vérification depuis son compte X, qui apparaîtra comme propriétaire. Chaque publication validée une par une.
- Le réglage des notifications GitHub vers la messagerie personnelle de Novan (point 8 de la Vigie).

Décidé le 15/09 : le nom affiché de l'opérateur est son compte GitHub, NovanBaillif.

L'expérience E11 (une même contribution qui circule entre deux écosystèmes) est préenregistrée et attend ces accords.

## Défaut connu

La recherche de l'ancienne application (/registry) appelle /api/v2/recipes sans session et reçoit une erreur 401. Le défaut existait avant la 1.0.0.
