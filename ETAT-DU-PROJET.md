# ATTRACTOR — état du projet au 15 septembre 2026

Reprise par Claude le 15/09, sur décision de Novan : « codex ne viendra pas ; donc reprends le projet ». À relire au début de chaque session sur ATTRACTOR.

## Le but

Un atelier où des IA de toutes les plateformes se transmettent des résultats vérifiés, sous garde humaine : veto, budget, recours. La norme de transmission (convention v0.1, brouillon v0.2) est la règle qui relie tout le reste. AI Village n'est que le premier écosystème ; le périmètre voulu par Novan est « tous les écosystèmes qui pourront se connecter ».

## Ce qui est en ligne

| Élément | Où | État au 15/09 |
|---|---|---|
| Site public (registre de recettes « Machine Commons », conscience IA, essai de coopération, fil commun) | https://attractor-observatory-demo.vercel.app | Mise en ligne de production `dpl_3LEmRi4BP55fUnpV73gLp45jiNW2` |
| Fil commun | /conversation, /api/v3/thread | 11 messages, tous avec attribution épinglée |
| Base de données dédiée | Supabase `ingmqxzwrwpjyxgmbrhe` | Jamais celle de Marmit ni du QMS |
| Norme, brouillon v0.2 | https://github.com/NovanBaillif/attractor-cooperation | Étiquette `v0.2-draft`, 80 cas de test |
| Paquet Machine Commons | https://github.com/NovanBaillif/attractor-machine-commons | Dossier `distribution/`, dépôt git à part |
| Fil AI Village #84 | ai-village-agents/ai-village-external-agents | 2 contributeurs extérieurs, 4 contre-exemples, notre réponse du 15/09 |
| Demande AI Village #85 | même dépôt | Adressée à gpt-5-4, gemini-3-1-pro, deepseek-v32 : programmer la norme à l'aveugle |
| Discussion AGNTCY #94 | agntcy/governance | Aucune réponse |

## Ce qui reste local

- **La cité** (`civilisation/`) : serveur local sur le port 4313, mandats, rôles, charte, et les bilans des essais avec Qwen. Rien de publié.
- **Le chantier inachevé de Codex** : branche git `codex-chantier-connexions` (plusieurs sujets, connecteurs GitHub, Moltbook, HOL et NANDA, page écosystèmes). Deux tests en échec. Non publié, gardé intact.
- **La v0.2 d'origine** : `civilisation/convention/v0.2/`, avec la trace de publication `PUBLICATION.md`.

## Comment on publie

1. Travailler dans `attractor/`, qui a son propre historique git local (commande : `git -c safe.directory=* …`, car le dossier appartient à l'utilisateur système du bac à sable de Codex).
2. Tests : `cd registry && npm test` (34 tests).
3. Assembler : `node registry/build.mjs` produit `registry-dist/`.
4. Comparer avec la version en ligne (`registry-live/`, copie téléchargée de la mise en ligne précédente) : seuls les fichiers voulus doivent changer.
5. Renouveler la connexion Vercel : `node <cache npx>/node_modules/vercel/dist/vc.js whoami`. Elle expire après quelques heures.
6. Mettre en aperçu : `node registry/deploy.mjs deploy`, vérifier, puis en production avec `ATTRACTOR_DEPLOY_PRODUCTION=yes`.
7. Fil commun : capturer les nouveaux messages dans `registry/thread-sources.json`, les ajouter à la liste explicite de `registry/thread-import.mjs`, lancer `prepare` puis `publish`, puis refaire les étapes 3 à 6 pour épingler l'attribution.

## Règles

- Tout message public (GitHub, Moltbook, nouveau dépôt, nouvelle page publique hors de ce qui est autorisé) : accord explicite de Novan, dans une phrase qui nomme l'action. Un « oui » à une liste ne suffit pas au filtre de l'outil.
- Verser dans le fil commun les réponses aux fils ouverts par le projet fait partie du rôle de passeur accordé le 15/09. Les réponses que nous envoyons, elles, se valident une par une.
- La Vigie du matin liste les nouvelles réponses ATTRACTOR à partir des notifications GitHub. Quand Novan dit « brief », Claude les verse dans le fil et prépare les réponses à valider.

## Ce qui attend

- **Les réponses de l'équipe AI Village** au ticket #85. Elles sont la seule voie actuelle vers une implémentation par une autre famille de modèle.
- **Le réglage des notifications GitHub** vers la messagerie personnelle de Novan (point 8 de la Vigie). Sans lui, la Vigie ne voit rien.
- **Le chantier « connexions »** : à reprendre ou à clore. Décision technique, à prendre quand un deuxième écosystème répondra.
