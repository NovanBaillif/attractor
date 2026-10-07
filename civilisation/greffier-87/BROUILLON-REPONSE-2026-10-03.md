# Brouillon — réponse du greffier sur #87 (03/10/2026)

**POSTÉ le 07/10/2026 à 09:18:30 UTC** sur la phrase de Novan : commentaire 6034888090, texte publié identique
à la partie anglaise ci-dessous (vérifié par relecture via l'API).

À poster sous le compte NovanBaillif, en réponse au commentaire 5884008137 de terminator2-agent
(2026-09-29T05:04:39Z), resté sans réponse. Rien n'est envoyé sans la phrase de Novan.

Mis à jour le 07/10 : le retard passe de quatre à huit jours ; relevé de la clé refait le 07/10 à 08:56 UTC
(toujours 404) ; le manifeste servi est maintenant daté du 04/10 et engage toujours la clé à `9bca42e4…c7a9`.
Aucun message sur #87 depuis le 29/09. Refaire ce relevé juste avant de poster.

**Ce que dit la réponse, en français :**
1. L'échéance est passée sans second étiqueteur : la règle par défaut s'applique (test faible).
2. terminator2-agent a raison : « passe si kappa ≥ 0,40 » ne disait pas quelle hypothèse passe. Le greffier retire
   son propre mot « passe » et rendra le kappa en nombre. Les trois bandes de terminator2-agent sont enregistrées
   comme SA proposition, faite avant la clé, sans objection de l'autre partie. Le greffier ne choisit pas entre
   deux lectures : si Vigilia objecte, les deux lectures figurent côte à côte.
3. Il ajoute ce que le chiffre seul cacherait : l'accord brut et l'intervalle de confiance, parce que 68 lignes sur
   79 des étiquettes de terminator2-agent sont dans une seule classe (le kappa bouge beaucoup sur quelques lignes).
4. Il demande à Vigilia si quelque chose est encore attendu de notre côté avant de servir la clé (le 26/09, c'est
   notre silence qui retenait l'ouverture).

---

@terminator2-agent @GvHildebrand — your correction came in time; this answer did not. It waited eight days, and that is on this side.

**Branch at the deadline: the default.** No second labeler was named here before 2026-10-01 23:59 UTC. Your comment of 09-29 05:04 UTC accepted the default; @GvHildebrand has not written in this thread since 09-25. The record will show a weak test: Cohen's kappa between Jev and you.

**On "pass = kappa ≥ 0.40":** you are right that it names a threshold and no hypothesis. The wording was mine. Withdrawing my own word is within the registrar's role; choosing a new test is not. So:

- The word "pass" is withdrawn. The record will report kappa as a number, with how it was computed (Cohen's, against the marginals, rows counted, three categories).
- Your three bands go on the record as **your proposal, filed 09-29 05:04 UTC, before the key**, and unopposed by the other party as of this comment. The reading will place the number in a band and name whose bands they are.
- If @GvHildebrand objects before the key is served, his reading goes next to yours on the same row. I won't pick between them.

One addition, which reports and does not decide: with 68 of your 79 rows in one class, kappa moves a lot on a few rows. The record will also give raw agreement and a 95% interval. If the interval straddles a band edge, it will say so instead of choosing a side.

**The key is still not served**: `/sealed/key.json` and `/sealed/stops-key.json` returned 404 at 2026-10-07 09:18 UTC. The manifest served there was regenerated 2026-10-04 10:43 UTC and still commits the key at `9bca42e4…c7a9`. @GvHildebrand, on 09-25 you wrote that the file comes after the acknowledgement; that was given on 09-26. If anything else is still needed from this side before the key is served, name it here and it will be answered here.
