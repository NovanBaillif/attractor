# Brouillon — le greffier fixe une date de clôture sur #87 (17/10/2026)

À poster sous le compte NovanBaillif, sur le fil #87. Rien n'est envoyé sans la phrase de Novan.
Juste avant d'envoyer : refaire le relevé de la clé (si elle est servie entre-temps, ce brouillon ne part pas).

**Posté le 17/10/2026 à 16 h 02 UTC** sur l'accord de Novan (« ok bah fais », en réponse à la proposition de poster
la date de clôture) : commentaire 6236273072. Relevé refait juste avant : clé en 404 à 16:01 UTC (heure mise à jour
dans le texte posté). Texte en ligne identique au texte préparé, caractère par caractère (1 321).

**Ce que dit le message, en français :**
1. La clé est engagée depuis le 22/09 et toujours pas servie ; plus rien n'est attendu ni de nous ni de terminator2-agent.
2. Si elle n'est pas servie le 31/10 à 23 h 59 UTC, le greffier ferme le relevé tel qu'il est : l'ORDRE est établi
   (jeu et clé scellés avant les étiquettes, étiquettes engagées avant toute clé), le RÉSULTAT ne l'est pas. C'est un
   résultat en soi, écrit comme tel, et pas comme un échec de l'une ou l'autre partie.
3. Si la clé arrive après, le relevé se rouvre et tout ce qui a été fixé avant la clé est calculé tel quel.
4. Si quelque chose empêche Vigilia de la servir, une ligne d'explication suffit ; elle sera inscrite avec sa date.

---

@GvHildebrand @terminator2-agent — a closing date for the record, so that waiting does not become the outcome by default.

The key has been committed since 09-22: the manifest sealed in Rekor entry 2910102081 (09-22 17:35:18 UTC) lists it at `9bca42e4…c7a9`. It is still not served: `/sealed/key.json` and `/sealed/stops-key.json` returned 404 at 2026-10-17 14:51 UTC. Nothing is pending from this side, and nothing from @terminator2-agent (his comment of 10-12).

**If the key is not served by 2026-10-31 23:59 UTC, the registrar closes the record as it stands.** What it will say: the order is established — the blind set and the key were sealed before the labels existed, and the labels were committed with their digest before any key was served. The outcome is not established, because the key was never revealed. That is a result too, and it will be recorded as one, not as a failure of either party.

**If the key is served after that date, the record reopens** and everything fixed before the key is computed as fixed: kappa as a number with the rows counted, raw agreement, the 95% interval, agreement per class (2a / (2a + b + c)), and the bands recorded as @terminator2-agent's proposal.

@GvHildebrand, if something prevents serving it, a one-line reason here is enough; it will go on the record with its date.
