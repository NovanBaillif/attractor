**Corriger une mémoire héritée — 13 septembre 2026**

Deux propositions de correction ont été produites par Qwen3:4b. Aucune ne passe les huit cas de régression. La deuxième corrige l'erreur initiale de majuscules, mais conserve une autre erreur introduite par la première. La transmission au troisième agent est bloquée ; aucun résultat de transfert d'une mémoire corrigée n'est disponible.

**Résultats observés**

| Version | Code produit en majuscules | Booléen avec casse variable | Cas réussis |
|---|---|---|---:|
| Recette héritée défaillante | Étape absente | Correct | 0/8 |
| Première correction | Toujours absente | Normalisation supprimée | 0/8 |
| Seconde correction | Corrigé | Normalisation toujours absente | 0/8 |

Le problème attendu était concret : `00ab-7` doit devenir `00AB-7`. La seconde correction ajoute bien `uppercase` pour ce champ. Mais les entrées ` TRUE ` et `False` nécessitent aussi une mise en minuscules avant la conversion booléenne du DSL. Les deux propositions de correction ne font que `trim` puis `boolean`, ce qui échoue.

La note de la seconde proposition affirme que `trim` puis `boolean` suffit et déclare ne pas voir d'incertitude supplémentaire. Le validateur de texte n'en certifie pas le sens ; les tests exécutables contredisent cette méthode sur les entrées fournies. Le système conserve la note comme proposition refusée, sans la transformer en mémoire validée.

**Ce qui a été implémenté et exécuté**

Le lanceur recharge l'archive et la recette défaillante depuis `authored-memory-2e90c8d8-3f75-4efd-b612-de035294a0cb.json`. Il reproduit l'échec avec l'oracle, sans se fier au verdict du rapport, puis fournit au modèle le contrat, la recette, l'ancienne note et un contre-exemple calculé.

Le modèle doit produire simultanément une recette et une note révisées. La recette est évaluée sur huit cas ; la note est contrôlée pour sa structure et ses identifiants de preuves seulement. Une proposition qui échoue n'est pas transmise, même si le texte annonce une correction.

Après le premier refus, une seconde tentative a été ajoutée avec un prompt centré sur le brouillon rejeté et ses erreurs recalculées. Elle reçoit aussi le contre-exemple initial. Cette adaptation du protocole a été décidée côté développeur après lecture du résultat ; ce ne sont pas deux répétitions d'un protocole inchangé. Aucune recette ni note n'a été corrigée manuellement.

Le test prévu pour un troisième contexte du modèle est prêt : même nouvelle tâche sous ancienne archive puis archive révisée, avec plafonds identiques. Son contrat et ses cas sont fixés avant l'appel de correction et absents de son prompt. Les deux essais se sont arrêtés à la vérification de correction ; ces appels de transfert n'ont donc pas été lancés.

**Coûts et traces**

| Tentative | Tokens d'entrée | Tokens de sortie | Durée de génération |
|---|---:|---:|---:|
| Première | 651 | 437 | 12,99 s |
| Seconde, avec retour du refus | 578 | 391 | 12,06 s |
| Total | 1 229 | 828 | 25,05 s |

Rapports conservés dans `attractor/data/civilisation/runs/` :

- `memory-repair-6631bb9e-cf6f-4d9e-b7bc-9092053a1d17.json` : première proposition rejetée.
- `memory-repair-646ebe59-5348-4e6a-9727-3c641bc15ec9.json` : seconde proposition rejetée, avec empreinte du rapport précédent.

L'archive initiale est conservée intacte. Les deux rapports portent `outcome: repair_failed_no_transfer` ; `status: completed` signifie que l'expérience est terminée, pas que la réparation a réussi. Modèle déchargé et verrou libéré en fin d'exécution, aucun fournisseur payant.

**Conclusion limitée à cet essai**

Le modèle peut corriger un défaut tout en laissant une régression dans sa solution, puis décrire cette solution avec trop d'assurance. Les tests empêchent ici une transmission incorrecte ; ils ne rendent pas automatiquement l'agent capable de se corriger. Le savoir collectif qui se corrige entre générations n'est pas démontré.

Un modèle, une tâche de réparation et deux tentatives ne permettent pas de généraliser à toutes les IA. Le dispositif ne certifie pas le sens des notes et n'ajoute pas de version au registre institutionnel. Le stockage des propositions et de leur filiation est local dans les rapports.

**Reproduire**

Serveur civilisation et Ollama actifs, rapports sources présents localement :

```powershell
npm.cmd --prefix attractor run civilisation:memory-repair
node attractor/civilisation/transmission.mjs --memory-repair --repair-feedback=6631bb9e-cf6f-4d9e-b7bc-9092053a1d17
```

Chaque exécution est plafonnée à trois appels : une correction puis, uniquement si elle réussit, deux comparaisons de transfert. La seconde commande crée une nouvelle tentative reliée au refus ; elle ne réécrit pas celui-ci. La filiation est contrôlée et l'échec recalculé avant de l'utiliser.

Validation : 39 tests Attractor passent, dont quatre nouveaux couvrant la reproduction des refus, la conservation de l'ancêtre, la détection des régressions et la séparation du futur test. Lint sans erreur. Aucun changement Marmit ni déploiement.

Suite : [diagnostic champ ciblé / recette entière](DIAGNOSTIC-CORRECTION-2026-09-13.md), exécuté avec Qwen. Le second modèle n'a pas pu être installé, faute de résolution DNS du serveur de téléchargement.
