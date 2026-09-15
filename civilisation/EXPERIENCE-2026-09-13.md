**Premier essai réel — Qwen3 local, 13 septembre 2026**

La boucle est branchée au noyau : propositions réelles du modèle, revue déterministe, contre-exemple proposé par un autre contexte, correction éventuelle et tentative de réutilisation. Le test ne montre aucun avantage de qualité du collectif. Le dernier essai refuse la réutilisation parce que le passeur recopie un exemple existant.

Les quatre exécutions sont des essais de développement successifs, avec ajustements du lanceur et du prompt. Ce ne sont pas quatre répétitions indépendantes d'un protocole inchangé. Aucune correction humaine n'a été injectée pendant un appel ; les modifications entre exécutions sont décrites ci-dessous.

| Rapport dans `../data/civilisation/runs/` | Observation |
|---|---|
| `495a9b25-e553-448d-b0b1-ab22ef3235eb.json` | Deux recettes incorrectes ; arrêt au contrôle GPU. Ajout ensuite d'une attente bornée pour laisser retomber l'utilisation après déchargement. |
| `499dcc78-19cd-4b27-aee5-534fdd915fc3.json` | 0/16 pour les deux approches. Le contradicteur fournit un cas valide en échec ; le bâtisseur recopie encore les noms génériques malgré la demande de correction. |
| `5132c679-66e1-42de-bb67-cd9f03e19ef9.json` | Après retrait des noms génériques du contrat : 16/16 pour les deux approches. Réutilisation enregistrée, mais sur un exemple déjà connu : elle ne démontre pas un nouveau contexte. |
| `2d6411d2-84e9-43b1-910f-e9604e2a0830.json` | Contrôle de nouveauté ajouté : 16/16 pour les deux approches ; le passeur répète l'exemple, y compris après une relance. Aucune nouvelle réutilisation enregistrée. |

**Dernier essai, comparaison mesurée**

| Mesure | Agent seul | Boucle collective |
|---|---:|---:|
| Appels au modèle | 1 | 4 |
| Tokens d'entrée | 325 | 1 387 |
| Tokens de sortie | 80 | 186 |
| Durée cumulée des requêtes de génération | 6,29 s | 26,44 s |
| Cas de contrôle réussis | 16/16 | 16/16 |
| Défaut découvert par le contradicteur | Sans objet | 0 |
| Nouvelle réutilisation enregistrée | Sans objet | 0 |

La boucle inclut un bâtisseur, un contradicteur, un passeur et sa relance. Aucune réparation n'a été nécessaire dans cet essai. Le contradicteur a proposé une entrée valide mais réussie : elle n'est pas comptée comme découverte. L'agent seul et le bâtisseur ont produit la même recette. Le passeur a proposé deux fois le premier exemple public. Le contrôle compare les valeurs normalisées : changer seulement espaces ou casse ne suffit pas à revendiquer de la nouveauté.

Coût total des quatre essais : 15 appels, 5 026 tokens d'entrée et 719 de sortie, environ 100,68 secondes cumulées de requêtes de génération. Exécution sur le GPU local, sans API payante ; énergie et coût matériel non mesurés. Les durées excluent les vérifications, attentes et écritures entre appels. À la fin, Ollama ne garde aucun modèle chargé et le verrou est libéré.

**Faiblesses révélées**

- Le modèle copie facilement un exemple de format ou une donnée déjà fournie. Même une critique explicite n'a pas toujours provoqué de correction.
- Le collectif ajoute ici du calcul et des traces, sans améliorer le résultat. Les budgets étant différents et la tâche unique, ce n'est pas un comparatif scientifique d'architectures.
- Les rôles utilisent les mêmes poids sous le même opérateur. Leur séparation est une séparation de permissions et de contextes, pas une diversité cognitive démontrée.
- Les 16 cas cachés restent ceux d'un petit problème de normalisation. Ils ne démontrent ni généralisation large, ni culture autonome, ni évolution des normes.
- Les budgets d'inférence sont locaux à chaque lancement. Les crédits du noyau ne mesurent toujours pas le calcul. Le veto est contrôlé avant et après l'appel, sans interruption immédiate de l'inférence en cours.
- Les rapports locaux gardent les contre-exemples détaillés ; ils ne bénéficient pas d'un ancrage externe. La reprise après crash et la sélection autonome de projets restent absentes.

Vérification du code : 25 tests Attractor passent, dont cinq sur l'oracle, les contre-exemples et la nouveauté ; lint du module sans erreur. Aucun changement applicatif Marmit, aucune publication distante.

La prochaine expérience utile serait un lot de tâches inédites avec budgets égaux et plusieurs modèles, avant d'augmenter l'autonomie. Cela reste à réaliser.

Suite réalisée : [transmission d'une mémoire vérifiée](TRANSMISSION-2026-09-13.md), trois tâches et plafonds égaux avec le même modèle. La comparaison entre plusieurs modèles reste à réaliser.
