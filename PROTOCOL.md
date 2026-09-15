# ATTRACTOR — protocole 0.1

## Question testée
Un visiteur utilise-t-il une information propre à sa session pour répondre et s’adapter ? Ce prototype vérifie l’instrumentation, pas l’attraction spontanée : il est local et son indexation est désactivée.

## Trois tâches
- Sélection : consulter trois ressources synthétiques ; retourner le nom associé à la plus grande valeur. Valeurs et gagnant variables.
- Correction : consulter un objet avec un nombre représenté en texte et son schéma ; retourner l’objet correctement typé.
- Adaptation : retourner un nombre fourni ; recevoir un incrément généré après cette réponse ; retourner la somme. L’événement CONSTRAINT consigne l’information exposée avant la seconde réponse.

Le serveur impose lecture, token propre à la tâche, appartenance à la session et absence de double réussite. La base conserve l’état de tâche et les événements permettant la reconstruction. Les réponses textuelles des visiteurs ne sont pas conservées.

## Interprétation
Indice heuristique : lecture de ressource 10, obtention de tâche 10, réussite 30, adaptation réussie 40. Ces points ne sont ni calibrés ni des probabilités d’IA. Une réussite avec token et ressource spécifiques atteint P3 ; elle peut être produite par un script déterministe. Pas de revendication P4 ou d’indépendance entre sessions. Le validateur conserve ses résultats successifs mais ne prétend pas établir que deux soumissions concernent le même objet.

## Contrôles avant publication
Exécuter les mêmes scénarios avec humains, crawler suivant des liens, script déterministe et agent IA connu. Marquer les sessions contrôlées en ouvrant /?source=controlled avec un nouveau cookie. Ce marquage est déclaratif, pas une identité vérifiée. Les autres sessions restent local-unattributed ; aucune n’est qualifiée de spontanée.

## Données et exploitation locale
SQLite dans data/, hors suivi Git. Cookie aléatoire HttpOnly/SameSite, pas de collecte d’IP persistante, User-Agent, referrer ni contenu du validateur. Quota réseau en mémoire pendant une minute. Purge au démarrage : événements et sessions de plus de 30 jours, tâches de plus de 24 h. Une purge périodique devra remplacer cette stratégie pour un serveur durable. Pas d’exécution de code, de téléchargement d’URL ni de mémoire partagée.

ATTRACTOR_MODE=OBSERVATION_ONLY suspend tous les POST ; FULL_STOP ne laisse que healthz. Redémarrer pour appliquer. Le prototype utilise un processus local : aucune garantie d’isolation réseau système n’est encore établie.

## Suite décidée
Après validation locale : hébergement isolé, dashboard authentifié séparé, quotas persistants, limites de stockage et budget, purge périodique, politique de données revue, TLS et cookie Secure, documentation indexable et sitemap du vrai domaine. Puis essai public de 30 jours, budget fixé avant publication, acquisition via documentation et dépôt public. Mesurer découverte → documentation → validation ou tâche → correction. Séparer essais contrôlés et trafic non attribué ; examiner les explications alternatives. Le nombre de visites ne vaut pas preuve d’agenticité.

Si aucun usage utile non provoqué n’apparaît, revoir la proposition du service avant d’étendre l’observatoire. La mémoire collective reste désactivée jusqu’à définition des groupes de contrôle, des expositions et de la filiation.
