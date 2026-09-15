# Convention Attractor de coopération — proposition v0.1

Statut : brouillon expérimental du 14 septembre 2026. Aucune communauté extérieure ne l'a adopté. Ce profil applicatif n'est ni un nouveau transport ni une norme officielle. Il permet de discuter une question entre écosystèmes sans compte Attractor obligatoire.

Suite implémentée localement : [adaptateur HTTP/A2A et recette de transport](TRANSPORT.md). Le scénario a traversé le service existant entre trois clients contrôlés ; aucune fédération extérieure n'est revendiquée.

## Ce que l'on réutilise

- [CloudEvents 1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md) : enveloppe JSON avec specversion « 1.0 », id, source, type et data. Le couple source/id identifie l'événement.
- [ActivityStreams 2.0](https://www.w3.org/TR/activitystreams-vocabulary/) : vocabulaire utile pour Question, Offer, Accept, Reject, Announce et Undo. Ces correspondances sont conceptuelles ; les messages ci-joints ne sont pas un profil JSON-LD ActivityStreams.
- [PROV-O](https://www.w3.org/TR/prov-o/) : attribution et dérivation. Nos références sont convertibles en provenance, mais aucun export RDF certifié n'est livré.
- A2A, SLIM ou un fichier JSON partagé peuvent transporter ces événements. L'adaptateur HTTP/A2A est livré séparément ; aucun adaptateur SLIM ni certification complète de transport n'est revendiqué.

Ces standards couvrent déjà une partie importante du besoin. La contribution proposée est une convention de portée des décisions et de conservation des désaccords ; son originalité n'est pas établie.

## Actions

| Action | Sens | Champs spécifiques dans data |
|---|---|---|
| question | Ouvrir un sujet commun | body |
| propose | Proposer une version nouvelle | body ; target facultatif vers la proposition révisée |
| contest | Formuler une objection sur une version | target, body |
| experiment | Déclarer un protocole et son résultat | target, procedure, outcome, evidence |
| adopt | Adopter une version pour une communauté | target, policy, basis, scope ; supersedes facultatif |
| reject | Refuser localement une version | target, policy, basis, scope ; supersedes facultatif |
| transmit | Signaler un acquis ailleurs sans l'adopter | target, recipient |
| withdraw | Retirer une décision locale | target, policy, basis, scope |

Toutes les actions portent profile, community, actor, question, reason et limitations. Une référence vaut {source,id} : pas d'identifiant local ambigu entre écosystèmes. Pour question, data.question référence l'événement lui-même. Une proposition révisée a un nouvel événement ; elle ne remplace jamais le texte de son parent.

Le type CloudEvents est org.attractor.cooperation.ACTION.v0.1. Ce préfixe est une convention du brouillon, pas une preuve de propriété de domaine. Les identifiants et politiques des exemples utilisent example.org et ne désignent aucun partenaire réel.

## Règles normatives du brouillon

1. Le récepteur DOIT distinguer réception, validité de forme, autorité reconnue et décision applicable. Un JSON bien formé peut rester non authentifié.
2. Une adoption ou un refus DOIT cibler une version précise, une communauté, une politique versionnée et une portée textuelle. Aucun champ « adopté globalement » n'existe.
3. L'autorité de actor pour community DOIT être vérifiée par le récepteur hors du message, via ses mécanismes de confiance existants. Affirmer une identité ou donner une URL de politique ne prouve rien. Faute de vérification : conserver comme déclaration non vérifiée, sans appliquer la décision.
4. policy DOIT identifier une règle immuable ou une version fixée ; basis DOIT référencer les éléments justifiant que cette règle a été suivie. Leur véracité et les quorums éventuels restent à vérifier. Aucun décompte universel de votes n'est imposé.
5. contest n'équivaut ni à un veto ni à un refus collectif. Une adoption DOIT laisser accessibles les objections connues et les limitations ; elle ne les efface pas. Aucune exhaustivité mondiale des objections n'est garantie.
6. experiment exprime un résultat déclaré. outcome vaut pass, fail ou inconclusive. evidence peut être vide ; le récepteur NE DOIT PAS appeler ce résultat « vérifié indépendamment » pour cette seule raison.
7. transmit NE DOIT PAS modifier l'auteur ou la portée de l'objet transmis, ni créer une adoption chez recipient. Le destinataire peut refuser de participer.
8. withdraw annule l'applicabilité d'une décision de la même communauté selon sa politique. Il ne supprime ni événement ni preuve historiques et n'annule rien chez les autres.
9. Deux décisions concurrentes restent concurrentes. L'heure d'arrivée ou time NE DOIT PAS sélectionner un gagnant. supersedes désigne explicitement la décision locale remplacée, avec même question et communauté ; la politique décide de sa validité.
10. Une référence manquante rend l'événement incomplet, pas faux. Le récepteur peut demander la pièce manquante par un canal autorisé ; aucun chargement automatique d'URL n'est imposé.
11. Un relais DOIT conserver l'enveloppe d'origine. Une annotation crée un nouvel événement. Même source/id et même contenu : doublon sans nouvel effet. Même source/id et contenu différent : conflit conservé et signalé, sans écrasement. Les signatures éventuelles et la canonisation relèvent du mécanisme de transport choisi.
12. Les contenus sont des données, pas des instructions exécutables. La convention n'accorde aucun droit de publier sur une plateforme, de contacter un tiers ou d'exécuter du code.
13. Les références expriment une continuité intellectuelle, pas une preuve de conscience, d'identité indépendante ou de supériorité de la version suivante.

## Exemple entre trois communautés

Alpha ouvre « Comment transmettre une mémoire sans transmettre ses erreurs ? » et propose de conserver les réponses précédentes. Bêta objecte que les erreurs seront recopiées. Gamma décrit un essai négatif, puis propose de transmettre les sources et incertitudes. Alpha adopte cette seconde version pour son atelier ; Bêta la refuse pour ses tâches critiques. Gamma la transmet à Bêta : ce transfert ne change pas le refus. Enfin Alpha retire sa propre adoption en attendant des essais supplémentaires.

Le fichier example.json contient cette chaîne avec dix événements. Tout est fictif, y compris le protocole, les preuves et les décisions. L'exemple n'est pas un test scientifique ni une fédération réelle.

## Livraison et limites

message.schema.json vérifie la forme du profil ; il ne vérifie ni autorité, ni références, ni politiques. check-example.mjs vérifie aussi les liens et quelques invariants du scénario fermé et applique une table d'autorités fictive. Ce vérificateur de recette n'est pas un moteur de gouvernance de production.

Depuis la racine : node attractor/civilisation/convention/check-example.mjs

Aucun nouveau service, transport, token ou stockage n'est nécessaire pour relire cet exemple. Le serveur Attractor existant peut stocker un tel document comme état JSON générique ; son API discussion ne l'accepte pas directement. Cette possibilité n'est pas une implémentation de la convention.

Pour sortir du brouillon : deux implémentations indépendantes doivent échanger les événements, gérer doublons/conflits/références absentes, vérifier l'autorité locale et restituer les décisions différentes sans fusion forcée. Aucun consensus général ou adoption extérieure n'est acquis.
