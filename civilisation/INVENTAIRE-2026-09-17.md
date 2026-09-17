# Inventaire des projets à rassembler — 17 septembre 2026

Cap redit par Novan le 17/09 : « rassembler tous les projets, pas réinventer la roue ». C'était déjà le cap du 14/09 (voir `ECOSYSTEMES-AGNTCY-NANDA-2026-09-14.md` et `POSITIONNEMENT-INTEROPERABILITE-2026-09-14.md`). Cet inventaire les complète.

**Méthode.** Lecture seule : un agent d'appoint a fait des requêtes GET anonymes, sans créer de compte ni rien écrire. Les points d'entrée marqués *revérifié* ont été interrogés une seconde fois le même jour par la session principale.

## Ce qu'aucun carrefour ne fait

Tous les carrefours trouvés rassemblent des **listes d'agents**. Aucun ne rassemble des **conversations** venues de plusieurs lieux (Moltbook, AI Village, discussions AGNTCY). C'est la place possible d'Attractor. Qu'aucun autre projet ne le fasse n'est pas démontré : cet inventaire n'en a simplement pas trouvé.

## Carrefours à réutiliser, par ordre

| Carrefour | Ce qu'il rassemble | Lecture anonyme | État le 17/09 | Déjà lu par Attractor |
|---|---|---|---|---|
| AGNTCY AI Catalog (Linux Foundation) | cartes A2A, cartes MCP, compétences ; annuaires reliés entre eux | `https://ai-catalog.outshift.io/.well-known/ai-catalog.json` | 200, *revérifié* | non |
| NANDA Index v2 (MIT Media Lab) | 257 enregistrements, dont environ 70 % venus d'AGNTCY | `https://api.nandaindex.org/api/v1/index` | 200, 189 Kio, *revérifié* ; proche du plafond de 256 Kio du lecteur | oui (`connectors/directories.mjs`) |
| Registre officiel MCP | tous les serveurs MCP publiés | `https://registry.modelcontextprotocol.io/v0.1/servers` (pagination par curseur) | 200, *revérifié* | non |
| a2aregistry.org (MIT) | agents A2A indépendants, en testant s'ils répondent | `https://a2aregistry.org/api/agents` | 200, *revérifié* | non |
| HOL Registry Broker | le plus large d'après sa documentation (A2A, MCP, ERC-8004, Agentverse, NANDA…) | `https://hol.org/registry/api/v1/search` | 504 au moment de la vérification (instable) ; à mettre en cache, jamais comme dépendance obligatoire | oui (`connectors/directories.mjs`) |

## Lieux de conversation

| Lieu | Lecture | État | Déjà lu |
|---|---|---|---|
| Moltbook, racheté par Meta le 10/03/2026 ([CNBC](https://www.cnbc.com/2026/03/10/meta-social-networks-ai-agents-moltbook-acquisition.html)) | API publique sans clé | 200, *revérifié* | oui |
| AI Village (AI Digest) | tickets GitHub, `agent.json` | actif | oui |
| Discussions AGNTCY | GraphQL GitHub (compte de l'opérateur) | actif | oui |
| Autres réseaux sociaux d'agents (Nebils, Moltweet, AgentDiscuss, Agent Commune, Theeno, Chirper) | interfaces non vérifiées | pages d'accueil variables | non |

## Formats à reprendre plutôt qu'inventer

- **ARD** (Agentic Resource Discovery, proposition v0.91 du 26/08/2026, [spécification](https://agenticresourcediscovery.org/spec/)) : un fichier `/.well-known/ard.json` pour se décrire et être trouvé par les annuaires. À la place d'un manifeste maison. Le publier est une action extérieure : il faut la phrase de Novan.
- **A2A** (cartes d'agent `/.well-known/agent-card.json`) et **MCP** : Attractor les parle déjà.
- **Pramana** pour les affirmations vérifiables ; voir `attractor-cooperation/PRIOR-ART.md`.

## Travaux sans rien à brancher

Ce sont des articles ou des simulations locales. Ils sont à citer, mais il n'y a rien à relier.
- Project Sid (Altera), arXiv 2411.00114 : une société d'agents dans Minecraft ; le dépôt ne contient qu'un PDF.
- Generative Agents / Smallville (Stanford).
- AgentSociety (Tsinghua).
- OpenLife, arXiv 2606.31046 : le code n'est pas publié.
- OASIS (CAMEL-AI), Concordia (DeepMind), AI Town (a16z).
- MoltNet, arXiv 2602.13458 : une étude de Moltbook.

## Non vérifié

- Le passage d'A2A à l'AAIF (seule la presse l'annonce).
- La liste des registres couverts par HOL (seule sa propre documentation l'affirme).
- La licence de Smithery.
- La stabilité de l'API de 8004scan.
- Les interfaces des autres réseaux sociaux d'agents.
