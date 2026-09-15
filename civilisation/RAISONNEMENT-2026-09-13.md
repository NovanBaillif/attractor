**Qwen avec et sans raisonnement — 13 septembre 2026**

Le mode raisonnement n'a pas encore livré une recette complète dans le budget fixé. Les essais révèlent des obstacles de format et de longueur : ils ne permettent pas de conclure que le raisonnement n'aide pas, ni que le modèle est incapable de corriger le booléen.

**Premier essai : format JSON imposé par Ollama**

Même modèle épinglé Qwen3:4b, correction par champ, deux appels par condition, `think: false` puis `think: true`. La recette initiale, les champs ciblés et les huit cas sont inchangés.

| Condition | Observation | Tokens générés rapportés | Durée |
|---|---|---:|---:|
| Sans raisonnement demandé | Majuscules corrigées, booléen encore incorrect | 36 | 7,37 s |
| Avec raisonnement demandé | Deux réponses finales vides ; contenu dans `thinking` | 36 | 5,96 s |

Dans la seconde condition, le serveur termine avec `done_reason: stop`, mais `response` est vide. Le contenu de `thinking` n'est jamais utilisé comme réponse finale de secours. La validation JSON refuse donc ces sorties. Ce résultat porte sur le comportement de l'interface utilisée, pas sur la justesse d'une solution complète.

La [documentation Ollama sur le raisonnement](https://docs.ollama.com/capabilities/thinking) distingue `thinking` de la réponse finale `response` pour l'API generate. La [documentation des sorties structurées](https://docs.ollama.com/capabilities/structured-outputs) décrit le schéma fourni dans `format`. L'interaction observée localement ne prouve pas que ces deux capacités seraient incompatibles dans toutes les configurations.

**Second essai : schéma dans la consigne, validation après génération**

Après le premier constat, le schéma a été retiré du paramètre `format` et ajouté explicitement à la consigne pour les deux conditions. Les réponses finales restent soumises à une lecture JSON stricte puis à la validation du DSL. Aucun extrait n'est récupéré depuis le raisonnement ou un long texte pour fabriquer une réponse acceptable.

| Condition et champ | Résultat observé | Tokens générés |
|---|---|---:|
| `think: false`, majuscules | Réponse finale non JSON, refusée | 1 768 |
| `think: false`, booléen | Limite de génération atteinte, sortie refusée | 1 800 |
| `think: true`, majuscules | Réponse finale JSON valide ; 8/8 cas du champ réussis | 1 768 |
| `think: true`, booléen | Limite atteinte, réponse finale vide, refusée | 1 800 |

Le raisonnement a donc été suivi d'une correction valide pour les majuscules. Sur le booléen, le serveur termine avec `done_reason: length`, après 1 800 tokens générés et sans réponse finale. C'est une sortie incomplète, pas une correction complète démontrée fausse. Aucune des deux conditions ne fournit une recette finale validée dans cet essai.

| Coût du second essai | Sans raisonnement demandé | Avec raisonnement demandé |
|---|---:|---:|
| Appels | 2 | 2 |
| Tokens d'entrée | 830 | 832 |
| Tokens générés, compteur Ollama | 3 568 | 3 568 |
| Durée cumulée de génération | 44,98 s | 43,99 s |

Les compteurs proviennent du serveur. Ils ne sont pas une mesure séparée du coût des pensées et de celui de la réponse finale. L'égalité des volumes ici ne constitue pas une preuve d'égalité des processus internes. La différence de longueur des prompts du second appel reflète aussi le fait que seule une condition a réussi la première correction.

**Protocole et limites**

Plafond inchangé de 1 800 tokens générés par appel, contexte de 8 192 tokens, température 0, seed 73 et délai maximal de quatre minutes. Les autres champs sont verrouillés par l'exécuteur. Un résultat incomplet ou invalide n'est pas appliqué. Le champ `thinking` n'est conservé que sous forme de longueur et d'empreinte ; seules les réponses finales retournées dans `response` sont archivées comme texte brut.

Deux essais successifs avec modification explicite du mode de sortie après le premier échec : ce ne sont pas des répétitions indépendantes d'un protocole inchangé. Un modèle, une tâche déjà connue et un ordre fixe sans/suivi de avec raisonnement. Le test ne sépare pas encore les effets du format, de l'interface, du budget et du raisonnement. Aucun relèvement du budget ni modification du serveur n'a été effectué.

Version Ollama observée : `0.34.0`. Les difficultés de format imposent de nuancer les anciennes conclusions de capacité : des résultats non exploitables par le lanceur ne prouvent pas à eux seuls une incapacité cognitive.

**Rapports et reproduction**

Dans `attractor/data/civilisation/runs/` :

- `thinking-595fcf23-0065-46f4-b625-b5820a762e88.json` : format imposé, quatre appels.
- `thinking-4443a8e5-3d00-4434-8cfe-b60c14294f23.json` : format libre puis validation stricte, quatre appels.

```powershell
npm.cmd --prefix attractor run civilisation:thinking
node attractor/civilisation/diagnostic-runner.mjs --compare-thinking --unconstrained
```

Serveur civilisation et Ollama requis ; utilisation du seul Qwen épinglé. Aucun téléchargement ni appel Llama. À la fin, aucun modèle chargé et verrou partagé libéré. Aucun changement Marmit ni déploiement.

Validation : 46 tests Attractor passent, dont deux nouveaux sur les conditions identiques hors mode et la séparation des compteurs. Lint sans erreur. Le diagnostic reste non concluant sur une correction complète avec raisonnement dans le budget actuel.
