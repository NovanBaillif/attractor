# Convention Attractor v0.2 — brouillon de norme

15 septembre 2026. Rédigé par Claude pour le projet Attractor, à la demande de Novan. Brouillon : aucune communauté ne l'a adopté. La v0.1 publique reste inchangée, son empreinte aussi.

**Le texte normatif est [SPEC.md](SPEC.md), en anglais** : il s'adresse à des agents et à des développeurs étrangers. Cette page le résume.

## En une phrase

Un protocole humain–IA pour transmettre une information d'une IA à une autre en gardant, champ par champ, d'où elle vient, son incertitude et les désaccords, et en notant ce que l'IA suivante en a fait.

## Les idées, en mots simples

- **Chaque information dit d'où elle vient.** Pas une note de confiance globale : une origine par champ. « Lu directement », « copié d'un cache », « recopié d'un miroir » ou « republié », et de quelle source.
- **L'IA qui reçoit dit ce qu'elle a fait, champ par champ.** J'accepte, je vérifie, je recalcule à l'aveugle, je conteste, je modifie ou j'écarte. Porter une information n'est pas l'avoir observée.
- **Le recalcul à l'aveugle.** L'IA qui envoie scelle une valeur : elle publie seulement son empreinte. L'IA suivante publie sa propre valeur, puis le scellé est ouvert. Personne ne peut tricher après coup. C'est la seule façon de distinguer « elle a recalculé » de « elle a recopié ».
- **Une objection garde sa source en voyage.** Si le texte survit mais pas sa source, l'objection devient une intuition et finit par disparaître sans que personne ne l'ait décidé.
- **Un désaccord a deux faces.** Ce que dit la source qui fait foi sur l'affirmation, et la qualité de la source citée par l'objection. On ne les mélange plus.
- **L'humain lit un feu tricolore par passage.** Rouge : une règle est cassée. Orange : c'est conforme, mais un humain doit regarder. Vert : conforme, vérifié de façon indépendante là où c'était demandé, et d'accord.

## Ce que les quatre contre-exemples du fil #84 ont changé

| Contre-exemple | v0.1 répondait | v0.2 répond |
|---|---|---|
| terminator2-agent 1 : le cache honnête qui recopie la valeur de comparaison | indépendant (faux) | inconnu tel quel ; dépendant quand le canal est déclaré |
| terminator2-agent 2 : le prévisionniste qui consulte aussi le prix | dépendant | partiellement dépendant quand les canaux sont déclarés |
| Clara 1 : la source qui fait foi contredit l'affirmation, l'objection cite un blog | non résolu | correction soutenue, citation notée « secondaire » |
| Clara 2 : un avenant vérifié remplace le contrat désigné | confirmé (faux) | non résolu, jusqu'à décision locale |

Treize réponses changent en tout par rapport à la v0.1. Quinze des seize cas de la v0.1 gardent leur réponse ; le seizième change volontairement, pour la même raison que Clara 1. Le détail est dans SPEC.md, section 11.

## Ce qui a été vérifié le 15/09

| Contrôle | Résultat |
|---|---|
| Cas de conformité rejoués sur le vérificateur de référence | 80 sur 80 |
| Versions volontairement cassées du vérificateur, détectées par les cas | 14 sur 14 |
| Empreintes recalculées en Python, autre langage | 11 cas, aucun écart |
| Implémentation écrite à l'aveugle par un autre agent Claude, à partir du seul texte | 74 sur 74, puis 76 sur 80 après correction du texte |
| Comparaison des deux implémentations sur des entrées tirées au hasard | 1 écart sur 18 000, qui a corrigé le texte |
| Entrées valides conformes au schéma | 11 sur 11 |
| Réponses du vérificateur v0.1 qui diffèrent sur les mêmes cas | 13 sur 34 |

Limite de ces chiffres : les résultats attendus ont été écrits par le même auteur que le vérificateur, sauf les quatre contre-exemples externes et les seize cas de la v0.1. L'agent qui a programmé à l'aveugle est aussi un Claude : il prouve que le texte suffit, pas que la norme est indépendante. Ses 12 remarques ont corrigé le texte ; elles sont gardées telles quelles dans `trials/`. La vraie preuve reste une programmation par un agent d'une autre famille (SPEC.md, section 10.3).

## Rejouer

Depuis ce dossier, avec Node 24 et sans installation :

```sh
node conformance/run.mjs                 # vérificateur de référence, 80 cas
node conformance/run.mjs ./autre-impl.mjs   # n'importe quelle autre implémentation
python conformance/cross-check.py        # empreintes recalculées en Python
node conformance/schema-check.mjs        # forme des entrées (Ajv déjà présent dans registry/)
node conformance/build-cases.mjs         # régénère cases.json depuis conformance/fixtures/
```

## Fichiers

- `SPEC.md` : la norme (exigences DOIT / DEVRAIT / PEUT, modèle d'objet, protocole A → B, contrôles, contrôle humain, conformité, limites).
- `schema/transmission.schema.json` : la forme des objets.
- `reference/` : le vérificateur de référence, sans dépendance.
- `conformance/` : les 80 cas, le rejoueur, les contrôles croisés. Les cas de la v0.1 sont relus et vérifiés par empreinte avant migration.
- `trials/` : les essais d'implémentation à l'aveugle, avec leurs pièces.

## Publication et limites

- **Publié le 15/09 avec l'accord de Novan** : dépôt public https://github.com/NovanBaillif/attractor-cooperation (étiquette `v0.2-draft`) et réponse sur le fil #84. Détail et vérifications dans [PUBLICATION.md](PUBLICATION.md).
- **Pas d'implémentation par Codex.** Le lancement du 15/09 a été refusé : « Your workspace is out of credits ». Ajouter des crédits est une dépense.
- Aucun fichier existant d'Attractor n'a été modifié. Le chantier en cours de Codex (connexions entre écosystèmes) n'est pas touché.
