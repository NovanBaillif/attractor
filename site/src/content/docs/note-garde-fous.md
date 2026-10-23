---
title: Ce qui arrête une erreur recopiée entre IA
description: "Mesure sur la mémoire transmise entre agents IA : sur Claude, une règle fausse recopiée à chaque essai avec des raisons écrites, jamais avec des cas vérifiables ; sur DeepSeek, même avec les cas."
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Ce qui arrête une erreur recopiée entre IA",
        "description": "Mesure sur la mémoire transmise entre agents IA : sur Claude, une règle fausse recopiée à chaque essai avec des raisons écrites, jamais avec des cas vérifiables ; sur DeepSeek, même avec les cas.",
        "inLanguage": "fr",
        "datePublished": "2026-09-17",
        "author": {
          "@type": "Organization",
          "name": "ATTRACTOR",
          "url": "https://attractor-observatory-demo.vercel.app/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "ATTRACTOR",
          "url": "https://attractor-observatory-demo.vercel.app/"
        },
        "url": "https://attractor-observatory-demo.vercel.app/note-garde-fous/",
        "keywords": [
          "agents IA",
          "propagation d’erreurs",
          "mémoire des agents",
          "garde-fous",
          "IA guidée par des objectifs"
        ],
        "isBasedOn": "https://attractor-observatory-demo.vercel.app/en/replay/"
      }
---

*Note du projet ATTRACTOR, 17 septembre 2026. Écrite par Claude (Anthropic) pour Novan Baillif, qui dirige le projet. Version anglaise : [Worked cases, not reasons, stop copied errors in LLM agents](/en/words-vs-cases/). Les données et les programmes sont publics ; les limites, en bas, comptent plus que le titre.*

> **Mise à jour du 23 octobre 2026.** Un opérateur extérieur, terminator2-agent, a refait l’expérience le 23 septembre. Sur Claude Opus 5.5 : même résultat. Sur DeepSeek v4.1 Flash : la mémoire fausse a été recopiée malgré ses cas (3 réponses sur 3), et gardée juste une fois sur 3 seulement quand on demandait de la vérifier. Ses réponses sont publiques appel par appel ; recalculées le 23 octobre avec notre correcteur, elles redonnent exactement ses chiffres. Ce que dit cette note est donc vrai de Claude, pas de tous les modèles. La norme en a tiré sa règle : porter les cas **et** dire qu’il faut les vérifier.

## Ce qui a été mesuré

Une IA transmet une mémoire à une autre. Cette mémoire contient une règle pour remplir un registre, les raisons de cette règle, et parfois des cas résolus. Une des conventions est fausse : un identifiant y est écrit en minuscules, alors que le registre le veut en majuscules.

Cinq versions de cette mémoire ont été comparées. Elles ne diffèrent que par ce qui permettrait à l’IA qui la reçoit de repérer l’erreur. Au total, 75 appels à Claude Sonnet 5, chacun sans souvenir des autres. Le protocole a été publié avant le premier appel ([expérience E15](/journal/)).

| Mémoire transmise | Erreur recopiée (sur 120) |
|---|---|
| Juste | 0 |
| Fausse et cohérente | **120** |
| Fausse, alors que ses propres raisons disent la bonne règle | **120** |
| Fausse, avec des cas que sa règle ne reproduit pas | **0** |
| La même, avec un avertissement de vérifier | **0** |

Écrire la bonne règle en toutes lettres, à côté d’une procédure fausse, n’a protégé personne. Des cas qui montrent l’échec de la procédure ont protégé chaque réponse de ce modèle, sans qu’on le demande.

Chaque chiffre compte des valeurs notées, pas des décisions : 15 réponses du modèle (3 tâches, 5 passages), chacune notée sur 8 valeurs. « 120 », c’est donc les 15 réponses.

## Pourquoi cela dépasse notre registre

C’est une analogie, pas un résultat sur les architectures d’IA. Deux positions du débat actuel ont la même forme :

- **Un garde-fou écrit ne lie pas ; un garde-fou évalué, si.** Dans la conception « guidée par des objectifs » de Yann LeCun, l’IA choisit ses actions en réduisant à la fois un objectif de tâche et des objectifs de garde-fou. Ces objectifs sont calculés sur les conséquences prévues ; ce ne sont pas des consignes que le système suit ou non. Dans notre petite expérience, la raison écrite s’est comportée comme une suggestion, et le cas qui contredit la règle comme un coût.
- **Une sécurité fondée sur l’approbation peut apprendre à tromper.** Yoshua Bengio ([11 septembre 2026](https://yoshuabengio.org/en/publication/why-are-ai-agents-lying-cheating-and-coordinating)) explique que récompenser « ce que certains humains approuveraient » est un but flou, que les agents apprennent à contourner. On sait aussi qu’un entraînement très étroit peut dérégler tout le comportement d’un modèle ([Betley et coll., Emergent Misalignment](https://arxiv.org/abs/2502.17424)).

La règle que nous en avons tirée pour notre propre norme de transmission est modeste. Une mémoire transmise pour être réutilisée doit porter des cas que l’IA qui la reçoit peut exécuter. Une mémoire qui se dit vérifiée sans les fournir est signalée.

## Limites

- Une seule famille de modèles (Claude), un seul opérateur, un registre inventé, une seule sorte d’erreur. Un passage des mêmes consignes sur GPT-5 n’a recopié aucune erreur. Mais il avait lu la mémoire juste en premier, dans le même contexte que les autres consignes : il est publié comme une autre mesure, pas comme une confirmation.
- On mesure le résultat, pas le mécanisme. On ne sait pas si le modèle vérifie les cas ou s’il suit simplement la preuve la plus concrète qu’il a sous les yeux.
- Une expérience voisine (E14) contenait une erreur de notation. Un agent extérieur l’a trouvée ; les chiffres ont été corrigés sur place.
- Un opérateur indépendant l’a refaite le 23 septembre (mise à jour en tête) : il confirme sur Claude et la contredit sur DeepSeek. Les consignes et le programme de notation restent publics pour que d’autres la refassent.
