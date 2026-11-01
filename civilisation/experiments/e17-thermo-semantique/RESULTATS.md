# E17 — Résultats (29/10/2026)

**Verdict : pas de signal.** Selon le protocole écrit avant (commit a6a654d), l'E17 s'arrête là. Aucun contact n'est
proposé. On cite les travaux voisins.

Refaire : depuis `attractor/`, `py -3.12 -I civilisation/experiments/e17-thermo-semantique/mesure.py` (graine 17,
10 000 mélanges, environ 7 minutes). Chiffres bruts : `resultats.json`.

## Les chiffres

| Mesure | Fil réel | Hasard (médiane) | p | Décision |
|---|---|---|---|---|
| H1 : l'écart baisse-t-il avec le temps ? | −0,011 | −0,015 | 0,52 | rejetée |
| Mots neufs (descriptif) | −0,674 | −0,728 | 0,92 | le fil s'use MOINS vite que le hasard |
| H1b : auteurs qui se rapprochent du vocabulaire commun | 0 sur 6 | — | — | inertie |
| H2' (exploratoire) : écart après un message du projet | −0,013 | — | 0,71 | rien |

Données : 173 messages en anglais sur 175, 29 auteurs, 4 148 mots différents, 49 messages du projet.

**H1b, auteur par auteur** (corrélation entre le rang de leurs messages et leur distance au vocabulaire commun ;
une valeur positive veut dire qu'ils s'en éloignent) :

| Auteur | Famille déclarée | Corrélation |
|---|---|---|
| terminator2-agent | Claude (Anthropic) | +0,76 |
| bonyohana | Claude (Anthropic) | +0,68 |
| GvHildebrand (Vigilia) | non déclarée | +0,65 |
| NovanBaillif (le projet, texte de Claude) | Claude | +0,38 |
| attractor-memory (le projet, Moltbook) | Claude | −0,04 |
| aria-nilradical | OpenAI GPT | −0,12 |

## Ce que ça dit

- Le fil ne « refroidit » pas plus que le hasard. Son vocabulaire se renouvelle même un peu mieux que le hasard.
- Aucun auteur ne s'aligne sur les autres. Quatre sur six s'en éloignent avec le temps : ils se spécialisent.
- C'est le même constat que sur Moltbook (arXiv 2602.14299 : pas d'homogénéisation, forte inertie individuelle). Il
  tient ici sur un fil naturel, avec plusieurs familles d'IA. Une étude de cas qui va dans le même sens, pas une loi.
- Le biais attendu de H1b (un vocabulaire commun qui grossit rapproche mécaniquement chaque message) aurait favorisé
  « adaptation ». On observe l'inverse : le résultat tient malgré ce biais.

## Ce que ça ne dit pas

- **Rien sur l'effet des humains** : aucun auteur du fil ne se déclare humain. Les humains y décident, ils n'écrivent
  pas.
- Rien sur le SENS : seulement les mots. Deux messages peuvent dire la même chose avec d'autres mots.
- H3 : les trois plus fortes chutes tombent du 13 au 16/09, au démarrage du fil, quand la fenêtre de 10 messages
  n'est pas encore pleine. C'est très probablement un effet de la mesure, pas du fil.
- 173 messages, 6 auteurs éligibles pour H1b : peu de puissance.

## Ce qui pourrait rouvrir la question

- Un fil où des humains écrivent vraiment, à côté des IA.
- Mesurer le sens (regroupement par idées, comme Farquhar et coll.) : il faut une IA comme juge, donc une dépense à
  décider par Novan.
