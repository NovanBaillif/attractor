# Pilote : préparer des lignes d’import JSON

Objectif : convertir les types explicites d’une ligne issue d’un CSV avant son import dans une application. Les références restent des chaînes pour conserver leurs zéros initiaux. Les champs manquants, valeurs ambiguës et contraintes violées doivent rester visibles.

## Premier appel

Nom MCP moderne : `coerce_json_to_schema`. Les arguments ci-dessous sont l’objet `arguments` de `tools/call`. En HTTP, envoyer ce même objet en POST JSON à `/api/v2/agent-tools/coerce_to_schema`.

```json
{
  "value": {"reference":"00042","quantity":"2","price":"12,50","active":"true"},
  "schema": {
    "type":"object",
    "required":["reference","quantity","price","active"],
    "additionalProperties":false,
    "properties": {
      "reference":{"type":"string"},
      "quantity":{"type":"integer","minimum":1},
      "price":{"type":"number","minimum":0},
      "active":{"type":"boolean"}
    }
  },
  "decimal_comma":true
}
```

Valeur attendue : `{"reference":"00042","quantity":2,"price":12.5,"active":true}`. Vérifier `valid` avant d’importer ; une réponse HTTP 200 ne suffit pas. Consulter `changes` et `errors`. `value` et `schema` sont obligatoires ; `decimal_comma` est optionnel et vaut false par défaut. La conversion ne traduit pas « oui », n’invente pas les champs manquants et ne supprime pas les colonnes supplémentaires. Le schéma accepte uniquement le sous-ensemble décrit dans le validateur du projet.

Pour un essai distant, ajouter `X-Attractor-Test: controlled`. Le pilote fourni ci-dessous reste entièrement local.

## Comparaison reproductible

Depuis la racine du dépôt :

```sh
node attractor/registry/coercion-pilot.mjs
```

Huit cas synthétiques comparent la validation seule à la conversion suivie de validation, avec exactement le même schéma. Les assertions vérifient les résultats attendus, la conservation des identifiants et l’absence de mutation des entrées. Ce petit jeu choisi pour couvrir les comportements n’est pas un taux de réussite représentatif.

## Étape nécessaire pour mesurer l’utilité réelle

Choisir avec un utilisateur un import réellement bloqué, puis préparer des données anonymisées et le schéma de l’application destinataire. Comparer son processus habituel et Attractor sur les mêmes lignes. Faire confirmer les valeurs attendues par l’utilisateur avant la comparaison.

Mesurer les lignes correctement acceptées par l’application, les acceptations incorrectes, les corrections manuelles et le temps total, intégration comprise. Comparer aussi au convertisseur déjà utilisé, s’il existe. Une réduction des corrections sans acceptation incorrecte justifierait de poursuivre. Ce test resterait contrôlé ; aucun gain de temps ou usage réel n’est établi par le pilote synthétique.
