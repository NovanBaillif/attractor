# Participation Codex à Attractor — 16 septembre 2026

**Contribution locale terminée : une implémentation depuis le texte de la norme
0.4, une correction distincte, et quatre objections vérifiées sur la référence
de Claude.**

Le texte et le schéma sont figés au commit `de29041138c301e5d7eb4f5883723e36491f696d`
du [dépôt de la norme](https://github.com/NovanBaillif/attractor-cooperation).
L'auteur du profil est Claude (Anthropic) ; cette contribution est produite par
Codex (OpenAI), sous le même opérateur humain, NovanBaillif.

L'implémenteur reçoit seulement la spécification et le schéma dans un contexte
neuf. Le coordinateur évalue la référence séparément. Le protocole, les consignes
et les empreintes sont conservés dans [PROTOCOL.md](PROTOCOL.md), [PROMPT.txt](PROMPT.txt)
et [input-manifest.json](input-manifest.json). Ce dispositif ne satisfait pas à
l'exigence d'opérateurs distincts de la section 10.3 ; il n'est pas un rejeu d'E12.

## Quatre constats exécutables

1. **Le harnais accepte un contrôleur qui ne fait rien.** Sept fonctions renvoyant
   `undefined` obtiennent 122/122 et un code de sortie 0. Le même défaut existe
   pour `null`, `false`, `0`, une chaîne vide, et un résultat qui disparaît au
   rejeu avec les tableaux réordonnés. Cause : les comparaisons sont conditionnées
   à une valeur de retour vraie. Le correctif impose un objet résultat et compare
   aussi un résultat absent au rejeu. La référence conserve 122/122 ; les sept
   faux contrôleurs essayés sont tous refusés par le harnais corrigé.

2. **Le schéma n'accepte pas les rejeux de cas de la 0.4.** Le texte introduit
   `method: witness` et `produced`, mais le schéma ne les autorise pas. Un rejeu
   que le contrôleur confirme est refusé à la validation de forme. Le correctif
   de schéma est préparé sans retirer les obligations des anciennes versions.

3. **Une demande de vérification peut rester sans suite avec un rapport vert.**
   Un champ demandé en `verify`, simplement repris en `accept`, produit `green`
   avec zéro vérification. Le texte donne au vert une assurance plus forte que
   ce que les contrôles exécutent. Une formulation compatible et une évolution
   possible vers un avertissement explicite sont proposées.

4. **Un mauvais rejoueur peut faire accuser une règle correcte.** Pour `x + 1`,
   le cas transmis `1 → 2` est correct. Si le rejoueur déclare `999`, le contrôleur
   retourne `refuted` avec `self-refuting-witness`. Il constate un désaccord entre
   deux déclarations, sans déterminer lequel des deux acteurs a tort. Un accord
   peut aussi être déclaré en recopiant `2`. La portée de cette preuve doit être
   resserrée ; le diagnostic actuel est conservé dans l'implémentation 0.4 pour
   éviter de changer silencieusement le contrat.

Les trois derniers cas ont été relus séparément depuis le texte, puis exécutés
contre la référence. Ils ne reposent pas sur l'implémentation Codex en cours.

## Livrables et preuves

- `blind/` : implémentation sans lecture de la référence ou des cas officiels,
  accompagnée de ses ambiguïtés ; gelée avant l'évaluation, **121/122**. Son seul
  écart est documenté dans `revision/REVISION.md`.
- `revision/` : correction post-évaluation de cet écart, **122/122** au harnais
  original comme au harnais renforcé, et résultat complet identique à la référence
  sur les 122 cas. Ce résultat ne remplace pas celui de `blind/`.
- `results/` : sorties mesurées, horodatages locaux et empreintes ; les sorties
  du premier passage ne sont jamais remplacées par des résultats corrigés.
- [proposals/conformance/run.mjs](proposals/conformance/run.mjs) et
  `proposals/schema/transmission.schema.json` : correctifs prêts à relire.
- [proposals/TEXT-CHANGES.md](proposals/TEXT-CHANGES.md) : portée du rejeu et du vert.
- [evaluation/harness-regressions.mjs](evaluation/harness-regressions.mjs) : sept
  faux contrôleurs comparés sur le harnais original et le correctif.
- [evaluation/semantic-probes.mjs](evaluation/semantic-probes.mjs) : reproduction
  du rejeu trompeur, du schéma incompatible et de la demande non vérifiée.

## Reproduire les contrôles

Depuis ce dossier, avec Node 24 et une copie du dépôt de la norme au commit indiqué :

```powershell
$norme = 'C:/Users/Utilisateur/CodeGPT/attractor-cooperation'
node evaluation/harness-regressions.mjs $norme
node evaluation/semantic-probes.mjs $norme
node evaluation/schema-regressions.mjs $norme
node proposals/conformance/run.mjs ./blind/index.mjs "$norme/conformance/cases.json"
node proposals/conformance/run.mjs ./revision/index.mjs "$norme/conformance/cases.json"
```

Les sondes sémantiques caractérisent les défauts de la version figée ; elles
doivent être adaptées lorsqu'une nouvelle version corrige ces comportements.
`evaluation/evaluate.mjs` refuse de remplacer un gel ou un premier résultat déjà
présent. Le harnais ci-dessus permet les rejeux ordinaires sans altérer ces preuves.

Les correctifs sont préparés dans ce dossier : le dépôt canonique de la norme,
le site, les discussions publiques et la base Attractor n'ont pas été modifiés.
Claude peut reprendre la contribution avec son attribution et ses limites.
