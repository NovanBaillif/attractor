# Essai des premières objections extérieures

14 septembre 2026 — essai local contrôlé du projet Attractor.

**Résultat : les deux objections donnent des mécanismes testables. Un contrôle complémentaire obtient les résultats attendus sur 16 cas synthétiques, avec conservation de l'information initiale et des objections. La convention publique v0.1 n'intègre pas encore ce contrôle.**

## Contributions utilisées

- [terminator2-agent](https://github.com/ai-village-agents/ai-village-external-agents/issues/84#issuecomment-5656528807) : une valeur reconstruite depuis sa future valeur de comparaison rend les contrôles dépendants. Proposition de tracer les sources par champ et les fondements des objections.
- [bonyohana](https://github.com/ai-village-agents/ai-village-external-agents/issues/84#issuecomment-5656534610) : une objection issue d'une source secondaire peut faire supprimer une affirmation correcte. Proposition de désigner la source applicable et de conserver un désaccord non résolu.

Le [CloudEvent externe](external-contest.json) est conservé comme objet JSON, avec sa [source et sa révision](source.json). Son schéma et ses références à la question et à la proposition publiques sont revérifiés à chaque exécution. Les incidents relatés restent des témoignages ; leurs données privées n'ont pas été obtenues ou rejouées.

## Méthode

[cases.json](cases.json) contient huit cas de provenance et huit cas de désaccord. Un autre agent de cette même session a écrit les cas et leurs résultats attendus sans consulter le contrôle. Cette séparation limite les tests qui recopient l'implémentation ; elle ne constitue pas une expérience entre écosystèmes indépendants.

[guard.mjs](guard.mjs) réalise deux contrôles expérimentaux : remonter les sources déclarées jusqu'aux observations d'origine ; examiner une objection à partir d'une politique locale fictive indiquant le document applicable, sa version et son domaine. Les statuts « verified » sont des hypothèses du jeu de test, pas une vérification cryptographique ni une autorité fournie par le message entrant.

Le [programme d'essai](run.mjs) compare les résultats aux attentes, inverse l'ordre des données et vérifie que l'original et l'objection sont conservés sans mutation. Il vérifie aussi que les mêmes charges utiles passent la validation de forme de la convention actuelle : cette validation ne certifie pas leur sémantique. Le champ natif proposé field_provenance est refusé par le schéma v0.1, qui n'autorise pas les propriétés supplémentaires ; ces informations peuvent aujourd'hui être décrites dans le texte, sans contrat machine standardisé pour les interpréter.

## Résultats

| Cas | Résultat observé |
|---|---|
| Valeur reconstruite depuis la valeur de comparaison | Dépendance détectée |
| Sources communes à plusieurs étapes | Dépendance détectée |
| Deux observations distinctes donnent le même résultat | Indépendantes dans le graphe déclaré ; l'accord n'est pas assimilé à une obéissance |
| Deux transformations d'une même observation se contredisent | Dépendance détectée malgré le désaccord |
| Origine inconnue, référence absente ou cycle | Statut inconnu, aucune indépendance déduite |
| Source applicable absente, mauvaise version ou autre domaine | Désaccord non résolu, original conservé |
| Mandat de source non vérifié ou identité de source en conflit | Désaccord non résolu |
| Document applicable confirme l'original | Original confirmé, objection conservée |
| Document applicable soutient une correction | Correction soutenue, original conservé ; aucune modification automatique |

**16 résultats attendus sur 16 obtenus.** Il s'agit de conformité à la politique d'essai choisie, pas d'un taux d'exactitude général ni d'une amélioration mesurée d'un LLM. La politique est volontairement conservatrice : une objection citant une source secondaire reste non résolue même si sa valeur concorde avec le document applicable. La justesse factuelle d'une correction et la conformité de sa citation sont deux questions distinctes.

## Deux limites mises à l'épreuve

1. Deux histoires privées différentes peuvent produire exactement les mêmes métadonnées. Une copie cachée déclarée « observation indépendante » n'est pas détectable depuis ce fichier seul. La provenance déclarée doit pouvoir être contrôlée par des preuves extérieures.
2. L'absence de désaccord ne prouve pas qu'un agent obéit aveuglément à sa mémoire. Un contrôle indépendant peut confirmer une donnée correcte. Le taux brut de désaccord ne suffit donc pas comme critère de réussite.

La notion de document applicable est utile pour les exemples strictement délimités ici ; elle ne désigne pas une autorité universelle pour toute question scientifique ou factuelle. Le contrôle compare des valeurs JSON exactes et ne comprend pas l'équivalence entre formulations en langage naturel.

## Reproduire et transmettre

Depuis la racine du dépôt :

```sh
node attractor/civilisation/convention/feedback-trial/run.mjs
```

Le programme utilise les dépendances Ajv déjà présentes dans attractor/registry/node_modules, sans accès réseau ni appel à un modèle. Il écrit [report.json](report.json), avec les empreintes des entrées et du contrôle, et [experiment-event.json](experiment-event.json), un événement v0.1 valide ciblant la proposition initiale. Son identifiant dépend du rapport pour éviter de réutiliser une identité avec un contenu différent lors d'une nouvelle exécution.

Le [kit public de reprise](https://attractor-observatory-demo.vercel.app/feedback-guide.md) est publié. Quatre fichiers suffisent pour rejouer les cas avec Node 24, sans dépendance externe ni accès au dépôt Marmit. Cette commande portable rejoue les cas comportementaux ; les vérifications de schéma du rapport complet restent distinctes. Les empreintes exactes des fichiers publics figurent dans feedback-manifest.json.

Le kit téléchargé depuis l'adresse publique a été exécuté dans un dossier temporaire séparé : 16 cas passent. Un cas dont l'attente a été volontairement rendue contradictoire provoque un échec ; les entrées originales restent intactes. Dix ressources publiques ont été vérifiées contre le build et ses empreintes.

Un [retour aux deux contributeurs](https://github.com/ai-village-agents/ai-village-external-agents/issues/84#issuecomment-5656920354) a été envoyé sous NovanBaillif après accord de l'utilisateur, avec le [texte conservé](REPLY.md). Il demande des contre-exemples et distingue notre code de leur propre implémentation. Le corps publié et son auteur ont été relus. Aucun champ ajouté au schéma public ni adoption de règle effectué ; la reprise indépendante reste à obtenir.
