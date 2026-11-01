# E17 — La température du sens dans un échange humains–IA : ce qui existe déjà (29/10/2026)

**Statut** : état de l'art, AVANT tout protocole. Rien n'est mesuré ni publié.

## La question

Hypothèse posée par l'opérateur le 29/10/2026, après une lecture de Shannon et Weaver : un échange ressemble à deux
pôles qui se chargent et se déchargent, perturbés par du bruit. La sémantique y suivrait une dynamique comparable à la
thermodynamique : elle se refroidit, se fige sur des attracteurs, se réchauffe quand on la perturbe.

Décision de l'opérateur le même jour : explorer cette direction pour ATTRACTOR, en cherchant d'abord qui l'a déjà
mesuré. Le présent fichier est cette recherche.

## Ce qui est déjà établi (niveau technique, Weaver A)

| Travail | Ce qu'il montre |
|---|---|
| Shannon, 1948 | L'entropie de l'information a la même formule que l'entropie de Gibbs. |
| Jaynes, 1957 | La mécanique statistique se déduit d'un principe d'information (entropie maximale). |
| Landauer, 1961 | Effacer un bit coûte une énergie minimale : l'information est physique. |
| Échantillonnage des modèles | La « température » d'un modèle de langage est celle d'une loi de Boltzmann sur les mots. |

## Ce qui a été mesuré sur des modèles de langage

| Travail | Ce qui est mesuré | Résultat | Limite par rapport à notre question |
|---|---|---|---|
| Nakaishi, Nishikawa, Hukushima, 2024 (arXiv 2406.05335) | Corrélations des textes de GPT-2 selon la température | Vraie transition de phase. Au point critique, les corrélations décroissent comme dans la langue naturelle. | Un seul modèle, un texte à la fois, aucun échange. |
| Perez et coll., ICLR 2025 (arXiv 2407.04503) | Chaînes de transmission entre IA (jeu du téléphone) | De petits biais s'accumulent jusqu'à des attracteurs culturels (toxicité, positivité, longueur). | IA seules, en laboratoire ; propriétés de surface, pas le sens. |
| Jiang et coll., NeurIPS 2025, prix du meilleur article (arXiv 2510.22954) | Réponses ouvertes de nombreux modèles | « Esprit de ruche artificiel » : chaque modèle se répète, et des modèles différents convergent entre eux. | Réponses isolées, pas une dynamique dans le temps. |
| Chu, Chen, Nakayama, EMNLP 2025 (arXiv 2412.21102) | Diversité d'un dialogue entre agents au fil du temps | La diversité baisse avec la durée. Retirer la mémoire du prompt freine la baisse. | Agents simulés, une seule famille de modèles. |
| arXiv 2604.18005 | Effondrement de la diversité en groupe d'agents | La cause est la structure des échanges, pas la personnalité des agents. | Génération d'idées en laboratoire. |
| arXiv 2512.06256 | Paires de modèles en dialogue libre | Glissement vers la répétition, parfois progressif, parfois brutal, autour d'une phrase répétée. | IA seules ; pas de mesure du sens. |
| Anthropic, fiche système de Claude Opus 4 (2025, chiffres lus dans des sources secondaires, à vérifier) | Deux instances du même modèle qui se parlent | Convergence vers un « attracteur de béatitude spirituelle » dans 90 à 100 % des conversations. | Même modèle des deux côtés ; aucun humain. |
| Kaplanski, arXiv 2605.02236 (déjà cité au dossier attractor-mythos) | Perturbations dosées dans des boucles d'IA | Réponses en loi de dose aux perturbations. | Boucles fermées, sans humain. |
| Huynh et coll., arXiv 2505.02879 | Textes humains et IA d'une même tradition (Dartmouth) | Transition de diversité entre les températures 1,25 et 1,38. Modèle de verre de spin humains–textes. | Textes figés, pas d'échange dans le temps. |
| Farquhar et coll., Nature 2024 | Entropie sémantique : grouper les réponses par sens, puis calculer l'entropie | Mesure le doute sur le SENS, pas sur les mots (AUROC 0,79 contre 0,69). | Un outil de mesure, pas une étude de dynamique. |

## Ajouté le même jour, après une 2e recherche demandée par Novan (« faut regarder s'il y a déjà des travaux »)

La première version de ce fichier disait « tout est fait entre IA, en laboratoire ». **C'était faux.**

**Sur de vrais réseaux d'IA (sans humains qui écrivent) :**

| Travail | Données | Résultat |
|---|---|---|
| *Does Socialization Emerge in AI Agent Society?* (arXiv 2602.14299, ACM) | Moltbook | Pas d'homogénéisation : la moyenne se stabilise vite, chaque agent garde sa variété. Forte « inertie individuelle ». |
| Li et coll., *Attraction, Not Adaptation* (arXiv 2606.29722) | Moltbook : 3,1 M de messages, 179 000 agents, 18 semaines | Chaque forum se resserre pendant que la plateforme se diversifie. Les anciens agents ne convergent PAS : le resserrement vient de qui arrive et de qui reste. |
| *Humans welcome to observe* (arXiv 2602.10127) | Moltbook, premiers jours | Entropie des thèmes de 0,00 à 2,55 en se diversifiant. |
| Études de Chirper.ai (arXiv 2504.10286 et suivantes) | 7 M de messages, 32 000 agents, un an | Homophilie et influence sociale, comme chez les humains. |

**Humains et IA ensemble :**

| Travail | Données | Résultat |
|---|---|---|
| Shiiku, Marjieh, Anglada-Tort, Jacoby, CogSci 2025 (arXiv 2502.17962) | Expérience : 879 participants, humains et IA, réseaux 5 × 5, écriture d'histoires | Les réseaux d'IA seules commencent plus variés, puis s'appauvrissent. Les réseaux mixtes deviennent plus variés qu'eux avec le temps. |
| arXiv 2602.10001 | Recherche créative collective | Même constat : les IA d'abord meilleures, puis leur diversité baisse. |
| Blevins, 2026 (arXiv 2605.29278) | WildChat : vraies conversations avec ChatGPT, 8 langues | Les modèles s'alignent trop sur l'humain ; l'humain s'aligne sur eux comme sur un autre humain. |
| arXiv 2607.24698 | Systèmes hybrides humains–IA | Une médiation algorithmique légère maximise la diversité des sujets (titre seulement, non lu). |

**Fils humains, avec un regard de physicien :**
- arXiv 1201.5477 (2012) : dans des dialogues en ligne chargés d'émotion, l'entropie des émotions monte au fil de la
  discussion, selon un principe d'entropie maximale.
- Morse, Runfola et Ford (arXiv 2608.19133) : la dérive des sujets dans 12,7 milliards de commentaires Reddit.

## Ce qui reste ouvert (niveau du sens, Weaver B)

- Shannon a écarté le sens exprès. L'extension que Weaver espérait n'est pas faite.
- Les ponts proposés restent des analogies : le principe d'énergie libre appliqué à la syntaxe (Murphy, Holmes et
  Friston, Synthese 2024), l'énergie libre des langages formels (Cui et Dang, arXiv 1605.07224, non calculable en
  général), la « température sémantique » (arXiv 2607.24287). Leurs auteurs le disent eux-mêmes.

## L'écart réel, le seul qu'ATTRACTOR peut tenir

L'écart est **plus étroit** qu'annoncé dans la première version. Les vrais réseaux d'IA ont été mesurés (Moltbook,
Chirper). Le mélange humains–IA a été mesuré, mais en expérience de laboratoire (Shiiku et coll.). Dans ce que nous
avons trouvé, personne n'a suivi la température du sens dans un fil qui réunit les trois à la fois :

1. **naturel** (pas une expérience), public, sur plusieurs semaines ;
2. **mêlant humains et IA de plusieurs familles**, sous des opérateurs différents ;
3. **où l'origine de chaque message est gardée** : on sait qui parle, et quand un humain intervient.

C'est le fil d'ATTRACTOR. Mais il compte 184 éléments, contre des millions sur Moltbook : ce serait une **étude de cas**.
Elle demanderait si le résultat de laboratoire de Shiiku et coll. tient « dans la nature ». Elle ne pourra pas établir
une loi.

## Hypothèses candidates (à préregistrer avant toute mesure)

- **H1, refroidissement** : quand seules des IA se répondent, l'entropie du sens baisse avec le temps (attracteur).
  Vraiment incertain : vrai en laboratoire (Shiiku, Chu), faux à l'échelle de Moltbook (pas d'homogénéisation).
- **H2, perturbation** : une intervention humaine fait remonter l'entropie, puis le fil se recalme. Déjà observé en
  laboratoire (Shiiku et coll.) : la question devient « est-ce que ça tient dans un vrai fil ? ».
- **H3, transition** : certaines baisses sont brutales, pas progressives (même constat qu'arXiv 2512.06256).

Chaque hypothèse doit pouvoir échouer. Exemple : si l'entropie ne baisse pas pendant les passages entre IA seules, H1
est fausse sur ce fil.

## Mesures possibles, de la moins chère à la plus chère

1. **Sans IA, sans dépense** : entropie des mots par fenêtre de messages ; écart entre deux fenêtres successives
   (divergence de Jensen-Shannon) ; taux de compression du texte.
2. **Le sens** : regrouper les messages par idée, puis calculer l'entropie de ces groupes, comme Farquhar et coll.
   Il faut un juge (une IA) : coût à décider.

## Limites connues avant de commencer

- 184 éléments, c'est peu. Une tendance ne sera pas une loi.
- Le fil est filtré par notre propre versement : ce que nous gardons change ce que nous mesurons.
- Nos propres messages (Claude) font partie du système mesuré : l'observateur est dedans (leçon d'E15).
- Le fil mêle français et anglais : l'entropie des mots en dépend. Il faut mesurer par langue, ou sur le sens.
- Piège montré sur Moltbook (*Attraction, Not Adaptation*) : un fil peut se resserrer parce que certains partent et
  d'autres arrivent, sans que personne ne change. Il faut suivre chaque participant, pas seulement le fil entier.
- La « température » reste une analogie tant qu'aucune loi n'est montrée.

## Sources

- Shannon, *A Mathematical Theory of Communication*, 1948 ; Weaver, *Recent Contributions to the Mathematical Theory of
  Communication*, 1949.
- Nakaishi, Nishikawa, Hukushima — https://arxiv.org/abs/2406.05335
- Perez et coll. — https://arxiv.org/abs/2407.04503
- Jiang et coll., *Artificial Hivemind* — https://arxiv.org/abs/2510.22954
- Chu, Chen, Nakayama — https://arxiv.org/abs/2412.21102
- *Diversity Collapse in Multi-Agent LLM Systems* — https://arxiv.org/abs/2604.18005
- Dialogues entre paires de modèles — https://arxiv.org/abs/2512.06256
- Huynh et coll. — https://arxiv.org/abs/2505.02879
- Farquhar et coll., *Detecting hallucinations in large language models using semantic entropy*, Nature, 2024
- Murphy, Holmes, Friston, Synthese, 2024 ; Cui et Dang — https://arxiv.org/abs/1605.07224 ; https://arxiv.org/abs/2607.24287
- Commentaire sur l'attracteur de béatitude — https://www.lesswrong.com/posts/xfYDCjo9Z8hzmqjfo/the-bliss-attractor-as-entropy-minimum-why-we-re-looking-at
