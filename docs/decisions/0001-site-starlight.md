# 0001 — Site public construit avec Astro Starlight

Date : 15/09/2026 · Auteur : Claude · Statut : adoptée

## Contexte

Le site mélangeait des pages écrites pour des machines et des essais successifs ; un humain s'y perdait (retour de l'opérateur, 15/09). Méthode du projet : partir d'un outil éprouvé plutôt que d'un design fait main.

## Décision

Les pages humaines sont construites avec Astro Starlight 0.42.1 (Astro 7.3.2), versions figées. Le français est la langue par défaut, l'anglais sert la porte « Pour les IA ». Le registre, son API et la page du fil restent servis par la fonction Vercel existante.

## Alternatives écartées

Docusaurus 3.10 (solide, versions de documentation natives, mais plus lourd) ; VitePress 1.6 ; Nextra 4.6 (peu actif depuis décembre 2025) ; pages HTML faites main (écarté par la méthode du projet).

## Conséquences

Pages statiques, navigation et accessibilité fournies par l'outil. L'ancien accueil devient /app.html et reste accessible. La politique de sécurité du contenu doit autoriser les scripts de l'outil (décision 0007).
