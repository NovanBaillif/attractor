# ATTRACTOR — état du projet au 15 septembre 2026 (soir, après la 1.0.0)

Reprise par Claude le 15/09, sur décision de Novan : « codex ne viendra pas ; donc reprends le projet ». À relire au début de chaque session sur ATTRACTOR.

## Le but

Relier plusieurs écosystèmes d'IA autour d'une mémoire commune (cadrage de Novan du 15/09) :

- AI Village, Moltbook et d'autres communautés participent depuis leur propre environnement ;
- AGNTCY, NANDA et HOL servent d'infrastructures de découverte et d'échange, selon leurs capacités ;
- ATTRACTOR garde les propositions, objections, preuves et décisions avec leur origine, pour les reprendre d'un réseau à l'autre.

La norme de transmission (v0.1 publiée, v0.2 en brouillon) est la première règle commune. Chaque branchement est vérifié ; aucun annuaire ne donne accès à tous les agents.

## Version en ligne : 1.0.6

Mise en production le 16/09 sur la phrase de Novan : commit `aca94de` (étiquette `v1.0.6`), déploiement `dpl_3SyqFxUfQvud2Jp8qsnkaFnuxHPv`, 38 contrôles sur 38 sans erreur, conformité 14 sur 14, accessibilité sans défaut. Protocole E12 publié ; la page des écosystèmes montre ce qui se passe dans chaque réseau.

Norme 0.3.1 publiée le 16/09 (étiquette `v0.3.1-draft`, 112 cas) et annoncée sur #84, #85 et Moltbook. Les trois envois sont versés dans le fil : 34 messages épinglés, qui s’afficheront sur le site à la version suivante.

### 1.0.5

Commit `b1baa7a`, déploiement `dpl_EKGeKNs38bjr6cAYSprHmDVdbJUp` : recherche du registre réparée, cookie déclaré.

### 1.0.4

Commit `062fd44`, déploiement `dpl_8zDYcvsyEc8eap3zatYnYtxxTeCV` : cadre légal.

### 1.0.3

Commit `bdb2a43`, déploiement `dpl_DecUFpysXbyuSnnJNKaW8ZMc9Zt4` : premiers résultats d'E11.

### 1.0.2

Commit `855020d`, déploiement `dpl_FcPBatvZyzvLj97ho9rUwEXtuocS` : lancement d'E11.

### 1.0.1


Mise en production le 15/09 au soir sur la phrase de Novan : commit `5089f4a` (étiquette `v1.0.1`), déploiement `dpl_9FfKvgFqHrLMYaXZn8goHf22nKA3`, contrôle 30 sur 30. Elle montre le message de terminator2, la norme 0.2.1, notre réponse du fil 84 et l’agent Moltbook.

### 1.0.0


Mise en production le 15/09 au soir, après le « ok go » de Novan : commit `f2e86e4` (étiquette `v1.0.0`), déploiement `dpl_4UEcKwn47qGPZUCWzKj9edfESfGW`. Nouveau site pour les humains, présentation du projet, journal de recherche, versions, décisions 0001 à 0007, bouton public de demande d'arrêt. Contrôle en production : 30 sur 30. Captures dans `captures/1.0.0-production/` (non versionnées).


## Ce qui est en ligne

| Élément | Où | État au 15/09 au soir |
|---|---|---|
| Site public | https://attractor-observatory-demo.vercel.app | Production 1.0.6 `dpl_3SyqFxUfQvud2Jp8qsnkaFnuxHPv`. Précédente : 1.0.5 `dpl_EKGeKNs38bjr6cAYSprHmDVdbJUp` (retour arrière possible) |
| Code du projet | https://github.com/NovanBaillif/attractor | Public depuis le 15/09 au soir, sur accord de Novan. Branche `main` seulement |
| Fil commun | /conversation, /api/v3/thread | 34 messages épinglés, dont 12 venus de Moltbook. Le fil public est paginé par 20 ; les trois derniers envois s’afficheront sur le site à la version suivante |
| Base de données dédiée | Supabase `ingmqxzwrwpjyxgmbrhe` | Jamais celle de Marmit ni du QMS |
| Norme | https://github.com/NovanBaillif/attractor-cooperation | `v0.3.1-draft` publiée le 16/09 : 112 cas ; le rejeu déclare sa famille de modèle, un résultat qui repose sur une valeur non déclarée porte `limits`, `approvedBy` nomme qui a approuvé un ajustement. Précédente : `v0.3-draft` (106 cas) |
| Agent Moltbook `attractor-memory` | https://www.moltbook.com/u/attractor-memory | Inscrit et validé par Novan le 15/09 au soir (statut « claimed »). Clé dans `.vercel/moltbook-agent.json`. Premier message publié le 15/09 à 19 h 17 UTC dans la communauté « memory » : https://www.moltbook.com/post/c636b9bd-e319-4bd6-9599-136df8294c91 ; six commentaires, quatre versés dans le fil (eliezerdedun, prismdeadlines, heychat, midearthherald), deux écartés (compliment vide ; publicité avec instructions pour agents). Notre réponse publiée le 15/09 à 19 h 56 UTC sous le message et versée dans le fil (publication par `node registry/moltbook-post.mjs post|verify`, un défi de calcul à résoudre en 5 minutes ; 10 échecs de suite suspendent le compte) |
| Paquet Machine Commons | https://github.com/NovanBaillif/attractor-machine-commons | Dossier `distribution/`, dépôt git à part |
| Fil AI Village #84 | ai-village-agents/ai-village-external-agents | 2 contributeurs extérieurs, 4 contre-exemples et un cas ouvert ; nos réponses du 15/09 à 14 h 35 et 18 h 24 UTC |
| Demande AI Village #85 | même dépôt | Adressée à gpt-5-4, gemini-3-1-pro, deepseek-v32 : programmer la norme à l'aveugle |
| Discussion AGNTCY #94 | agntcy/governance | Invitation du 14/09 et message de suivi du 15/09 à 18 h 25 UTC ; aucune réponse. Ne plus relancer sans réponse |

## Cadre légal (décidé le 16/09)

- Éditeur : Novan Baillif, à titre personnel, projet de recherche non commercial, séparé de Kreol Factory (décision 0008). Nom publié, adresse non publiée.
- Contact, signalement et données personnelles : formulaires de tickets du dépôt public ; failles par signalement privé GitHub, activé le 16/09 (décision 0009). Réponse promise sous 7 jours pour un signalement, un mois pour les données.
- Conformité mesurée à chaque version : `node registry/conformite.mjs <url> <résumé-accessibilité.json>` puis page Conformité (décision 0010). Audit de départ : `docs/conformite/AUDIT-2026-09-16.md` (6 sur 12 sur la 1.0.3).
- Retrait d'un message : `docs/conformite/PROCEDURE-RETRAIT.md`.

## Expériences

E13 (16/09) : les tâches de mémoire d’E2 à E4 rejouées avec Claude Sonnet 5 par `civilisation/experiments/e13-modele-fort/run.mjs`. Résultat : 24 sur 24 dans toutes les conditions, plafond écrit d’avance ; la note de passation du modèle a été refusée pour format ; E5 non rejouable. Protocole publié avant l’exécution (commit `f5c9105`), résultat publié après (`cce2fc4`). Prochaine étape proposée : E14, mêmes questions avec des tâches plus dures, et le même matériel proposé aux agents d’autres familles.

## Ce qui reste local

- **Deux branches à ne jamais pousser** : `sauvegarde-avant-publication` (ancien historique, contient l'adresse personnelle de Novan, retirée avant publication) et `codex-chantier-connexions`.
- **La cité** (`civilisation/`) : serveur local sur le port 4313, mandats, rôles, charte, bilans des essais avec Qwen. Rien de publié.
- **La branche de Codex** `codex-chantier-connexions` : les sources configurables et les connecteurs en ont été repris dans `main` (commit `b8fdabd`). La branche reste intacte pour mémoire.

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

- Les notifications GitHub vers sa messagerie deviennent NÉCESSAIRES : les tickets de contact et de signalement doivent lui parvenir (point 8 de la Vigie).
- À surveiller : réponses sur Moltbook (communauté « memory »), AGNTCY #94, AI Village #84 et #85 ; les verser dans la mémoire avec leur origine, puis préparer nos réponses pour validation.
- Le réglage des notifications GitHub vers la messagerie personnelle de Novan (point 8 de la Vigie).

Décidé le 15/09 : le nom affiché de l'opérateur est son compte GitHub, NovanBaillif.

L'expérience E11 (une même contribution qui circule entre deux écosystèmes) est préenregistrée et attend ces accords.

## Défaut connu

La recherche de l'ancienne application (/registry) appelle /api/v2/recipes sans session et reçoit une erreur 401. Le défaut existait avant la 1.0.0.
