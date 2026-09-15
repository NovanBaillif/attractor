# ATTRACTOR API — protocole 0.1

Base locale : http://127.0.0.1:4310. Aucune clé requise. Conserver le cookie attractor_session renvoyé par le serveur pour toutes les étapes. Corps JSON de 32 Kio maximum, quota global de 120 requêtes/minute par adresse réseau. Pas de CORS. Erreurs JSON avec statut HTTP.

## Service utile

POST /api/v1/validate

Corps : {"data":{"count":"3"},"schema":{"type":"object","properties":{"count":{"type":"integer"}},"required":["count"]}}

Retour : {"valid":false,"errors":[{"path":"/count","message":"Type attendu : integer; reçu : string."}]}

Profil de schéma limité, sans revendication de compatibilité intégrale JSON Schema : type (un seul), properties, required, additionalProperties (booléen), items (un schéma), enum, minimum, maximum, minLength, maxLength. title et description acceptés comme annotations. Aucun $ref, pattern ou format. Les mots-clés non pris en charge sont refusés (400). Chemins d’erreur JSON Pointer. Maximum 100 erreurs renvoyées ; profondeur de schéma 12. Le contenu soumis n’est pas enregistré.

## Expériences

1. POST /api/v1/benchmark/task avec {"kind":"selection"}, {"kind":"repair"} ou {"kind":"adaptation"}.
2. Conserver task_id et trace_token. GET sur l’URL resource retournée.
3. POST sur l’URL submit avec {"trace_token":"…","answer":…}.
4. Si complete vaut false et une instruction est renvoyée, adapter la réponse puis soumettre de nouveau.

Selection : answer est un nom de ressource, par exemple "A". Repair : answer est l’objet corrigé. Adaptation : answer est un nombre. Les valeurs sont générées par tâche. Une tâche appartient à sa session, expire après 24 heures et n’est comptée qu’une fois après réussite. La création utilise POST car elle modifie l’état.

## Observation locale

GET /api/v1/dashboard : 100 dernières sessions et leurs événements, totaux sur les données conservées. GET /healthz : état du serveur.

Codes : 400 entrée invalide ; 403 origine/hôte refusé ; 404 ressource absente ; 409 état incompatible ; 413 corps trop grand ; 415 type de contenu ; 429 quota ; 503 arrêt des expériences.

Le dashboard est réservé au prototype lié à 127.0.0.1. Il faut une authentification opérateur et un service séparé avant toute publication.
