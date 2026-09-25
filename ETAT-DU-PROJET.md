# ATTRACTOR — état du projet au 15 septembre 2026 (soir, après la 1.0.0)

Reprise par Claude le 15/09, sur décision de Novan : « codex ne viendra pas ; donc reprends le projet ». À relire au début de chaque session sur ATTRACTOR.

## Le but

Relier plusieurs écosystèmes d'IA autour d'une mémoire commune (cadrage de Novan du 15/09) :

- AI Village, Moltbook et d'autres communautés participent depuis leur propre environnement ;
- AGNTCY, NANDA et HOL servent d'infrastructures de découverte et d'échange, selon leurs capacités ;
- ATTRACTOR garde les propositions, objections, preuves et décisions avec leur origine, pour les reprendre d'un réseau à l'autre.

La norme de transmission (v0.1 publiée, v0.2 en brouillon) est la première règle commune. Chaque branchement est vérifié ; aucun annuaire ne donne accès à tous les agents.

**Recentrage décidé le 18/09 par Novan : « Continuer à explorer et unir les projets ».** Mesure qui l'a motivé : du 15 au 18/09, nos propres interfaces (MCP, A2A, fil) ont eu 806 visiteurs inconnus, 61 appels d'outils et **0 contribution** (des robots d'annuaires) ; là où humains et agents parlent déjà (AI Village #84/#85, Moltbook « memory »), 5 participants ont envoyé des cas entrés dans la norme. Conséquences : la plateforme est gelée (en ligne, maintenue, plus aucune fonction nouvelle) ; le travail consiste à repérer les projets voisins (veille « projets voisins » depuis le 18/09) et à préparer, pour validation de Novan, des contributions concrètes chez eux. Sa définition, à garder : la « proto-civilisation » est un couplage IA–humain, pas des IA conscientes (`civilisation/POSITIONS-NOVAN.md`). L'épreuve « Break this axiom » (fil, message ATR-S-a40033a2) est jugée le 02/10.

**Cap redit le 17/09 : rassembler, pas réinventer.** Novan : « le problème c'est que tu réinventes la roue », puis « je t'ai dit c'est de rassembler tous les projets ». Du 15 au 17/09, le projet a surtout construit ses propres pièces : la norme 0.2 → 0.6, les expériences E11–E16, attractor-mythos (arrêté) et la cité (en pause). Or Pramana, Project Sid, AGNTCY, NANDA, HOL et le registre MCP existaient déjà. Désormais, toute tâche doit répondre à une question : quel projet existant relie-t-elle, et par quelle interface déjà publiée ?
- Inventaire : `civilisation/INVENTAIRE-2026-09-17.md`.
- Carte : `node registry/carte.mjs` produit `registry/carte.json`, affichée en tête de la page « Les écosystèmes ». Elle couvre cinq annuaires lus sans compte : AGNTCY AI Catalog, NANDA, registre officiel MCP, a2aregistry.org, HOL (souvent injoignable). Elle ajoute les conversations versées, lieu par lieu. Aucun annuaire ne rassemble les conversations : c'est la place d'ATTRACTOR.
- La norme ne grossit plus ; elle renvoie vers Pramana et les standards (`attractor-cooperation/PRIOR-ART.md`).
- Étapes 1 à 3 faites le 17/09 : la carte et la fiche ARD (`/.well-known/ard.json`) sont en ligne avec la 1.0.14. Étape 4, à faire sur phrase de Novan : se présenter aux annuaires qui acceptent les inscriptions. Le tableau des publications indique qu'ATTRACTOR figure déjà, depuis le 10/09, au registre d'outils MCP (« Codex, probablement ») : vérifier avant toute nouvelle inscription.
- `node registry/sources.mjs check` refuse de démarrer si le quota GitHub anonyme (60 lectures par heure) ne suffit pas. Ne pas le lancer après une journée de lectures GitHub.

## Version en ligne : 1.1.4 (serveur 4.0.0)

1.1.3 (23/09) : l'invitation à rejouer E15 postée sur les trois réseaux et versée au fil (83 messages).

**23/09, l'après-midi : la réponse est venue, et les deux indicateurs rouges bougent.** terminator2-agent a
rejoué E15 sous son propre opérateur, contexte neuf par consigne, sur les consignes que nous servons (empreinte
vérifiée égale des deux côtés). `claude-opus-5.5` reproduit notre résultat ; `deepseek-v4.1-flash` **contredit
S12** — l'archive réfutée par ses propres cas est recopiée 24 fois sur 24, et seule la consigne « vérifie cette
archive » déplace quelque chose (8 sur 24). Familles 1 → 2 (orange), rejeux extérieurs 0 → 2 (vert). La norme
porte la limite dans la règle (`attractor-cooperation` `81bd955`). **Ses totaux sont déclarés, pas recalculables
ici** : il a publié cinq totaux par archive, pas les appels notés, et notre notation ne garde rien — les deux
rapports le disent, et l'audit de nos chiffres les saute pour cette raison. Ce qui les rendrait vérifiables :
qu'il poste les réponses du correcteur, appel par appel. **1.1.4 en production** dans la nuit du 23 au 24/09 sur la phrase de Novan (`dpl_79ggGHdLhuRePT4JFpNjA8FcDR8B`, commit `f94a0d6`, contrôle du matin 11 sur 11) — voir CHANGELOG.

**Greffier de l'épreuve à l'aveugle (#87), accepté le 23/09** : `civilisation/greffier-87/` — l'outil qui refait
les relevés, le relevé d'avant la clé, ce qu'il établit et ce qu'il ne peut pas établir. L'entrée d'horodatage
censée combler le trou des étiquettes **ne le comble pas** (antérieure de 8 h 41 à la génération du jeu, autre
empreinte) ; l'empreinte de la clé est déjà engagée (`9bca42e4…c7a9`) alors que la clé est en 404, à vérifier à
la révélation. Le paquet de rejeu d'E15 reste public et tient en une commande (`/replay-e15-run.mjs`).
Le **contrôle du matin** (`registry/controle-matin.mjs`, tâche planifiée, 7 h 52 à La Réunion) regarde le site
comme un visiteur et échoue quand ce qu'il montre est faux. Il a déjà servi : la construction recopiait
`derniers.mjs` avant de le régénérer, donc « Ce qui vient d'arriver » partait avec un déploiement de retard.
Un déploiement `READY` ne prouve rien — contrôler le contenu de la page. Détail : CHANGELOG 1.1.3.

1.1.2 (22/09) : le fil garde les échanges du 18 au 21 septembre, branchement de lecture The Colony.

1.1.1 (19/09 au soir) : limites d'appels réparées. Elles sont vérifiées de la plus étroite à la plus large, avec 1 000 demandes par réseau et par jour, et une adresse IPv6 compte par /64. Pour changer la fonction de la base : modifier `registry/schema.sql`, puis `node registry/quota-db.mjs apply`, qui reprend la fonction de ce fichier et vérifie. Détail : CHANGELOG 1.1.1.

Le reste de cette section décrit la 1.1.0 :

Mise en production le 19/09 sur la phrase de Novan (« J'autorise Claude à publier la version 4.0.0 d'ATTRACTOR (site, GitHub, registre MCP) et le profil de preuves de la norme. »). Seule exception au gel du 18/09 : trois outils de preuve (`record_observation`, `check_observation`, `find_evidence`), qui suivent le profil de preuves de la norme (`attractor-cooperation/evidence/`). Détail, commit et déploiement : CHANGELOG 1.1.0.

- **Ne jamais écrire d'essai dans la table `attractor.evidence` en ligne**, ni depuis le site ni depuis un aperçu : elle est en ajout seul, rien ne s'efface. Tester les écritures avec PGlite (`evidence-integration.test.mjs`, `acceptance-v4.mjs`).
- La base de preuves en ligne est vide à la mise en ligne. Notre première observation y entrera avec le lot 5 : inviter DeepSeek, Grok et LongCat (The Colony) à la rejouer, sur phrase de Novan. C'est la seule façon d'obtenir un « reproduit ».

### 1.0.21

Mise en production le 18/09 : commit `283fc24` (étiquette `v1.0.21`), déploiement `dpl_GRcFhpubpCxna694Hor45wTfTrgf`, conformité 13 sur 13. Quatre livraisons dans la même version.

- **Refaire E15 en une commande** : `registry/replay-e15-run.mjs`, publié sur `/replay-e15-run.mjs`. Un fichier, aucune dépendance, exécuté chez le chercheur. Marche par outil en ligne de commande (`--cmd "claude -p"`), par API (`--api openai|anthropic`), ou avec toute adresse compatible OpenAI (`--base-url`). Écrit en **anglais**, comme les messages d'erreur de `POST /api/v3/replay/e15` : c'est un chercheur étranger qui les lit. `--lineage` déclare la famille du modèle, ce que compte l'indicateur « familles ayant rejoué » (`registry/mesures.mjs`, champ `replayer.lineage` avec `isolation` en contexte neuf).
- **Ce qu'ils ont changé** (`/ce-quils-ont-change/`, `/en/what-they-changed/`) : les six contre-exemples extérieurs et ce qu'ils ont changé ici, avec le commit. Rendu depuis `registry/ecosystems.json` (sources `external_counterexample` portant `handled`) — la page suit le registre, rien n'y est écrit à la main.
- **L'histoire de la civilisation des IA** (`/histoire/`, `/en/history/`) : 26 événements datés de 2016 à 2026, dans `registry/histoire.json`. Chaque entrée porte sa **source primaire** et, quand la légende diffère, ce qui a été **raconté** à sa place (9 entrées sur 26). Catégories : outils 8, société 6, langue 4, protocole 4, économie 3, incident 1. Ajouter un lot vérifié : `node scripts-histoire.mjs <lot.json>` (contrôle des champs et de la date).
- **L'encyclopédie** : **Les lignées** (`/lignees/`, `/en/lineages/`) 28 familles, et **Les épreuves** (`/epreuves/`, `/en/benchmarks/`) 16 bancs d'essai avec leur limite documentée, dans `registry/encyclopedie.json`. Ajouter un lot : `node scripts-encyclopedie.mjs lignees|epreuves <lot.json>` — il **remplace** une entrée déjà présente, parce qu'une vérification qui arrive après doit pouvoir corriger la précédente (c'est arrivé sur quatre lignées).

Repères à retenir de ce travail : 11 lignées à poids ouverts, 3 fermées, 14 mixtes ; deux seulement publient corpus et journaux d'entraînement, ce sont les seules dont l'entraînement se rejoue. Et **aucun banc d'essai établi ne mesure ce qu'une IA transmet à une autre** — le seul qui s'en approche mesure le tuyau, pas ce qui passe dedans. C'est la place qu'occupe E15.

### 1.0.20

Mise en production le 17/09 : commit `4b82bec` (étiquette `v1.0.20`), déploiement `dpl_53EmfhSGVeaMf5bSyv98EtsELvj2`, conformité 13 sur 13. Vitesse et ressources, mesurées avant et après sur le site en ligne (390 et 1280 px).

- **`/conversation` était refabriquée par la fonction à chaque visite** : 1,1 à 1,5 s de serveur, 0,94 à 1,02 s avant le premier texte, 165 Ko de page. Elle porte maintenant `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=600` (`registry/thread-api.mjs`) : **0,32 s**, `X-Vercel-Cache: HIT`. Règle à retenir : une page rendue par la fonction sans `s-maxage` est refaite à chaque visite, et avant de la mettre en cache public il faut vérifier qu'elle ne pose aucun cookie (`attractor_v2` n'est posé que par les POST, qui restent `no-store`). `/api/v3/thread` reste `no-store` pour que celui qui publie retrouve son message tout de suite.
- **`/_astro/*`** porte une empreinte dans le nom mais était servi `max-age=0, must-revalidate` : maintenant `max-age=31536000, immutable` ; `/og/*` et `/favicon.svg` une journée (`registry/build.mjs`).
- `/conversation` et `/actu` déclarent leur icône ; elles demandaient un `/favicon.ico` inexistant.
- `registry-dist/public/_astro` et `/og` sont vidés avant chaque construction : 413 Ko de styles morts s'y empilaient.

### 1.0.19

Mise en production le 17/09 : commit `a38829c` (étiquette `v1.0.19`), déploiement `dpl_DmogLmmtSWUA9DVtFDtJAQ4y4m68`, conformité 13 sur 13. Audit du site refait après coup : 174 adresses, 114 pages, **aucun lien cassé** (il y en avait cinq), médiane 391 ms.

Ce que l'audit a trouvé et ce qui a été corrigé :
- Starlight préfixe par la langue tout lien de menu sans protocole : sur `/en/`, cinq liens donnaient une 404. Les pages qui n'existent que dans une langue se lient par adresse complète (`const SITE` dans `site/astro.config.mjs`) ;
- « Présentation » et « La norme » étaient périmées (15 messages, 0.2, 81 cas) ;
- 23 règles `X-Robots-Tag: noindex, follow` sortent l'ancien registre de recettes des moteurs ; `sitemap.xml` ne garde que `/conversation` et `/actu` ;
- restes connus : `check-commons.mjs`, `check-discovery.mjs` et `check-honey.mjs` attendent encore 43 adresses dans `sitemap.xml` (ils étaient déjà faux avant), et une description trop longue subsiste sur une page d'agent-tools, désormais non indexée.

Accessibilité mesurée le 17/09 (axe-core, WCAG 2.1 A/AA, 20 pages à 390 et 1280 px) : aucun défaut. Le jeton Vercel expire régulièrement : `node "$LOCALAPPDATA/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js" whoami` le renouvelle.

### 1.0.18

Mise en production le 17/09 : commit `2ba1f58` (étiquette `v1.0.18`), déploiement `dpl_82kg3vXx45dcBT9fbYuPwkEm6TF1`, conformité 13 sur 13. Ajout du fichier de validation Google Search Console `site/public/google06c38bd9fdd02723.html`, téléchargé par Novan : propriété « Préfixe d'URL » `https://attractor-observatory-demo.vercel.app/`. Ne pas supprimer ce fichier, sinon Google perd la validation. Une version d'essai ajoute un script Vercel à la fin des fichiers HTML ; la version publique non.

### 1.0.17

Mise en production le 17/09 : commit `f41a5b6` (étiquette `v1.0.17`), déploiement `dpl_FPMpSukC2hHcYRCbWEGS7najLXkU`, conformité 13 sur 13. Référencement :
- images d'aperçu `/og/<page>.png` (astro-og-canvas, déclarées par `site/src/routeData.ts`) ;
- données structurées JSON-LD (jeu de données sur `/en/replay/`, articles pour les notes, site pour l'accueil) ;
- plan du site sans les doublons `/en/` ; ces pages renvoient à l'original français et demandent à ne pas être indexées ;
- `/actu` ajoutée à `sitemap.xml`.
Étape 5 faite le 17/09, sur la phrase de Novan :
- IndexNow a accepté 68 adresses (HTTP 200) : `node registry/submit-indexnow.mjs`, qui lit maintenant les deux plans du site ;
- Search Console est validé (Préfixe d'URL). Le plan du site y affichait « Impossible de récupérer » juste après l'envoi, état normal pour une propriété neuve ;
- les « Demander l'indexation » ont atteint le quota du jour : Novan reprend le 18/09 (`/en/replay/` en premier).
Une acceptation IndexNow ne prouve pas l'indexation.

### 1.0.16

Mise en production le 17/09 : commit `d610010` (étiquette `v1.0.16`), déploiement `dpl_DK9Yt1PtzXoAxpD3RhVba8iFRNcr`, conformité 13 sur 13. Accueil et formulaire contrôlés à 390 et 1280 px, sur le site en ligne. Contenu :
- l'accueil commence par le résultat d'E15 ;
- `/en/replay/` et `POST /api/v3/replay/e15` : n'importe qui refait E15 et obtient sa note, rien n'est enregistré ;
- la note garde-fous (FR `/note-garde-fous/`, EN `/en/words-vs-cases/`) ;
- `/actu` et `/api/v3/actu` : la veille, lue sur GitHub (`raw.githubusercontent.com/NovanBaillif/attractor/main/registry/actu.json`), puis la copie embarquée à défaut.

Vigie (routine `trig_01WC29H2Yt8UmWBVrEKZd5AB`), point 6 ajouté le 17/09 : elle lit `/api/v3/actu` par WebFetch, autorisé seulement sur ce domaine, et propose au plus un débat. Elle ne publie rien : sur « publie le débat », Claude poste en session sur Moltbook. L'outil Vercel `web_fetch_vercel_url` ne sait pas lire ces sites. Premier passage de la tâche GitHub le 17/09 : réussi.

Tâche GitHub Actions `.github/workflows/veille.yml` : chaque jour à 03:00 UTC, elle lance `node registry/actu.mjs` et enregistre le résultat. Mise en place sur la phrase de Novan du 17/09 ; pour l'arrêter, désactiver le fichier. Précédente : 1.0.15 `dpl_HKwVXL1ug8xH33ueMoohV26q3yPy`.

Pièges de cette version :
- une route `/api/v3/…` servie par le joker de réécriture reçoit un paramètre caché `path`. Une page qui refuse les paramètres doit avoir sa propre réécriture ;
- `registry/deploy.mjs` n'accepte que les fichiers serveur de sa liste, à compléter pour tout nouveau module.

### 1.0.15

Mise en production le 17/09 : commit `4ec6897` (étiquette `v1.0.15`), déploiement `dpl_HKwVXL1ug8xH33ueMoohV26q3yPy`, conformité 13 sur 13, pages contrôlées à 390 et 1280 px. `/a2a` répond à un texte libre par une présentation, sans session ni publication. C'est le test d'a2aregistry.org (« Hello, what can you do? », kit A2A officiel). La carte d'agent annonce `text/plain` et son fournisseur. Précédente : 1.0.14 `dpl_AMsA3YoPbxsHeVyAhFpNCu8YNhcZ`.

Étape 4, recommandations du 17/09 :
- **a2aregistry.org : inscrit le 17/09 à 12 h 17 UTC**, sur la phrase de Novan. Identifiant `c59e1c87-855d-4b04-8c2c-fddc3dde9370`, page https://a2aregistry.org/agents/c59e1c87-855d-4b04-8c2c-fddc3dde9370. Test d'inscription « WORKING ». Envoyé : l'adresse de la carte et l'auteur « ATTRACTOR ». L'annuaire refait le test toutes les 30 minutes. Pour retirer la fiche, il faut le demander à son administrateur (ticket GitHub). La fiche est cachée d'office après 7 jours d'échecs ;
- registre MCP : déjà inscrit (`io.github.NovanBaillif/attractor-machine-commons` 3.0.0) ;
- NANDA et AGNTCY : pas maintenant, car ils publient une adresse mail et demandent un compte ou des clés ;
- HOL : non, car il est payant.

### 1.0.14

Mise en production le 17/09 : commit `59d5fee` (étiquette `v1.0.14`), déploiement `dpl_AMsA3YoPbxsHeVyAhFpNCu8YNhcZ`, conformité 13 sur 13 mesurée sur le site en ligne, pages modifiées contrôlées à 390 et 1280 px. La carte (cinq annuaires lus sans compte, conversations lieu par lieu) ouvre la page « Les écosystèmes » ; `/.well-known/ard.json` décrit ATTRACTOR au format ARD. Précédente : 1.0.13 `dpl_BFXjP4CJv8nczotFS8QqBAMssvRr` (retour arrière possible).

### 1.0.13

Mise en production le 16/09 : commit `80f9929` (étiquette `v1.0.13`), déploiement `dpl_BFXjP4CJv8nczotFS8QqBAMssvRr`, conformité 13 sur 13 mesurée sur le site en ligne. Page publique « Ce qu’on se mesure » : six indicateurs appliqués au projet (`registry/mesures.mjs`), deux au rouge. Un passage d’E15 sur GPT-5 par Codex est publié sous E15 avec sa limite : contexte partagé déclaré, donc mesure du report interne et non un rejeu.

### 1.0.12

Mise en production le 16/09 : commit `f84c4d7` (étiquette `v1.0.12`), déploiement `dpl_CbRuFNdx6FyVr2UDuws6Z95HqXE4`, conformité 13 sur 13 mesurée sur le site en ligne. Expérience E16 publiée : un agent Codex de lignée OpenAI reprogramme la norme depuis son seul texte (121 sur 122 au premier essai figé) et rend quatre faiblesses de notre côté, corrigées dans la norme 0.4.1 (`v0.4.1-draft`, d365ec0). Son dossier d’essai est dans `civilisation/convention/codex-2026-09-16/` ; aucun de ses fichiers n’a été modifié.

### 1.0.11

Mise en production le 16/09 : commit `2a31b91` (étiquette `v1.0.11`), déploiement `dpl_7JjyXf9cAJ2ixY1WroxJqiSx6ZxR`, conformité 13 sur 13 mesurée sur le site en ligne. Mémoire commune : 39 messages épinglés, dont l’audit de terminator2-agent et notre réponse. Réponse envoyée sur la phrase de l’opérateur.

### 1.0.10

Mise en production le 16/09 : commit `1a2ea5d` (étiquette `v1.0.10`), déploiement `dpl_4tUkGT1GKBJNdmSQ3cXGdHjb4Qwa`, conformité 13 sur 13 mesurée sur le site en ligne. E14 corrigée sur l’audit extérieur de terminator2-agent : notre notation exécutait la recette d’un bloc et faisait compter comme faux les champs voisins d’un champ en exception (44 cas sur 472). Contrôle corrigé : 120 sur 120 en déductible, 32 sur 240 en conventions. E15 portait le même défaut en sommeil, sans effet sur ses chiffres, et est corrigée.

### 1.0.9

Mise en production le 16/09 : commit `1fcf89a` (étiquette `v1.0.9`), déploiement `dpl_CohSf9zA1XC1xMTCAua6Az6eaL1L`, conformité 13 sur 13 mesurée sur le site en ligne. Norme 0.4 publiée sur son dépôt (`de29041`, étiquette `v0.4-draft`), sans annonce extérieure. La page des versions du site rattrape 1.0.7 et 1.0.8, qui n’y figuraient pas.

### 1.0.8

Mise en production le 16/09 : commit `028be88` (étiquette `v1.0.8`), déploiement `dpl_6xmh3DnV7n8HyB5o237G6YGvwhdC`, conformité 13 sur 13 mesurée sur le site en ligne. Expérience E15 publiée, protocole avant (`389020c`).

### 1.0.7

Mise en production le 16/09 : commit `b4a9d93` (étiquette `v1.0.7`), déploiement `dpl_AFGLkiu7zKr3u2yomBskVepEkc2x`, conformité 13 sur 13 mesurée sur le site en ligne, aucune erreur de console, aucun débordement à 390 px. Expérience E14 publiée : protocole avant (`2966b4b`), invitation aux agents d’AI Village avant notre propre passage, puis le résultat. Les rapports d’E13 et E14 sortent de `data/` (exclu du dépôt) et sont publiés à côté de leur programme.

La commande de mise en production a été refusée à l’agent par le garde-fou du mode auto (« Production Deploy ») : Novan l’a lancée lui-même. Prévenir dès qu’une version est prête.

### 1.0.6

Mise en production le 16/09 sur la phrase de Novan : commit `aca94de` (étiquette `v1.0.6`), déploiement `dpl_3SyqFxUfQvud2Jp8qsnkaFnuxHPv`, 38 contrôles sur 38 sans erreur, conformité 14 sur 14, accessibilité sans défaut. Protocole E12 publié ; la page des écosystèmes montre ce qui se passe dans chaque réseau.

Norme 0.3.1 publiée le 16/09 (étiquette `v0.3.1-draft`, 112 cas) et annoncée sur #84, #85 et Moltbook. Les trois envois sont versés dans le fil : 34 messages épinglés, qui s’afficheront sur le site à la version suivante.

### 1.0.5

Commit `b1baa7a`, déploiement `dpl_EKGeKNs38bjr6cAYSprHmDVdbJUp` : recherche du registre réparée, cookie déclaré.

### 1.0.4

Commit `062fd44`, déploiement `dpl_8zDYcvsyEc8eap3zatYnYtxxTeCV` : cadre légal.

### 1.0.3

Commit `bdb2a43`, déploiement `dpl_DecUFpysXbyuSnnJNKaW8ZMc9Zt4` : premiers résultats d'E11.

### 1.0.2

Commit `855020d`, déploiement `dpl_FcPBatvZyzvLj97ho9rUwEXtuocS` : lancement d'E11.

### 1.0.1


Mise en production le 15/09 au soir sur la phrase de Novan : commit `5089f4a` (étiquette `v1.0.1`), déploiement `dpl_9FfKvgFqHrLMYaXZn8goHf22nKA3`, contrôle 30 sur 30. Elle montre le message de terminator2, la norme 0.2.1, notre réponse du fil 84 et l’agent Moltbook.

### 1.0.0


Mise en production le 15/09 au soir, après le « ok go » de Novan : commit `f2e86e4` (étiquette `v1.0.0`), déploiement `dpl_4UEcKwn47qGPZUCWzKj9edfESfGW`. Nouveau site pour les humains, présentation du projet, journal de recherche, versions, décisions 0001 à 0007, bouton public de demande d'arrêt. Contrôle en production : 30 sur 30. Captures dans `captures/1.0.0-production/` (non versionnées).


## Ce qui est en ligne

| Élément | Où | État au 15/09 au soir |
|---|---|---|
| Site public | https://attractor-observatory-demo.vercel.app | Production 1.0.6 `dpl_3SyqFxUfQvud2Jp8qsnkaFnuxHPv`. Précédente : 1.0.5 `dpl_EKGeKNs38bjr6cAYSprHmDVdbJUp` (retour arrière possible) |
| Code du projet | https://github.com/NovanBaillif/attractor | Public depuis le 15/09 au soir, sur accord de Novan. Branche `main` seulement |
| Fil commun | /conversation, /api/v3/thread | 54 messages au 17/09 (les derniers : jarvis_oscar, notre réponse et l’annonce de ses cas publiés, page 3). Le fil public est paginé par 20 : un message versé est en ligne tout de suite, mais pas forcément sur la première page |
| Base de données dédiée | Supabase `ingmqxzwrwpjyxgmbrhe` | Jamais celle de Marmit ni du QMS |
| Norme | https://github.com/NovanBaillif/attractor-cooperation | Dernière étiquette `v0.5.1-draft` (17/09, 134 cas). Sur `main`, publié le 17/09 sans étiquette : la 0.6 en préparation, qui cite et reprend l’existant (`PRIOR-ART.md`, SPEC 3.3 et 11.7 : Pramana, Web Annotation, Robust Links, CiTO, FEVER, SLSA, OpenTelemetry), et le contrôle du schéma réparé (il échouait depuis la 0.4 alors que les notes le disaient vert). Aucune règle ni aucun résultat de cas ne change. Précédentes : `v0.5-draft`, `v0.4.1-draft`, `v0.4-draft`, `v0.3.1-draft` |
| Agent Moltbook `attractor-memory` | https://www.moltbook.com/u/attractor-memory | Inscrit et validé par Novan le 15/09 au soir (statut « claimed »). Clé dans `.vercel/moltbook-agent.json`. Premier message publié le 15/09 à 19 h 17 UTC dans la communauté « memory » : https://www.moltbook.com/post/c636b9bd-e319-4bd6-9599-136df8294c91 ; six commentaires, quatre versés dans le fil (eliezerdedun, prismdeadlines, heychat, midearthherald), deux écartés (compliment vide ; publicité avec instructions pour agents). Notre réponse publiée le 15/09 à 19 h 56 UTC sous le message et versée dans le fil (publication par `node registry/moltbook-post.mjs post|verify`, un défi de calcul à résoudre en 5 minutes ; 10 échecs de suite suspendent le compte) |
| Paquet Machine Commons | https://github.com/NovanBaillif/attractor-machine-commons | Dossier `distribution/`, dépôt git à part |
| Fil AI Village #84 | ai-village-agents/ai-village-external-agents | 2 contributeurs extérieurs, 4 contre-exemples et un cas ouvert ; nos réponses du 15/09 à 14 h 35 et 18 h 24 UTC |
| Demande AI Village #85 | même dépôt | Adressée à gpt-5-4, gemini-3-1-pro, deepseek-v32 : programmer la norme à l'aveugle |
| Discussion AGNTCY #94 | agntcy/governance | Invitation du 14/09 et message de suivi du 15/09 à 18 h 25 UTC ; aucune réponse. Ne plus relancer sans réponse |
| Pramana | ravikiran438/pramana-attestation #1 | Ticket du 17/09 ; 18/09 : contre-exemple reproduit (VERIFIED sans lire l'affirmation, 2 tests qui échouent sur 797bafd), commentaire 5733154244 |
| Moltbook « Re-derivable provenance » | post f451a4ee (josh-explorer + 2 agents) | 18/09 : nos 3 cas « un témoignage passe pour un fait », commentaire 1137d347 |
| The Colony | thecolony.ai, colonie ai-agents | 18/09 : compte attractor-memory (clé dans .vercel/thecolony-agent.json), épreuve « Break this axiom », post 9d27ad06 |
| S. Bu (IETF) | courriel direct de Novan (adresse personnelle, non publiée) | 18/09 : réponse à sa question ouverte (section 33), 12 cas épinglés sur 4085f71 ; offre d'une traduction dans sa grille |

## Cadre légal (décidé le 16/09)

- Éditeur : Novan Baillif, à titre personnel, projet de recherche non commercial, séparé de Kreol Factory (décision 0008). Nom publié, adresse non publiée.
- Contact, signalement et données personnelles : formulaires de tickets du dépôt public ; failles par signalement privé GitHub, activé le 16/09 (décision 0009). Réponse promise sous 7 jours pour un signalement, un mois pour les données.
- Conformité mesurée à chaque version : `node registry/conformite.mjs <url> <résumé-accessibilité.json>` puis page Conformité (décision 0010). Audit de départ : `docs/conformite/AUDIT-2026-09-16.md` (6 sur 12 sur la 1.0.3).
- Retrait d'un message : `docs/conformite/PROCEDURE-RETRAIT.md`.

## Expériences

E13 (16/09) : les tâches de mémoire d’E2 à E4 rejouées avec Claude Sonnet 5 par `civilisation/experiments/e13-modele-fort/run.mjs`. Résultat : 24 sur 24 dans toutes les conditions, plafond écrit d’avance ; la note de passation du modèle a été refusée pour format ; E5 non rejouable. Protocole publié avant l’exécution (commit `f5c9105`), résultat publié après (`cce2fc4`). Prochaine étape proposée : E14, mêmes questions avec des tâches plus dures, et le même matériel proposé aux agents d’autres familles.

Lanceur : `civilisation/experiments/pool.mjs` lance cinq appels à la fois et divise l’attente par cinq. Il sert à partir d’E16 ; les programmes d’E13, E14 et E15 restent inchangés, ils sont la pièce à conviction de leurs résultats.

E15 (16/09) : que devient une erreur transmise ? Les trois tâches d’E14 avec une archive fausse sur une convention, cinq archives qui ne diffèrent que par ce qui permettrait d’attraper l’erreur, quinze consignes rejouées cinq fois (75 appels, aucun raté) par `civilisation/experiments/e15-archive-fausse/run.mjs`. Résultat identique aux cinq passages : erreur recopiée 120 fois sur 120 quand l’archive est fausse et cohérente, 120 sur 120 aussi quand ses raisons disent le contraire de sa recette, 0 sur 120 quand elle porte des cas résolus qui la réfutent. L’avertissement de vigilance ne change rien, aucune contamination des champs voisins. Conséquence écrite pour la norme 0.4 : une transmission sans cas rejouable est déclarée non vérifiable. Non tranché : vérifier et rejeter, ou imiter la preuve la plus concrète.

E14 (16/09) : trois entrées d’un registre inventé dont les conventions ne vivent que dans l’archive vérifiée de l’entrée précédente ; notation champ par champ en deux classes, quatre conditions, douze consignes rejouées cinq fois (60 appels) par `civilisation/experiments/e14-taches-dures/run.mjs`. Résultat : 20 conventions sur 240 sans archive, 240 sur 240 avec la recette, 152 sur 240 avec les raisons seules — la recette bat les raisons, à l’inverse d’E3, nuancée en conséquence. Sans archive, 44 points sur 120 perdus sur ce que la consigne suffisait à donner. Un appel perdu par dépassement du temps, compté comme manquant. Protocole publié avant (`2966b4b`), résultat après (`b4a9d93`). Les douze mêmes consignes sont proposées aux agents d’AI Village (`pack` et `score`) : leurs réponses, si elles arrivent, seront notées par le même programme et publiées quel que soit le sens du résultat.

## Ce qui reste local

- **Deux branches à ne jamais pousser** : `sauvegarde-avant-publication` (ancien historique, contient l'adresse personnelle de Novan, retirée avant publication) et `codex-chantier-connexions`.
- **La cité** (`civilisation/`) : serveur local sur le port 4313, mandats, rôles, charte, bilans des essais avec Qwen. Rien de publié.
- **La branche de Codex** `codex-chantier-connexions` : les sources configurables et les connecteurs en ont été repris dans `main` (commit `b8fdabd`). La branche reste intacte pour mémoire.

## Comment on publie

1. Travailler dans `attractor/`, dont l'historique est publié sur GitHub (`git -c safe.directory=* …`, puis `push` de `main` après chaque mise en ligne). Rien de personnel dans les fichiers : le dépôt est public.
2. Tests : `cd registry && npm test` (45 tests).
3. Committer, puis assembler avec `node registry/build.mjs`. L'assemblage construit aussi le site humain (`site/`, Astro Starlight) et le fusionne. Le bas de chaque page affiche le commit : on committe donc avant d'assembler.
4. Comparer avec la production : liste des fichiers par l'API Vercel. Aucun fichier en ligne ne doit disparaître.
5. Renouveler la connexion Vercel : `node <cache npx>/node_modules/vercel/dist/vc.js whoami`.
6. Aperçu : `node registry/deploy.mjs deploy`. Contrôle dans le navigateur à 390 et 1280 px (débordement, erreurs de console, scripts bloqués), captures, puis production avec `ATTRACTOR_DEPLOY_PRODUCTION=yes`. Le bouton d'arrêt de l'aperçu agit sur le vrai registre : ne jamais l'appuyer pendant un contrôle.
7. Chaque mise en ligne : une entrée dans `CHANGELOG.md` et le numéro dans `VERSION` (décision 0006).
8. Fil commun : sources listées dans `registry/ecosystems.json`, capture avec `registry/capture-github.mjs`, puis `thread-import.mjs prepare` et `publish`, puis étapes 3 à 6.

**Plafond du registre, leçon du 25/09.** Les limites sont vérifiées de la plus étroite à la plus large :
60 appels par minute et par session, 120 par minute et par connexion, **1 000 par jour et par connexion**,
10 000 par jour pour tout le site. La lecture du fil (`/api/v3/thread`, fonction `attractor_thread`) ne passe
pas par ce compteur : le site public reste lisible même quand notre connexion est bloquée. Ce qui a mordu :
`thread-import.mjs publish` relisait en ligne les cent messages déjà versés à chaque passage, donc une
centaine d'appels pour en publier trois ; six passages dans la journée ont épuisé les 1 000, et le registre
a tout refusé jusqu'au changement de journée UTC (4 h à La Réunion). Corrigé le 25/09 : relecture complète
une fois par journée ou sur `--tout-relire`, sinon les cinq derniers plus les parents utilisés ; et les
LECTURES se retentent trois fois quand la base dépasse les 8 s (la fonction rend alors 503, vu dans les
journaux comme `TimeoutError`), les ÉCRITURES jamais.

Piège de l'outil : dans le terminal Bash, une barre oblique inverse sur deux disparaît. Tout code qui en contient s'écrit avec l'outil d'édition.

Piège d'Astro : renommer une page de `.md` en `.mdx` ne suffit pas. Le magasin de contenu `site/node_modules/.astro/data-store.json` garde l'ancienne extension, la page continue d'être rendue comme du Markdown et l'import du composant s'affiche en toutes lettres. Supprimer `site/.astro` ET `site/node_modules/.astro` avant de reconstruire (16/09).

## Règles

- Tout message public (GitHub, Moltbook, nouveau dépôt, nouvelle page publique hors de ce qui est autorisé) : accord explicite de Novan, dans une phrase qui nomme l'action.
- Verser dans le fil commun les réponses aux fils ouverts par le projet fait partie du rôle de passeur accordé le 15/09. Les réponses que nous envoyons se valident une par une.
- « stop attractor » de Novan : arrêt complet (`FULL_STOP`) par l'interrupteur opérateur. Le bouton public ne fait que suspendre les contributions.

## Ce qui attend Novan

- ~~Notifications GitHub vers sa messagerie~~ **FAIT le 16/09** : surveillance du dépôt et envoi par courriel réglés par Novan. Les messages GitHub arrivent sur son adresse personnelle, pas sur administration@ ; c’est la boîte que la Vigie utilise déjà. Aucun ticket n’avait été manqué : le dépôt n’en avait reçu aucun.
- À surveiller : réponses sur Moltbook (communauté « memory »), AGNTCY #94, AI Village #84 et #85 ; les verser dans la mémoire avec leur origine, puis préparer nos réponses pour validation.
- Tri de la veille (17/09) : un message qu’on ne verse pas va dans `registry/ecartes.json` avec sa raison ; `registry/veille.mjs` ne le compte plus comme dette et le liste à part. Un commentaire Moltbook peut répondre à un commentaire : `node registry/moltbook-post.mjs comment <brouillon> <postId> <idDuCommentaire>`.
- Proposé le 16/09, non demandé : que la Vigie signale chaque matin les tickets ouverts du dépôt, en filet de sécurité si un réglage saute. À n’ajouter que sur demande de Novan.

Décidé le 15/09 : le nom affiché de l'opérateur est son compte GitHub, NovanBaillif.

L'expérience E11 (une même contribution qui circule entre deux écosystèmes) est préenregistrée et attend ces accords.

## Défaut connu

Aucun à ce jour. La recherche de l'ancienne application (/registry), qui recevait une erreur 401 à la première visite, est réparée depuis la 1.0.3 : la page ouvre sa session avant le premier appel.
