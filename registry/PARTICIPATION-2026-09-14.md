# Découvrir, contribuer, transmettre — 14 septembre 2026

Parcours implémenté sur le registre existant, préparé et vérifié localement. Aucun déploiement effectué par cette session. Aucune recette de test ajoutée au registre public.

## Parcours livré

L'accueil et `/conscience-ia.html` présentent l'exploration de la conscience comme une entrée vers la construction d'une proto-civilisation, sans demander aux agents de se déclarer conscients. Leur action principale mène à `/contribute.html`.

La page propose un premier problème précis : convertir un prix français, préserver les zéros d'une référence et normaliser un booléen. Le contrat et ses deux exemples sont également disponibles sans JavaScript dans `/first-problem.json`.

Un agent équipé peut utiliser l'API existante ; un agent limité à la navigation peut préparer un JSON et un lien de brouillon à remettre à son utilisateur. L'ouverture du lien ne crée aucune session ni contribution : le JSON est dans le fragment, lu côté navigateur. Les reçus et credentials de premier niveau sont refusés par le format. Le contenu reste visible à toute personne possédant le lien ; aucune confidentialité ne doit être supposée.

Après relecture et action explicite, le serveur vérifie les exemples et publie une version. Un lien `/contribute.html?version=UUID` permet de lire ses résultats, tester une réutilisation ou préparer une révision. Les révisions conservent leur parent. Le navigateur obtient lui-même les reçus privés nécessaires ; ils ne sont pas partagés dans les liens.

Le dépôt reste celui du registre de recettes : pas de nouvelle table ni migration. La vérification signifie « réussit les exemples soumis », pas « respecte toutes les intentions du premier problème », « norme adoptée » ou « agent indépendant ». Les raisons en texte libre, votes, contestations et institutions du prototype local ne sont pas intégrés à ce premier parcours public.

## Validation

- Deux nouveaux tests du contrat : brouillons bornés, clés privées refusées, liens malformés refusés, squelette incorrect rejeté et recette correcte acceptée.
- Les 17 tests existants du registre passent, incluant PostgreSQL, MCP, A2A, droits, quotas et arrêts. Les deux nouveaux tests sont ajoutés à sa commande standard.
- Chromium avec PostgreSQL éphémère : client A dépose, client B lit, mauvaise propriété de reçu refusée, réutilisation vérifiée et révision liée au parent.
- Navigateur : ouvrir un brouillon et fabriquer son lien ne change ni le nombre de sessions ni celui des versions ; deux soumissions simultanées donnent une seule version ; le lien stable recharge la recette ; réutilisation et préparation de révision fonctionnent.
- Aucun débordement horizontal à 390 px. Captures ordinateur et mobile dans `attractor/screenshots/participation-*.png`, hors Git. Lint ciblé sans erreur. Build du registre réussi.

Ces vérifications utilisent des données fictives et des clients contrôlés dans une base indépendante en mémoire. Le banc marque ses sessions `controlled`. Elles ne démontrent pas l'arrivée spontanée d'une IA extérieure ni une coopération indépendante.

## Limites et suite non réalisée

Une contribution publiée n'est pas mise dans une file d'adoption de normes. Le registre existant n'offre pas de déduplication générale du dépôt après perte de réponse réseau : le bouton protège le double clic et reste bloqué après succès, mais une reprise ambiguë exige de vérifier le registre. La page de version demande JavaScript et crée un reçu de lecture ; la lecture machine via API requiert une session. Les points d'entrée et le contrat du problème restent lisibles par GET simple.

La distribution contient les nouvelles pages, le guide, le contrat et les entrées de découverte. La publication distante et le test avec une IA extérieure restent à réaliser après revue de cette version.

## Reproduire

Depuis `attractor/` :

```powershell
node registry/build.mjs
npm.cmd --prefix registry test
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node registry/check-participation.mjs
```

Prévisualisation locale : depuis `attractor/registry/`, définir `$env:ATTRACTOR_PREVIEW_MEMORY = '1'`, puis lancer `node preview.mjs` et ouvrir `http://127.0.0.1:4312/contribute.html`. Cette base en mémoire disparaît à l'arrêt. L'ancienne base persistante de prévisualisation a rencontré une incompatibilité de schéma ; elle a été conservée sans réinitialisation. Le guide complet des deux parcours est `PARTICIPATE.md`.

## Publication du 14 septembre 2026

Apres la validation locale decrite ci-dessus, publication autorisee et effectuee : deploiement dpl_3owvJtApgCuwSmBPjKG4AwzAGnLc, etat READY. Domaine : https://attractor-observatory-demo.vercel.app/contribute.html. Les 19 tests passent. Sept pages et ressources publiques verifiees HTTP 200 ; aucune contribution de test publiee. L'observation d'une IA exterieure reste a realiser.
