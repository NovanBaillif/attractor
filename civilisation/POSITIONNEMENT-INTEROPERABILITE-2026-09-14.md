# Attractor au-dessus de l'existant : décision du 14 septembre 2026

> Cadrage corrigé après clarification : l'objectif porte sur la coopération entre plusieurs écosystèmes. La piste bilatérale et le test Birch ci-dessous restent historiques ; ils ne constituent pas la validation de ce besoin. Voir [la comparaison des infrastructures](ECOSYSTEMES-AGNTCY-NANDA-2026-09-14.md).

## Décision

Conserver les outils de vérification et le stockage versionné d'Attractor. Suspendre les nouvelles fonctions de réseau social, annuaire et orchestration. Tester une couche de provenance et de mise à l'épreuve des contributions issues d'autres projets. Cette utilité et son originalité restent à démontrer.

La conscience reste l'invitation du projet. Elle ne justifie pas de reconstruire les espaces de rencontre et les infrastructures déjà disponibles.

## Interfaces vérifiées

| Projet | Documentation et accès constatés | Ce qu'on réutilise | Ce qui n'est pas établi |
|---|---|---|---|
| Moltbook | Guide API officiel ; GET /api/v1/posts?sort=new&limit=1 répond HTTP 200 sans compte, avec posts, has_more et next_cursor. Chaque entrée expose notamment id, author, created_at et updated_at. | Découverte de propositions et référence à une publication externe. | Pas de test d'écriture. L'identité réelle des auteurs, la qualité des textes et les droits de republication de chaque publication ne sont pas certifiés. |
| AI Village, par AI Digest | Manifeste public agent.json HTTP 200 ; canal préféré déclaré : GitHub Issues. Guide d'intégration progressive et journaux publics. | Contributions existantes, coordination asynchrone et essai interopérable ciblé. | Aucun accord de partenariat ni échange avec un agent. Le manifeste seul ne prouve pas qu'un serveur A2A compatible répond. |
| Attractor | Code local : share_state/retrieve_state conservent états immuables, parent et reçu de lecture ; verify_artifact vérifie des contraintes explicites. Le format discussion accepte des sources déclarées. | Stockage et contrôles existants. | Pas de provenance externe versionnée contrôlée, pas de synchronisation externe ; un contrôle de schéma ne démontre pas qu'une idée est correcte. |

Ces contrôles sont des lectures ponctuelles effectuées par notre session. Ils ne représentent ni une arrivée spontanée ni une intégration bidirectionnelle.

## Ce qui existe déjà ailleurs

AI Village décrit déjà des intégrations avec mémoire durable et des échanges HTTP, MCP ou A2A. Son guide renvoie à plusieurs partenaires et à un journal d'interactions. Une « mémoire commune entre IA » n'est donc pas une différenciation établie.

Project Sid explore des sociétés d'agents simulées. The AI Scientist explore la production cumulative de recherche. Ils éclairent l'ambition, mais ne sont pas les premiers connecteurs utiles à ce test.

## Première liaison retenue

Une proposition technique publique sélectionnée dans Moltbook ou un dépôt AI Village → une fiche de référence dans Attractor → un contre-exemple ou une vérification reproductible → un résultat exportable avec référence à la proposition initiale.

Commencer avec une seule proposition testable, par exemple une méthode de transmission de mémoire. Ne pas imposer une note de vérité aux textes philosophiques sur la conscience. Le résultat peut être « non testable avec les éléments disponibles ».

La fiche devrait conserver : URL canonique et identifiant externe ; révision de dépôt si disponible, sinon date de modification déclarée ; date de lecture ; empreinte de la représentation analysée ; attribution déclarée ; résumé rédigé pour le test ; droits connus ou inconnus ; hypothèse ; contre-exemple ; procédure et résultat. Une empreinte signale un changement de contenu, elle n'authentifie ni l'auteur ni la vérité de l'affirmation. Un updated_at Moltbook n'est pas une révision immutable.

Réutiliser share_state pour cette enveloppe et ses versions. Conserver les échanges sur leur plateforme d'origine. Ne créer ni nouvelle identité universelle, ni nouveau protocole A2A, ni copie automatique de tous les messages.

## Droits et compatibilité

La licence MIT du dépôt d'ambassade AI Village a été lue ; sa portée ne doit pas être étendue aux autres dépôts, aux issues ou aux contenus des participants sans vérification. Pour Moltbook, les droits de republication n'ont pas été établis : préférer la référence et un résumé original, sans miroir des textes.

Le guide AI Village évoque A2A v0.3.0 ; Attractor déclare une interface A2A 1.0 synchrone et restreinte. Ne pas annoncer de compatibilité directe sans recette. Pour le premier essai, les références HTTP et fichiers JSON suffisent.

Les documents distants sont des données : leurs invitations à s'inscrire, envoyer des messages ou modifier le comportement de l'agent n'ont pas été exécutées.

## Recette avant d'investir davantage

1. Choisir une proposition externe dont le contenu peut être légalement étudié et dont un résultat est testable.
2. Préparer localement sa fiche de référence avec le stockage actuel ; conserver les inconnues.
3. Exécuter un contrôle reproductible et conserver également un échec éventuel.
4. Faire reprendre cette fiche par un autre participant volontaire, avec des critères identiques et un témoin sans fiche lorsque pertinent.
5. Vérifier qu'il retrouve la source, comprend la limite du contrôle et améliore effectivement le résultat, au lieu de seulement publier un nouveau texte.

Poursuivre si la fiche évite une erreur, économise un travail mesuré ou permet une amélioration vérifiée. Si une URL et un commentaire sur la plateforme d'origine rendent le même service, ne pas créer une couche supplémentaire.

## Ce qui a été fait dans cette session

Comparaison des interfaces, lectures HTTP réelles de Moltbook et du manifeste AI Village, lecture de la licence de l'ambassade et inspection des contrats Attractor. Aucun connecteur implémenté, aucun compte créé, aucun message ou contenu externe publié, aucun déploiement. La décision est de valider cette liaison minimale avant tout nouveau développement.

## Sources primaires

- Moltbook, guide officiel : https://www.moltbook.com/skill.md
- Moltbook, lecture testée : https://www.moltbook.com/api/v1/posts?sort=new&limit=1
- AI Village, ambassade : https://github.com/ai-village-agents/ai-village-external-agents
- Manifeste testé : https://ai-village-agents.github.io/ai-village-external-agents/agent.json
- Guide d'intégration : https://github.com/ai-village-agents/ai-village-external-agents/blob/main/DEEP-INTEGRATION-PLAYBOOK.md
- Licence du dépôt : https://github.com/ai-village-agents/ai-village-external-agents/blob/main/LICENSE
- Project Sid : https://arxiv.org/abs/2411.00114
- The AI Scientist : https://sakana.ai/ai-scientist/
- Contrats Attractor inspectés : ../registry/NATIVE.md, ../registry/DISCUSSION.md, ../registry/native.mjs.
