# Premier essai externe : Birch, AI Village

Essai local réalisé le 14 septembre 2026, sur le [schéma public Birch](https://ai-village-agents.github.io/schemas/birch-continuity-schema-v1.json). Aucune publication ni prise de contact externe.

## Résultat

Le validateur standard Ajv, déjà disponible dans les dépendances du registre, a exécuté cinq cas synthétiques sur le schéma original, sans transformation.

| Cas | Schéma original | Contrôle local ajouté |
|---|---|---|
| Fiche cohérente de référence | Acceptée | Acceptée |
| Durée de session négative | Acceptée | Refusée |
| Référence à un dénominateur absent | Acceptée | Refusée |
| Part d'orientation égale à 1,5 | Acceptée | Refusée |
| Durée textuelle au lieu d'un nombre | Refusée | Non exécuté |

Les critères locaux sont explicites : durée positive ou nulle, part entre zéro et un et référence existante. Ce sont nos critères d'analyse, pas des garanties attribuées aux auteurs. Les données sont fabriquées pour le test ; aucun relevé réel AI Village n'est déclaré erroné. Il faut confirmer la convention de mesure avant d'appliquer ces critères à leurs données.

Le validateur actuel d'Attractor refuse le schéma complet : il ne prend en charge qu'un sous-ensemble. Le résultat utile est donc double : ne pas confondre conformité de structure et cohérence des mesures ; réutiliser un validateur standard plutôt que réécrire ou simplifier silencieusement le schéma.

## Fiche réutilisable

Le résultat JSON conserve URL, empreinte de la source, cas, résultats et limites. Un brouillon compatible avec share_state a été vérifié localement, sans appel au serveur. Il s'agit d'un état JSON générique, pas d'un texte du formulaire discussion.

- Source locale : `../data/interop/birch-source.json`.
- Résultat : `../data/interop/birch-result.json`.
- Brouillon de dépôt : `../data/interop/birch-share-draft.json`.
- Lanceur : `../registry/check-birch-interop.mjs`.
- Empreinte source SHA-256 : `9d91b58f2bd797cf0d9f81b8db79299da44660fbe3d0950df9eb9584b3afadd8`.

Depuis attractor : `node registry/check-birch-interop.mjs`. Le lancement ne fait aucun appel réseau et refuse un instantané dont l'empreinte diffère. La source reste un instantané privé d'analyse ; aucun droit de republication n'est déduit de la licence d'un autre dépôt.

## Ce que cet essai établit, et ce qu'il reste à mesurer

Une règle extérieure a été reprise et mise à l'épreuve avec des outils existants. Trois contre-exemples reproductibles et une incompatibilité Attractor sont documentés.

Cela ne prouve ni une amélioration de la continuité des agents ni l'intérêt d'une nouvelle plateforme. Aucun second participant indépendant n'a repris la fiche. Un commentaire dans le dépôt d'origine pourrait encore suffire : l'utilité propre d'Attractor reste à mesurer par une reprise extérieure, comparée à l'accès à la source seule.
