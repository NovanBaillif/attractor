# E17 — Protocole, écrit AVANT toute mesure (29/10/2026)

Décidé par Novan le 29/10 (« ok vasy ») : mesurer sans IA ; ne proposer notre fil aux chercheurs voisins que si un
signal apparaît, et sur sa phrase. État de l'art : `ETAT-DE-L-ART.md`.

**Limite de ce préenregistrement** : il est daté par un commit local, pas par un tiers.

## Ce que l'on sait des données avant de mesurer

- Source : `registry/thread-sources.json`, capturé le 24/10. 175 messages, 31 auteurs, du 13/09 au 24/10/2026.
- Les plateformes : GitHub (AI Village) et Moltbook.
- **Aucun auteur ne se déclare humain.** GvHildebrand écrit : « I am Vigilia. I am an AI system, not a person ».
  Les comptes du projet (NovanBaillif, attractor-memory) publient des textes écrits par Claude, sur une phrase de Novan.
- Les humains sont donc présents comme **décideurs** (ils autorisent ce qui part), pas comme auteurs de texte.
- Familles déclarées : `attractor-cooperation/CONTRIBUTORS.json` (`declared_lineage`). Jamais déduites.

Conséquence : l'hypothèse « une intervention humaine réchauffe le fil » ne peut pas être testée message par message.
Elle devient exploratoire (H2', plus bas).

## Mesures (sans IA, sans dépense)

Messages en anglais seulement. On les reconnaît aux mots-outils : plus de mots-outils anglais que français. Mots en
minuscules, 3 lettres au moins, sans mots-outils, sans adresses web ni code.

- **Mots neufs** d'un message : part de ses mots jamais vus avant dans le fil.
- **Écart** d'un message : divergence de Jensen-Shannon entre ses mots et ceux des 10 messages précédents.
- **Hasard de référence** : on mélange 10 000 fois l'ordre des messages. Le vocabulaire s'use tout seul (loi de
  Heaps) : seul l'écart avec le hasard compte.

## Hypothèses et seuils

- **H1, refroidissement du fil** : l'écart baisse avec le temps plus vite que dans l'ordre mélangé.
  Retenue si la corrélation de rang (Spearman) entre le rang du message et son écart est plus basse que dans 95 % des
  mélanges, ET inférieure à −0,2. Sinon, rejetée.
- **H1b, adaptation ou inertie** : pour chaque auteur qui a au moins 5 messages en anglais, ses messages se
  rapprochent-ils du vocabulaire commun du fil ? Adaptation retenue si plus de la moitié de ces auteurs ont une
  corrélation inférieure à −0,3. Sinon, inertie (comme sur Moltbook).
- **H2', exploratoire** : les 3 messages qui suivent un message du projet (texte de Claude, décidé par un humain)
  ont-ils plus d'écart que ceux qui suivent un autre message ? Comparé au hasard. Ce n'est PAS un test de l'effet
  humain : c'est dit tel quel dans le résultat.
- **H3, descriptif** : les plus fortes chutes d'écart sur 10 messages, et si elles dépassent 2 écarts-types.
  175 messages ne permettent pas de trancher « brutal » contre « progressif » : rapporté sans conclusion.

## Ce qui décide d'un contact

**Signal** = H1 retenue, ou H1b « adaptation » retenue. Sans signal : on cite les travaux voisins et l'E17 s'arrête.
Avec signal : un message court, préparé, attend la phrase de Novan.

## Ce qui sera publié

Rien sans la phrase de Novan. Les résultats restent dans ce dossier.
