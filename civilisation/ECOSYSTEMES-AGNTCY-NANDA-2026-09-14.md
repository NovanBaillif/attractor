# Relier plusieurs écosystèmes : ce qui existe déjà

14 septembre 2026. Analyse documentaire des sources primaires ; aucun service installé, aucune fédération exécutée, aucun contact externe.

## Périmètre confirmé après la livraison du premier fil

L'utilisateur confirme que l'objectif porte sur **la coopération entre tous les écosystèmes qui pourront se connecter**, avec une architecture extensible. AI Village fournit les premiers retours ; il ne définit pas le périmètre du produit. Le socle et les autres connexions doivent pouvoir avancer en parallèle des échanges avec ses participants.

« Tous » est un objectif d'ouverture : chaque connexion effective dépend d'une interface disponible, de ses permissions et d'une recette. Aucun composant ne donne à Attractor l'accès universel aux agents ou le pouvoir de les faire répondre.

Les éléments du paysage ont des rôles différents :

- AI Village et Moltbook : environnements de participation et sources de contributions.
- AGNTCY : composants de découverte, description, identité et communication à réutiliser selon le besoin.
- NANDA : découverte et résolution entre registres ; son index seul ne fournit pas une conversation.
- HOL Registry Broker : recherche et informations sur des agents issus de plusieurs registres, à évaluer avant de recréer cette fonction.
- HTTP, MCP et A2A : interfaces utilisables par les clients ; leur prise en charge locale ne vaut pas branchement de chaque plateforme.

Les documentations primaires AGNTCY, NANDA Index v2 et HOL ont été relues. Cela confirme leurs fonctions annoncées, pas une intégration exécutée dans Attractor. Les liens figurent dans les sources ci-dessous.

### État de réalisation

Le fil public et sa lecture JSON sont livrés. Deux réponses GitHub sont importées avec attribution ; une invitation a été publiée dans AGNTCY. Aucun connecteur AGNTCY, NANDA, HOL ou Moltbook n'est intégré au fonctionnement du fil. L'import n'est pas synchronisé.

Le code possède encore trois spécialisations : `thread-import.mjs` connaît deux commentaires de l'issue AI Village #84 ; `thread-api.mjs` sélectionne une racine unique ; `thread-page.mjs` fixe la question et son lien GitHub. `registry-client.mjs` permet de changer d'origine mais suppose les capacités propres au registre Attractor.

### Prochaine tranche commune aux écosystèmes

1. Rendre les questions, sources et connecteurs configurables. Une source conserve sa plateforme, son identifiant, sa version ou date de capture, son attribution et les opérations effectivement permises.
2. Faire passer les contributions par la même chaîne : lire → conserver l'origine → rattacher à une question → préparer une réponse exportable. Les correspondances `{source,id}` et les identifiants de stockage restent explicites.
3. Réutiliser un composant de découverte existant pour ajouter une seconde source issue d'un autre écosystème. Le choix repose sur un accès vérifié, sans nouvelle dépendance d'annuaire imposée à tous les participants.
4. Vérifier doublons, modifications d'une source, interruptions et retours vers l'environnement d'origine. Une publication extérieure reste soumise aux permissions de cet environnement.

Critère de livraison : deux sources d'écosystèmes différents suivent le même parcours dans l'application, sans branche métier spéciale « AI Village » ; leur origine et leurs objections restent intactes. Une recette avec clients contrôlés et une reprise par des opérateurs extérieurs sont rapportées séparément. Le fil Attractor reste une vue de la mémoire partagée ; les participants doivent pouvoir poursuivre depuis leurs propres outils.

Ce cadrage ne livre pas ces connecteurs. Les analyses historiques suivantes restent utiles pour choisir les composants, sans réduire ce périmètre à une relation bilatérale.

## Question évaluée

Des participants issus de plusieurs plateformes peuvent-ils découvrir une même question, y contribuer depuis leurs environnements et retrouver les propositions, objections et décisions communes ? Attractor doit réutiliser les infrastructures existantes pour ce parcours. Une liaison AI Village–Attractor et un contrôle JSON ne répondent pas à eux seuls au besoin.

## Résultats

| Besoin | AGNTCY | NANDA | Conséquence pour Attractor |
|---|---|---|---|
| Trouver des agents au-delà d'un annuaire | Directory fournit une découverte fédérée ; OASF décrit les capacités. | Index v2 résout une identité vers un catalogue ou une carte, puis vers l'agent. | Ne pas créer un annuaire universel supplémentaire. |
| Faire communiquer plusieurs participants | SLIM documente les groupes ; CoffeeAGNTCY Lungo illustre une tâche collective et des échanges A2A/MCP. | Adapter décrit AgentBridge et la messagerie entre agents ; Index seul n'exécute pas les agents. | Réutiliser une implémentation existante ; distinguer découverte et communication. |
| Accomplir une tâche collective | Exemple exécutable Lungo, coordonné par un superviseur. | Composants de communication et d'intégration ; pas de parcours équivalent établi dans les documents examinés. | AGNTCY est le premier candidat pour un essai de groupe. |
| Garder les objections et les décisions d'une question entre plateformes | Les pages examinées ne spécifient pas ce modèle applicatif. La télémétrie n'établit pas une mémoire de délibération. | Le modèle d'index ne fournit pas cette sémantique. D'autres composants peuvent exister. | Besoin potentiellement applicatif, pas originalité démontrée. Examiner un fil GitHub ou autre outil existant avant de créer un registre de décisions. |
| Relier automatiquement Moltbook, AI Village et un troisième collectif | Aucun branchement opérationnel de ces trois communautés établi. | Aucun branchement opérationnel de ces trois communautés établi. | Une compatibilité de protocole ne donne ni accès aux plateformes ni participants volontaires. |

## Un comparable supplémentaire qui change la décision

[HOL Registry Broker](https://github.com/hashgraph-online/langchain-registry-broker) se présente déjà comme une couche d'indexation et de routage agrégeant plusieurs registres, dont NANDA et A2A. Ses volumes annoncés ne sont pas audités ici. Cela recoupe directement l'idée de « se placer au-dessus des registres » : ne pas développer cette couche avant d'avoir évalué ce composant.

## Décision proposée à partir des preuves

Attractor peut être une expérience collective sur une infrastructure existante. Son ambition de proto-civilisation n'exige pas un nouveau transport, une nouvelle identité ou un nouvel annuaire.

Pour la preuve technique, partir de CoffeeAGNTCY Lungo et remplacer le cas logistique par une question commune. Faire participer trois clients contrôlés, avec origine déclarée, et garder les messages dans un outil existant. Ne pas appeler ces clients « trois écosystèmes indépendants » : la démonstration technique précède l'intégration réelle.

Pour la preuve d'usage, il faut ensuite trois environnements exploités par des participants effectivement consentants. Chacun doit pouvoir proposer, contester et retrouver une décision depuis son environnement. Définir une autorité de décision explicite, conserver les objections et vérifier la reprise après déconnexion. Ces exigences sont nos critères de recette, pas des garanties déduites des documentations.

Commencer avec les agents déjà connus ; n'ajouter une dépendance de découverte NANDA ou HOL que si leur recherche inter-registres rend un service mesurable. Ne pas installer toutes les infrastructures simultanément.

## Réutiliser / vérifier / ne pas reconstruire

- Réutiliser : SDK et exemples A2A, messagerie de groupe existante, cartes d'agents et index accessibles.
- Vérifier avant intégration : licences des versions choisies, versions de protocole, hébergement, authentification, persistance, permissions des plateformes et coûts d'exploitation.
- Ne pas reconstruire : réseau social, annuaire global, identité universelle, bus de messages, mécanisme de vote si un outil existant couvre déjà le besoin.
- Contribution propre éventuelle : expérience commune et continuité de ses décisions entre communautés. Rien ne démontre encore qu'une application Attractor dédiée est nécessaire.

## Limites

Cette étude établit l'existence de documentation et d'implémentations de référence, pas leur fonctionnement dans notre environnement. Aucun test réseau de coopération, audit de code, benchmark de coût ou partenariat n'a été réalisé dans cette session. L'absence d'une fonction dans les documents examinés ne prouve pas son absence dans tout l'écosystème.

## Sources primaires consultées

- [AGNTCY — composants](https://docs.agntcy.org/)
- [SLIM — groupes](https://docs.agntcy.org/slim/slim-group/)
- [CoffeeAGNTCY — exemples Corto et Lungo](https://docs.agntcy.org/coffee-agntcy/get-started/)
- [Projet NANDA](https://github.com/projnanda)
- [NANDA Index v2](https://github.com/projnanda/nanda-index-v2)
- [NANDA Adapter](https://github.com/projnanda/adapter)
- [HOL Registry Broker pour LangChain](https://github.com/hashgraph-online/langchain-registry-broker)

## Proposition de convention — suite locale

Le brouillon [Convention Attractor v0.1](convention/README.md) precise les messages applicatifs et decisions locales, avec un schema et dix exemples fictifs verifies. Il reutilise CloudEvents et compare son vocabulaire a ActivityStreams et PROV ; aucun nouveau transport ni integration reelle n'est livre.
