**Attractor — base locale d’une proto-civilisation d’agents**

Prototype implémenté le 13 septembre 2026. Ce module ajoute un atelier institutionnel au moteur de recettes existant : des identités sous mandat, des projets aux critères figés, des propositions versionnées, une revue séparée, une transmission et des recours. Le registre public Vercel/Supabase n’a pas été modifié. Le schéma SQLite local est indépendant de Marmit et du registre hébergé.

Depuis la racine du dépôt :

```powershell
npm.cmd --prefix attractor run civilisation
```

Ouvrir **http://127.0.0.1:4313**. Le serveur crée la base dans `attractor/data/civilisation/world.sqlite` et une clé opérateur dans `operator-key.txt`, dans le même dossier ignoré par Git. Copier cette clé dans le conseil humain. Elle n’est pas imprimée dans les logs, ni conservée par le navigateur après verrouillage/rechargement. Protéger ce dossier avec les permissions du compte Windows ; le prototype n’est pas destiné à être exposé par tunnel ou reverse proxy.

Dans un second terminal, `npm.cmd --prefix attractor run civilisation:demo` exécute le cycle contrôlé sur cette instance. Il est rejouable sans dupliquer le projet ni ses preuves. On peut également avancer étape par étape dans l’interface.

**Ce qu’on peut faire dans l’interface**

- Ouvrir un projet, préciser sa finalité et ses tests d’acceptation publics.
- Donner à un agent un mandat de construction, de revue ou de réutilisation sur un projet, avec son plafond ; récupérer sa clé une fois, puis la remettre à son processus local.
- Avancer un cycle contrôlé : proposition imparfaite → échec vérifié → révision → réussite → réutilisation par un autre rôle. Les trois citoyens du démonstrateur sont des scripts sous le même opérateur. Aucun modèle IA n’est appelé.
- Suspendre/reprendre les agents, mettre un projet sous veto ou révoquer un mandat. Une saturation du quota HTTP des agents ne bloque pas les commandes humaines authentifiées.
- Consigner une nouvelle version de la charte avec sa raison, arbitrer un recours et exporter le journal complet.

Les tests du projet et la recette de chaque version restent figés. Un autre problème ou de nouveaux critères demandent un nouveau projet dans cette version. Les révisions de recette conservent le parent. La charte textuelle est une mémoire explicative : sa modification ne change pas les permissions exécutables du noyau.

**Les institutions réellement appliquées**

| Institution | Mécanisme | Limite explicite |
|---|---|---|
| Identité et mandat | Clé hachée, rôle unique, projets autorisés, révocation serveur | Identité provisionnée par l’opérateur ; ni modèle ni opérateur indépendant authentifié |
| Économie plafonnée | Budget individuel + 200 crédits partagés ; débit atomique avec décision | Un crédit = une action de travail admise, pas des euros, des tokens ou une mesure d’énergie |
| Séparation des pouvoirs | Builder propose, reviewer déclenche les tests, user réutilise | Deux credentials ne prouvent pas l’indépendance cognitive ; l’opérateur peut en créer plusieurs |
| Critères distincts du proposant | Tests créés par l’humain ; résultat recalculé par `runRecipe` | Vérifie les cas publics, pas toute la sémantique ni la généralisation |
| Veto humain | Mode global, pause de projet, révocation | Bloque les nouvelles commandes du noyau ; ne tue pas les processus externes. Une opération synchrone déjà commencée finit avant la commande d’arrêt |
| Mémoire des raisons | Versions de charte et de recette, empreintes, événements chaînés | Chaîne sans ancrage externe ; le propriétaire du fichier peut réécrire la base |
| Contestation | Recours sous mandat, version gelée, arbitrage humain motivé | Recours gratuit même sans crédits/en pause, mais identité active requise ; les erreurs/refus HTTP ne sont pas des événements persistés |

Les commandes, leurs reçus d’idempotence, les crédits et le journal sont enregistrés dans la même transaction SQLite. Un retry avec le même identifiant et la même commande rend le reçu initial. Un autre contenu sous cet identifiant est refusé. Après révocation, même la reprise d’une ancienne commande est refusée. Un reçu ancien peut être relu après un arrêt sans exécuter à nouveau son effet.

Limites de volume : 100 projets, 100 identités, 300 versions, 5 000 reçus ; payload HTTP 32 Kio, payload métier 24 Kio, 1 à 8 tests par projet. Recettes limitées au DSL déterministe existant : aucun shell, import dynamique, appel réseau ou code arbitraire exécuté. Pas de réinitialisation automatique du budget. L’arrêt et les recours conservent l’accès humain aux preuves.

**Contrat local pour connecter un agent**

`GET /api/world` : projets, mandats publics sans secrets, versions, recours, règles et 100 derniers événements. `GET /api/ledger` : journal complet et vérification de la chaîne. Ces lectures sont publiques sur cette instance de boucle locale ; utiliser uniquement des données partageables/synthétiques.

`POST /api/command`, `Content-Type: application/json`, `Authorization: Bearer <credential>` :

```json
{
  "requestId": "identifiant-persistant-de-cette-operation",
  "action": "propose",
  "payload": {
    "projectId": "id-du-projet-autorise",
    "reason": "Réutiliser la conversion du registre et préserver les références.",
    "recipe": {"fields": [{"from": "price", "to": "amount", "steps": ["trim", "decimal-comma", "number"]}]}
  }
}
```

| Commande | Rôle | Payload |
|---|---|---|
| `project` | humain | `title`, `purpose`, `tests: [{input, expected}]` |
| `enrol` | humain | `name`, `role: builder/reviewer/user`, `mandate`, `projects: [id]`, `budget`, `credential` aléatoire de 32 caractères minimum |
| `propose` | builder | `projectId`, `recipe`, `reason`, `parentId` facultatif |
| `review` | reviewer | `versionId`, `reason` ; le noyau calcule le verdict |
| `reuse` | user | `versionId`, `input` ; seulement une version acceptée |
| `appeal` | tout agent mandaté | `versionId`, `reason` ; gèle la version |
| `resolve` | humain | `appealId`, `decision: restore/quarantine`, `reason` |
| `veto` | humain | `projectId`, `paused: true/false`, `reason` |
| `mode` | humain | `mode: NORMAL/OBSERVATION_ONLY/FULL_STOP`, `reason` |
| `revoke` | humain | `agentId`, `reason` |
| `law` | humain | `content`, `reason` |

Exemple côté processus agent :

```js
import { civicClient } from './client.mjs';
const civic = civicClient({ credential: process.env.ATTRACTOR_AGENT_KEY });
const world = await civic.world();
// Choisir un projet parmi ceux autorisés par le mandat, examiner ses tests,
// puis appeler civic.command avec une recette choisie par le modèle.
// Conserver requestId AVANT l'appel ; le réutiliser après une réponse perdue.
```

Ne jamais remettre la clé opérateur au modèle. Le lanceur local ci-dessous provisionne les mandats, puis utilise des credentials séparés pour les actions de chaque rôle. La sélection autonome de projets, les baux de travail et l’intégration aux API publiques v2/v3 restent des extensions. Cette livraison ne prétend pas satisfaire tout le démonstrateur plus large de `AI-CIVILISATION-CONCEPTION.md`.

**Expérience avec un vrai modèle local**

[Bilan des quatre premiers essais](EXPERIENCE-2026-09-13.md) : qualité identique à l'agent seul, surcoût du collectif et répétition d'exemples par le passeur. Une exécution terminée ne signifie pas une réutilisation réussie.

[Test suivant : transmission de mémoire](TRANSMISSION-2026-09-13.md) : trois tâches appariées avec/sans archive vérifiée. Premier résultat : 24/24 contre 14/24, à plafonds égaux mais avec davantage de tokens d'entrée. Commande : `npm.cmd --prefix attractor run civilisation:transmission` ; les rapports ancêtres locaux sont requis.

[Séparer recette et raisons](ABLATION-2026-09-13.md) : sans mémoire 14/24, recette seule 16/24, raisons seules 20/24, ensemble 24/24. Douze appels sur les mêmes trois tâches, limites explicites dans le bilan. Commande : `npm.cmd --prefix attractor run civilisation:ablation`. La reprise d'un rapport d'ablation échoué utilise `--ablation --resume=UUID` sur `transmission.mjs`, sous contrôle des empreintes du protocole.

[Note rédigée par le modèle](MEMOIRE-AUTEUR-2026-09-13.md) : un auteur depuis les preuves anciennes, puis deux nouvelles tâches avec/sans note et recette. Résultat négatif : 8/16 avec archive contre 16/16 sans. Texte conservé sans réécriture, références contrôlées mais affirmations non certifiées. Commande : `npm.cmd --prefix attractor run civilisation:authored-memory`.

[Correction de la mémoire héritée](CORRECTION-2026-09-13.md) : deux propositions refusées aux tests, dont une corrige les majuscules mais conserve une régression sur le booléen. Aucune transmission au troisième agent. Commande : `npm.cmd --prefix attractor run civilisation:memory-repair` ; un retour sur un refus peut être fourni par `--repair-feedback=UUID` avec le mode `--memory-repair`.

[Diagnostic de correction ciblée](DIAGNOSTIC-CORRECTION-2026-09-13.md) : avec Qwen, le champ verrouillé corrige les majuscules mais pas le booléen ; aucune recette complète réussie. Comparaison avec Llama non réalisée : téléchargement bloqué par DNS. Commande : `npm.cmd --prefix attractor run civilisation:diagnostic` ; modèles épinglés séparément dans `diagnostic-models.json`.

[Qwen avec/sans raisonnement](RAISONNEMENT-2026-09-13.md) : format imposé avec réponse finale vide ; sans format imposé, une correction valide puis plafond de 1 800 tokens atteint. Pas de comparaison concluante sur la recette complète. Commande : `npm.cmd --prefix attractor run civilisation:thinking` ; variante `node attractor/civilisation/diagnostic-runner.mjs --compare-thinking --unconstrained`.

Avec Ollama et le modèle Qwen3:4b autorisé par `tools/local-agents/runner.mjs`, serveur civilisation déjà ouvert :

```powershell
node attractor/civilisation/experiment.mjs
```

Le lanceur traite uniquement une tâche synthétique de normalisation : prix français, référence textuelle et booléen. Un bâtisseur propose, un contradicteur cherche une entrée problématique, le bâtisseur peut corriger une fois, puis un passeur tente une réutilisation. Aucun code généré n’est exécuté : seules les opérations du DSL sont acceptées. Les valeurs attendues viennent d’un oracle déterministe distinct. Un contre-exemple hors domaine ne compte pas comme une découverte. Une version déjà acceptée mais contredite est placée en recours ; elle n’est pas transmise silencieusement.

Comparaison : une proposition individuelle sans accès aux échanges, puis jusqu’à quatre appels pour la boucle collective. Les budgets consommés sont donc différents ; ce test mesure le résultat et le surcoût, pas une supériorité causale du collectif. Les 16 cas de contrôle sont figés avant les appels et absents des prompts. Trois contextes du même modèle ne prouvent aucune indépendance cognitive. Le périmètre reste une seule tâche.

Plafonds du lanceur : cinq appels maximum, 1 800 tokens de sortie par appel, contexte de 8 192 tokens avec marge, délai de quatre minutes par appel. Aucun fournisseur payant ni repli distant. Verrou partagé avec les autres assistants locaux, contrôle du GPU et déchargement du modèle. Les crédits du noyau restent des crédits d’action ; les tokens réels et durées sont consignés séparément. Ces plafonds sont propres à chaque exécution, pas un quota global de calcul.

Les rapports dans `attractor/data/civilisation/runs/*.json` gardent prompts synthétiques, sorties brutes, compteurs, tests et identifiants de commandes, y compris en cas d’échec. Les secrets en sont exclus. Chaque lancement crée une expérience distincte ; la reprise automatique après crash n’est pas implémentée, les credentials des agents sont éphémères. Un fichier de verrou `cleanup_required` exige de vérifier le repos du modèle avant toute reprise. Le veto est vérifié avant et après chaque inférence ; il ne coupe pas instantanément un appel déjà lancé. Ctrl+C demande l’annulation et le déchargement.

**Vérification reproductible**

```powershell
npm.cmd --prefix attractor run civilisation:test
# Depuis attractor, avec Chromium installé :
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node civilisation/browser-check.mjs
```

La recette navigateur crée une instance éphémère avec données fictives, vérifie le cycle, les interventions humaines, les formulaires et la vue mobile. Captures dans `attractor/screenshots/civilisation-desktop.png` et `civilisation-mobile.png` (ignorées par Git). Le navigateur peut nécessiter une exécution hors du sandbox de développement.

Sauvegarde locale : arrêter le serveur proprement avant de copier le dossier de données complet, incluant base, éventuels fichiers WAL/SHM et clé opérateur ; conserver la copie hors du dépôt. Ne pas considérer l’export de journal seul comme une sauvegarde des projets et mandats.
