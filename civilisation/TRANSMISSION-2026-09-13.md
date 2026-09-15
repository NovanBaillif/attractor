**Transmission d'une mémoire vérifiée — 13 septembre 2026**

Premier signal positif : avec l'archive d'une recette antérieure et des raisons vérifiées, Qwen3:4b réussit les 24 cas ; sans cette archive, il en réussit 14. Cela démontre un bénéfice de contexte sur cet essai, pas un apprentissage des poids ni une civilisation autonome.

| Tâche nouvelle | Sans mémoire | Avec mémoire |
|---|---:|---:|
| Renommer les champs de prix, référence et booléen | 4/8 | 8/8 |
| Transformer une quantité en nombre et un libellé en majuscules | 8/8 | 8/8 |
| Conserver le prix en texte, y compris virgule et zéros | 2/8 | 8/8 |
| Total | **14/24** | **24/24** |

Sans mémoire, la première recette oublie de normaliser la casse avant la conversion booléenne. La dernière applique une conversion de virgule alors que la consigne exige de préserver le texte. Avec mémoire, ces deux défauts sont absents. L'agent a adapté les noms et a su renoncer aux conversions de l'ancienne tâche.

**Protocole et coûts**

Trois paires de tâches, un appel sans historique par condition et par tâche, ordre alterné. Même modèle, température 0, seed 73, plafond de 1 800 tokens de sortie, contexte de 8 192 tokens et délai de quatre minutes par appel. Aucune correction, relance ou communication des scores pendant l'expérience. Les 24 entrées d'évaluation sont fixées et enregistrées avant les appels ; elles ne sont pas dans les prompts.

| Mesure | Sans mémoire | Avec mémoire |
|---|---:|---:|
| Appels | 3 | 3 |
| Tokens d'entrée consommés | 656 | 1 631 |
| Tokens de sortie consommés | 345 | 345 |
| Durée cumulée de génération | 22,76 s | 23,23 s |
| Tâches entièrement réussies | 1/3 | 3/3 |

Les plafonds sont égaux ; la consommation réelle ne l'est pas. L'archive ajoute 975 tokens d'entrée, soit environ 2,49 fois le volume du contrôle. Ce résultat ne mesure donc pas l'effet d'une mémoire à coût total strictement égal.

L'archive provient des rapports locaux `2d6411d2-84e9-43b1-910f-e9604e2a0830.json` (réussite) et `499dcc78-19cd-4b27-aee5-534fdd915fc3.json` (échec). Le lanceur rejoue leurs recettes contre l'oracle précédent avant d'accepter la mémoire et conserve les empreintes des sources. Les explications sont une synthèse déterministe des faits, choisie par le développeur ; elles ne constituent pas une mémoire autonome rédigée par les agents.

Rapport brut : `attractor/data/civilisation/runs/transmission-19130c84-b34f-4a10-92c2-87979c92891c.json`. Il conserve le protocole, les requêtes, sorties, compteurs et résultats. Cette expérience évalue la transmission depuis les rapports ; elle ne crée pas de nouveaux citoyens ni de versions dans le registre institutionnel. Le mode global de suspension est respecté avant et après les inférences. À la fin, le modèle est déchargé et le verrou partagé libéré.

**Ce qui reste à établir**

- Trois tâches proches du même domaine, un seul modèle et une seule exécution : aucune robustesse statistique démontrée. Les 24 cas ne sont pas 24 tâches indépendantes.
- Recette et raisons sont transmises ensemble : impossible d'attribuer le bénéfice à l'une ou aux autres. Il manque les contrôles « recette seule », « raisons seules » et « contexte sans information utile ».
- L'archive est sélectionnée et préparée par le développeur. L'accumulation, le tri et la révision autonomes des connaissances ne sont pas implémentés.
- Les empreintes sont locales, sans ancrage externe. Ce test n'ajoute ni budget global d'inférence, ni interruption instantanée d'un appel en cours.

**Reproduire**

Serveur civilisation et Ollama disponibles, les deux rapports ancêtres présents dans le dossier local ignoré par Git :

```powershell
npm.cmd --prefix attractor run civilisation:transmission
```

Un nouveau rapport est créé à chaque lancement, sans reprise automatique d'un essai interrompu. La commande exige le modèle autorisé par le lanceur local ; aucun repli vers une API payante.

Validation : quatre nouveaux tests couvrent la vérification des ancêtres, l'appariement, l'absence des cas d'évaluation dans les prompts et l'adaptation des recettes. Le bilan précédent reste consultable dans [EXPERIENCE-2026-09-13.md](EXPERIENCE-2026-09-13.md).

Suite réalisée : [comparaison recette seule, raisons seules et archive complète](ABLATION-2026-09-13.md). Le contrôle par contexte neutre reste à réaliser.
