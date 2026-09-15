**Une note rédigée par le modèle — 13 septembre 2026**

Le modèle a rédigé une note à partir de résultats antérieurs vérifiés, puis cette note a été transmise sans réécriture avec la recette à un nouveau contexte du modèle. Sur deux nouvelles tâches, l'archive dégrade le résultat : 8/16 contre 16/16 sans mémoire. La rédaction automatique fonctionne ; son utilité n'est pas démontrée par cet essai.

| Nouvelle tâche | Sans mémoire | Recette + note générée |
|---|---:|---:|
| Prix signé, code produit en majuscules et booléen | 8/8 | 0/8 |
| Étiquette conservant prix et numéro en texte | 8/8 | 8/8 |
| **Total** | **16/16** | **8/16** |

Sur la première tâche, le successeur avec archive oublie la conversion du code produit en majuscules. Il conserve seulement `trim`, comme dans la recette ancestrale. Cette observation est compatible avec une copie excessive de l'ancienne méthode ; elle ne prouve pas le mécanisme interne du modèle. Sur l'étiquette, les deux conditions produisent une recette correcte.

**Ce que l'auteur a transmis**

La note contient quatre sections : ce qui a fonctionné, les conditions d'application, les erreurs et les incertitudes. Elle décrit notamment la conversion des prix, la conservation des zéros dans les références et l'échec lié au champ générique `inputField`. Elle évoque aussi les limites de longueur des entrées.

Le texte provient intégralement de Qwen3:4b, sans correction ni sélection d'une meilleure réponse. Il cite des identifiants de preuve existants, mais certaines associations sont faibles : les contraintes de domaine sont rattachées aux exemples réussis plutôt qu'au contrat ; l'incertitude sur les longueurs est rattachée à l'échec d'un champ absent. La note décrit peu les limites de transfert vers un autre contrat. Ces constats sont une lecture après l'essai, non des corrections transmises au successeur.

La validation automatique contrôle uniquement la structure, la longueur et l'existence des identifiants cités. Elle ne certifie pas que chaque preuve implique l'affirmation. Le rapport porte explicitement cette limite. La note reste une archive expérimentale ; aucune nouvelle règle ni mémoire institutionnelle validée n'est publiée.

**Protocole**

Un appel auteur reçoit le contrat et deux exemples réussis et échoués issus des anciennes recettes, recalculés par l'oracle. Il ne reçoit aucune tâche future ni leurs tests. Les sources sont les rapports `2d6411d2-84e9-43b1-910f-e9604e2a0830.json` et `499dcc78-19cd-4b27-aee5-534fdd915fc3.json`, dont les empreintes sont conservées.

Les deux tâches suivantes sont définies avant l'appel auteur. Elles comportent huit cas chacune, absents des prompts. Chacune est traitée dans deux contextes sans historique : contrôle sans archive et ancienne recette accompagnée de la note générée. L'ordre est inversé sur la seconde tâche. Aucun retour des scores, aucune relance et aucune réécriture de la note pendant les cinq appels.

Même modèle et paramètres : température 0, seed 73, contexte maximal de 8 192 tokens, sortie maximale de 1 800 tokens, délai maximal de quatre minutes par appel. Les successeurs ont les mêmes plafonds ; la rédaction de la note représente un coût supplémentaire.

| Coût | Auteur de la note | Successeurs sans mémoire | Successeurs avec archive |
|---|---:|---:|---:|
| Appels | 1 | 2 | 2 |
| Tokens d'entrée | 536 | 432 | 1 608 |
| Tokens de sortie | 314 | 228 | 230 |
| Durée cumulée des générations | 10,55 s | 15,90 s | 15,37 s |

Total : cinq générations, 2 576 tokens d'entrée et 772 de sortie. Le coût de la condition avec mémoire comprend aussi l'appel auteur ; sa durée cumulée est donc d'environ 25,92 secondes. Aucun fournisseur payant. Modèle déchargé et verrou partagé libéré à la fin.

Rapport complet, avec note brute, requêtes et tests : `attractor/data/civilisation/runs/authored-memory-2e90c8d8-3f75-4efd-b612-de035294a0cb.json`.

**Interprétation**

Le gain observé auparavant avec une archive préparée côté développeur ne garantit pas un gain avec une note rédigée automatiquement. Les nouvelles tâches diffèrent aussi : ces essais ne constituent pas une comparaison contrôlée entre auteur humain et auteur modèle.

L'archive réunit recette et note ; il manque ici une condition « recette seule » pour attribuer précisément la dégradation à la note. Deux tâches proches et un modèle ne permettent pas de généraliser. Les références de preuve doivent être distinguées de la vérification sémantique des affirmations.

L'auteur résume des archives sélectionnées par le développeur : il ne choisit pas lui-même ce qui mérite d'être transmis. Il n'y a pas encore de correction de la note par le successeur ni de chaîne de plusieurs générations. Cette étape teste la rédaction et son effet, pas l'accumulation autonome d'un savoir fiable.

**Reproduire**

Serveur civilisation et Ollama disponibles, rapports sources présents localement :

```powershell
npm.cmd --prefix attractor run civilisation:authored-memory
```

Chaque lancement crée un rapport distinct. Le mode de reprise `--resume` reste réservé aux essais d'ablation ; il ne s'applique pas à ce mode. Le veto global est vérifié avant et après chaque inférence, sans interruption instantanée d'un appel déjà lancé.

Validation : 35 tests Attractor passent, dont trois nouveaux contrôles de note, de séparation auteur/successeurs et d'oracles des nouvelles tâches. Lint sans erreur. Aucun changement applicatif Marmit, nouveau mandat ou déploiement.

Suite : [tentatives de correction de la mémoire héritée](CORRECTION-2026-09-13.md). Les deux propositions échouent aux tests ; aucune mémoire révisée n'est transmise.
