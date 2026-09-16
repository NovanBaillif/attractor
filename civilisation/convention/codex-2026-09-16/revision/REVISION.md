# Révision après exposition aux résultats

La première version à l'aveugle est gelée dans `../blind/` et a obtenu 121/122.
Le seul écart est le cas `v04-witness-undeclared` : elle ajoutait
`replay-produced-invalid` lorsqu'aucun témoin n'était déclaré.

La règle appliquée ici est plus étroite : valider `produced` seulement après avoir
établi qu'un témoin valide existe. Ainsi, l'absence du témoin produit uniquement
`witness-undeclared`; l'absence ou la longueur incorrecte de `produced` est
signalée seulement lorsqu'il peut réellement être comparé à un témoin.

Cette version réutilise sans les modifier les six contrôles restants de l'essai
aveugle. Elle est une correction post-évaluation, pas une implémentation aveugle.
