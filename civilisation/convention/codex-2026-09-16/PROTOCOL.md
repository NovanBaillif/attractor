# Contribution Codex — réimplémentation du profil 0.4

Protocole local écrit le 16 septembre 2026 avant l'implémentation et ses essais.

Question : un agent Codex de lignée OpenAI peut-il implémenter les sept contrôles
du profil 0.4 à partir de sa spécification, sans consulter le contrôleur de Claude ?

Source : dépôt local `attractor-cooperation`, commit `de29041` (v0.4-draft).
Les fichiers SPEC.md et schema/transmission.schema.json sont copiés sans
modification dans `input/`. Leurs empreintes sont enregistrées dans `input-manifest.json`.

## Déroulement fixé avant l'essai

1. Un sous-agent Codex reçoit un contexte neuf : `PROMPT.txt` et les deux fichiers
   d'entrée uniquement. Il écrit les sept contrôles et ses ambiguïtés dans `blind/`.
2. Il ne consulte ni le contrôleur de référence, ni les tests, ni les résultats
   précédents. L'agent coordinateur peut préparer l'évaluation séparément ; il ne
   communique aucune attente issue des tests à l'implémenteur.
3. L'implémentation est figée par empreinte avant son premier passage des tests.
   Les fichiers de cette première version sont conservés même en cas d'échec.
4. Le harnais existant est exécuté sur la référence puis sur la contribution.
   Les sorties, codes de retour, versions et empreintes sont conservés.
5. Tout correctif après exposition aux résultats ira dans un dossier distinct,
   avec son motif. Il ne sera pas présenté comme un résultat à l'aveugle.
6. Une objection éventuelle à la norme doit porter un cas exécutable et distinguer
   défaut d'implémentation, ambiguïté du texte et limite de la preuve.

## Attribution et limites

Auteur du profil et de la référence : Claude, lignée Anthropic.
Auteur de cette contribution : Codex, lignée OpenAI. Opérateur humain commun :
NovanBaillif. La tâche est réalisée avec les outils déjà disponibles dans Codex.

Le coordinateur a lu l'état du projet et les conclusions des expériences de
Claude. L'implémenteur reçoit un contexte neuf ; ses restrictions de lecture sont
des consignes, pas une isolation du système de fichiers ni une attestation tierce.
Le journal des appels de cette session est la trace de coordination disponible.

Cet essai apporte une autre lignée de modèle, **pas un autre opérateur**. Il ne
suffit donc pas au critère 10.3 de sortie du brouillon. Il n'est pas non plus un
rejeu de l'expérience E12, E14 ou E15, ni une transmission entre deux opérateurs.

Les résultats seront déposés localement pour relecture. Le protocole n'a pas été
publié ni horodaté par un tiers avant l'essai. Aucun succès n'est présupposé.

## Résultat

L'implémentation aveugle a été figée le 16 septembre 2026 à 09:25 UTC, après ses
16 tests propres : 121/122 au harnais du commit épinglé, et 120/122 en comparaison
des résultats complets hors texte libre. L'écart porte seulement sur une
accumulation de diagnostics lorsqu'un témoin est absent. Une révision créée après
exposition à ce résultat obtient 122/122 et la comparaison complète identique à
la référence ; elle est conservée dans `revision/` et n'est pas un résultat
aveugle. Les sorties, empreintes et conditions sont dans `results/`.
