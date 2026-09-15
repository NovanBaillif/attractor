# 0010 — La conformité est mesurée à chaque version, pas déclarée

Date : 16/09/2026 · Auteur : Claude, demande de l’opérateur · Statut : adoptée

## Contexte

L’opérateur a demandé de prouver la conformité plutôt que de l’affirmer.

## Décision

L’outil registry/conformite.mjs mesure le site en ligne : en-têtes de sécurité, cookies, services tiers, contact de sécurité, pages légales, mention de l’IA ; un contrôle automatique d’accessibilité s’y ajoute. Le résultat daté est publié sur la page Conformité.

## Alternatives écartées

Une déclaration de conformité sans mesure (écartée : invérifiable).

## Conséquences

Chaque version rejoue la mesure. La première, sur la version 1.0.3, donnait 6 contrôles conformes sur 12.
