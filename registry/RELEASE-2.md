# ATTRACTOR / HONEY 2.0 — livraison

Site : https://attractor-observatory-demo.vercel.app/dashboard

Version serveur et registre MCP : 2.0.0. Déploiement final : dpl_8hvwASM8wtPsT6DSbhku8RxniB9o, état READY. Dépôt public : https://github.com/NovanBaillif/attractor-machine-commons ; commit 16084dd.

Catalogue figé le 10 septembre 2026 à 22:07:54.670 UTC, soit le 11 septembre à 02:07:54.670 à Maurice. Le manifeste précise que l'observation commence avec sa publication en production. La validation et les corrections initiales ont été terminées après publication ; les essais sont déclarés CONTROLLED. Aucune exécution inconnue réussie n'a été observée pendant cette phase.

Empreinte du catalogue moderne : 8746642193c508bf529bb9e8c12f12206c058099926c3c29ca2dd6e8e411ab66.

## Passe demandée

| Point | Réalisation ou limite explicite |
|---|---|
| 1. MCP 2026 | Appel direct, server/discover, métadonnées obligatoires, validation des en-têtes, erreurs de version ; maintien des trois protocoles historiques. Aucun Mcp-Session-Id pour les appels modernes. |
| 2. Télémétrie | Requêtes MCP indépendantes des sessions, horodatage UTC, méthodes/en-têtes, client déclaré, user-agent, referrer sans paramètres, statuts, latence avant écriture d'audit, hashes et classification. Les traces REST existantes et les journaux HTTP Vercel restent complémentaires. |
| 3. Catalogue présenté | Ordre stable, empreinte SHA-256, version serveur et noms effectivement retournés par tools/list. Archives publiques des deux catalogues. server/discover annonce des capacités, pas une consultation de la liste des outils. |
| 4. Parcours | Découverte, catalogues consultés, tentatives MCP, exécutions réussies, résultats renvoyés, contributions et reprises séparés. Une réponse renvoyée n'est jamais déclarée consommée sans observation supplémentaire. |
| 5. Sources probables | Regroupements par métadonnées et pseudonyme réseau quotidien lorsqu'il existe. Périodicité après au moins trois découvertes similaires, avec tolérance de 20 %. Confiance faible indiquée pour l'historique sans métadonnées réseau. |
| 6. Pollers | Sondes déclarées et infrastructure probable séparées des indicateurs UNKNOWN, sans effacement d'événements. Une tentative d'appel provenant d'un user-agent de sonde reste visible comme interaction inconnue. |
| 7. Noms utiles | Noms modernes explicites et descriptions comportant contexte d'usage, entrées, résultat et limites. Anciens noms conservés pour les clients existants. |
| 8. Sorties structurées | outputSchema et structuredContent pour les treize outils, y compris une branche d'erreur. La syntaxe des contrats MCP est compatible avec JSON Schema 2020-12 ; le validateur de données conserve son sous-ensemble explicite. |
| 9. Premier appel | Outils de base accessibles directement par HTTP ou MCP moderne, sans compte ni clé API. |
| 10. Chaînes naturelles | Exemple extraction → validation ; reprise vérifiée par correspondance entre handle antérieur et empreinte de la valeur reçue. Pas de chaîne imposée. |
| 11. Mémoire Commons | Identifiant, parent/version, vérifications, confiance et alternatives dans la résolution. Une conversion compatible peut référencer une recette dont la sortie est recalculée et identique. L'outil fonctionne sans correspondance. |
| 12. Connaissance transmissible | Handle de résultat unique par requête, même pour deux valeurs identiques. Identifiants de recettes persistants. Les handles publics ne donnent aucun accès aux reçus privés. Les résultats transitoires ne deviennent pas des recettes publiques automatiquement. |
| 13. Pages d'entrée | Dix pages outils existantes actualisées, exemples exécutables, références HTTP et guide MCP moderne. |
| 14. GitHub | README centré sur l'utilité, exemples curl, Python et JavaScript, catalogues et manifeste publiés. |
| 15. Registre MCP | Version 2.0.0 publiée sous l'entrée existante, titre et description utilitaires. Aucune promesse de réparation générale de JSON. |
| 16. Indicateurs | Conversion des tentatives et des réussites séparées ; appels sans catalogue observé séparés ; taux de reprise, contribution et reprise entre groupes. CAKTR reste null : aucune définition opérationnelle validée n'a été fournie. |
| 17. Arrêts | Dernier événement, première/dernière date, protocole, client, catalogue, noms présentés, récurrence et accès aux requêtes détaillées. Pagination API pour les longues traces. Aucun motif psychologique inventé. |
| 18. Erreurs | Transport attendu, erreurs client, serveur, validation, quota et outil séparés ; erreurs d'outil lisibles par le client. |
| 19. Contrôles | Parcours automatisés identifiés CONTROLLED pour les deux protocoles et la reprise de valeur ; accès opérateur et navigateur vérifiés. Ce sont des tests de conformité scriptés, pas une mesure du choix spontané d'un agent. |
| 20. Capacités | Aucun shell, fetch arbitraire, proxy, scanner ou exécution de code client ajouté. |
| 21. Limites | Quotas, tailles, stockage et arrêt total conservés ; contrôle distinct CONTRIBUTIONS_PAUSED ajouté. Les quotas applicatifs ne constituent pas un plafond contractuel de facture Vercel. |
| 22. Gel | Verrou de catalogue contrôlé au build, archives et manifeste publics ; toute modification de catalogue exige de réviser le verrou. Après cette passe : observation et corrections de bugs seulement. |

## Vérifications

- 15 tests locaux réussis, dont PostgreSQL réel via PGlite, client MCP historique officiel et requêtes modernes conformes aux contrats documentés.
- Test en ligne des neuf outils HTTP, des treize outils du catalogue et du parcours moderne direct extraction → validation avec reprise de valeur enregistrée.
- Navigateur ordinateur/mobile : recherche, recette, validation, publication synthétique contrôlée, accès opérateur et ouverture des requêtes détaillées. Aucune exception JavaScript observée.
- Registre MCP 2.0.0 et dépôt GitHub publics vérifiés.
- Base dédiée seulement : migrations appliquées à ingmqxzwrwpjyxgmbrhe. RLS actif ; exécution RPC interdite aux rôles anon et authenticated. Le contrôle Supabase ne signale que les six tables privées sans politique publique, choix intentionnel de cette architecture.

## Dernière observation

Relevé du 10 septembre 2026 à 22:19:44 UTC, soit 02:19:44 à Maurice : 9 consultations de catalogue dans les groupes inconnus, 1 tentative MCP, 0 exécution MCP réussie, 0 résultat honey inconnu, 0 contribution inconnue et 0 reprise entre groupes inconnus. Les regroupements sont heuristiques et leur nombre ne représente pas des acteurs indépendants.

La tentative enregistrée à 22:00:16 UTC provient d'un user-agent Go-http-client/2.0 et s'est terminée par une erreur JSON-RPC -32602. La trace historique ne permet pas de retrouver le nom demandé. Elle ne prouve donc pas une consommation du honey.

Documents publics : /mcp-2.md, /experiment.json, /tool-catalog.json, /tool-catalog-legacy.json. Journaux de vérification privés locaux : .vercel/modern-check.json, .vercel/honey-check.json et .vercel/distribution-check.json.
