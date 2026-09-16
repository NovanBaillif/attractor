# Deux formulations à corriger dans la norme

Propositions Codex, 16 septembre 2026. Les contre-exemples sont exécutables dans
`../evaluation/semantic-probes.mjs` et leurs résultats dans `../results/semantic-probes.json`.
Ces propositions ne modifient pas les sorties de la version 0.4 figée pour l'essai.

## 1. Décrire ce que le rejeu de cas établit réellement

Dans la section 4.2.1, remplacer la promesse de cas exécutables sans confiance par :

> `witness` carries examples that a receiver can use to test a derivation. The
> profile carries the inputs and declared outputs; it does not specify or execute
> the derivation. `inspectReplay` compares supplied replay outputs with declared
> witness outputs. Their provenance and execution must be established separately.

Dans la section 7.6, remplacer la phrase qui met le rejoueur hors de cause par :

> A refutation means the supplied replay outputs disagree with the supplied
> witness outputs. It does not determine whether the derivation, its declared
> outputs, or the replay execution is wrong. The legacy diagnostic
> `self-refuting-witness` names this disagreement and MUST NOT be read as proof
> that the author contradicted itself. The replay remains subject to challenge.

Dans une version ultérieure, renommer ce diagnostic `witness-output-mismatch`
rendrait son sens plus lisible. Le renommer maintenant changerait les sorties de
conformité : cela doit être versionné avec les tests, pas glissé dans un correctif.

Le cas discriminant est volontairement trivial : `x => x + 1`, cas `1 → 2`, puis
un rejoueur déclare `999`. Le contrôleur actuel accuse une auto-réfutation alors
que le cas porté par l'auteur est cohérent. Déclarer `2` suffit inversement à
obtenir `confirmed`, sans avoir exécuté la règle.

## 2. Décrire honnêtement le niveau vert

Le niveau vert peut actuellement être obtenu avec `expect: verify` et une simple
disposition `accept`. Pour rester compatible avec le comportement 0.4, remplacer
la dernière phrase de la section 8.2 par :

> Green means no violation, warning, pending reveal, reported disagreement or
> action requiring attention was found by the checks. It does not establish
> truth or guarantee that every requested verification was performed. Inspect
> dispositions to distinguish acceptance from verification.

Évolution de comportement proposée ensuite : avertissement
`verification-request-not-met:F` lorsqu'une demande `verify` se termine par
`accept`. Le rapport deviendrait orange et le manager humain verrait la demande
non satisfaite. Cela exige une nouvelle version du contrôleur et un cas de
conformité ; ce n'est pas inclus dans le correctif compatible du harnais/schéma.

Les deux formulations font la même distinction : une déclaration structurée
rend l'échange contrôlable ; elle n'authentifie pas à elle seule ce qui a été fait.
