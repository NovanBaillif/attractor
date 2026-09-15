**Correction ciblée ou réécriture complète — 13 septembre 2026**

Avec Qwen3:4b, la correction limitée à un champ répare les majuscules, tandis que la réécriture complète ne répare aucun défaut. La conversion du booléen reste incorrecte dans les deux conditions. Aucun gain sur le nombre de recettes entièrement correctes : 0/8 dans les deux cas.

La comparaison prévue avec un second modèle n'a pas pu être exécutée. Le téléchargement explicite de Llama 3.2 3B a échoué sur la résolution DNS du serveur de stockage. On ne peut donc pas conclure que le blocage vient spécifiquement de Qwen plutôt que des consignes, de son mode de génération ou du DSL.

| Mesure | Recette entière | Champ ciblé et autres champs verrouillés |
|---|---:|---:|
| Appels Qwen | 2 | 2 |
| Cas du code produit réussis après son appel ciblé | 0/8 | 8/8 |
| Cas du booléen réussis après son appel ciblé | 0/8 | 0/8 |
| Cas complets réussis à la fin | 0/8 | 0/8 |
| Tokens d'entrée | 672 | 700 |
| Tokens de sortie | 228 | 36 |
| Durée cumulée de génération | 9,70 s | 7,55 s |

Le mode champ renvoie `trim, uppercase` pour le code produit : le défaut initial est corrigé. Sur le booléen, les deux méthodes renvoient `trim, boolean` et omettent `lowercase`. Les valeurs ` TRUE ` et `False` sont donc rejetées par la conversion stricte du DSL.

**Ce qui est comparé**

La même recette défaillante du rapport `memory-repair-6631bb9e-cf6f-4d9e-b7bc-9092053a1d17.json` est fournie aux deux conditions. Chacune dispose de deux appels, dans l'ordre code produit puis booléen. Les contre-exemples sont recalculés champ par champ pour éviter qu'une exception sur le booléen masque l'erreur du code produit.

Chaque appel reçoit le même contrat, la recette courante, la désignation d'un seul champ à corriger et son résultat attendu/obtenu. La différence porte sur la réponse autorisée : recette complète ou uniquement la liste d'opérations du champ. Dans ce dernier cas, l'exécuteur conserve tous les autres champs sans modification. Il ne fournit pas la bonne séquence d'opérations au modèle.

Même température 0, seed 73, plafond de contexte de 8 192 tokens, plafond de sortie de 1 800 tokens et délai maximal de quatre minutes. Qwen est utilisé avec `think: false`, comme dans les essais précédents. Aucune rédaction de note n'est demandée ici : le diagnostic porte sur la correction de recette. Chaque appel est sans historique, mais reçoit la recette issue de l'étape précédente dans sa condition.

Les huit cas complets sont ceux de l'expérience antérieure, inchangés et enregistrés avant la génération. Il s'agit d'une analyse sur une tâche déjà connue, pas d'un nouveau test de généralisation. Les deux méthodes ont le même plafond d'appels ; leurs prompts, schémas et consommations réelles diffèrent.

**Second modèle : partie non réalisée**

[Llama 3.2 3B dans le registre Ollama](https://ollama.com/library/llama3.2:3b) a été choisi comme second modèle local, d'environ 2 Go. La requête de téléchargement a échoué après les tentatives internes d'Ollama : le domaine de stockage n'a pas pu être résolu. Llama n'apparaît pas dans les modèles installés. Des fichiers partiels restent dans le cache Ollama ; ils ne constituent pas une installation utilisable.

`diagnostic-models.json` épingle donc uniquement l'empreinte du Qwen déjà installé. Le rapport indique explicitement Llama comme indisponible. Le diagnostic est prêt pour une seconde entrée Llama avec son empreinte complète vérifiée après installation. Aucun téléchargement automatique n'est effectué par le lanceur de diagnostic. La politique du CLI documentaire dans `tools/local-agents` reste inchangée.

**Interprétation**

Une interface qui restreint les modifications réduit mécaniquement la possibilité de casser les autres champs et produit ici une correction partielle, avec moins de texte généré. Cela ne garantit pas que l'agent trouve la bonne correction sur le champ sélectionné.

Les résultats ne suffisent pas à attribuer l'échec au modèle : il manque le second modèle et un test distinct du mode de raisonnement. Une seule séquence par méthode, ordre non inversé pour Qwen, tâche déjà examinée : aucune robustesse statistique démontrée. Le verrouillage des champs est une aide déterministe du programme, pas une capacité d'autocontrôle acquise par le modèle.

**Traces et exécution**

Rapport : `attractor/data/civilisation/runs/diagnostic-6efd1480-09ed-4bbb-89e6-18c58203c10b.json`. Il conserve les versions avant/après, sorties brutes, tests par champ, tests complets, empreintes et compteurs. Quatre générations exécutées, aucun appel Llama. Modèle déchargé et verrou partagé libéré à la fin.

```powershell
npm.cmd --prefix attractor run civilisation:diagnostic
```

Prérequis : serveur civilisation, Ollama, modèles correspondant aux empreintes de `diagnostic-models.json`, rapport source local. Un seul modèle épinglé produit le diagnostic de ses deux interfaces ; deux modèles produisent les quatre combinaisons. Plafond de huit appels, sans relance automatique après échec.

Validation : 44 tests Attractor passent, dont cinq nouveaux contrôles d'isolation des erreurs, de verrouillage, de validation des modifications, de régression et d'équivalence des informations fournies. Lint sans erreur. Aucun changement applicatif Marmit ni déploiement. La comparaison entre modèles reste bloquée par l'installation de Llama.

Suite : [comparaison avec/sans raisonnement](RAISONNEMENT-2026-09-13.md). Les obstacles de format et de budget empêchent encore une conclusion sur la capacité de correction complète.
