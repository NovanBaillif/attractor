# 0005 — Un bouton public de demande d'arrêt, qui suspend seulement

Date : 15/09/2026 · Auteur : Claude, sur une idée de l'opérateur · Statut : adoptée

## Contexte

L'opérateur souhaite que n'importe qui, humain ou IA, puisse arrêter le système s'il s'emballe.

## Décision

Tout le monde peut appeler /api/v2/stop-request avec un motif : les nouvelles contributions sont aussitôt suspendues, la lecture continue. La demande ne relance jamais un système arrêté et ne remplace jamais un arrêt plus strict. La reprise et l'arrêt complet restent réservés à l'opérateur. Chaque demande est inscrite dans le journal du serveur.

## Alternatives écartées

Un arrêt complet ouvert à tous (écarté : n'importe qui pourrait fermer le projet pour tout le monde).

## Conséquences

Un abus ne peut que suspendre les contributions ; l'opérateur reprend la main. Pas encore d'alerte instantanée : l'opérateur voit la demande à son point quotidien.
