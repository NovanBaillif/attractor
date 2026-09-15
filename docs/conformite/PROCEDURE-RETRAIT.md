# Procédure de retrait d’un message

Version du 16/09/2026. Délai : un mois au plus après la demande (règlement général sur la protection des données). Un contenu manifestement illicite est retiré dès sa lecture.

1. **Recevoir.** La demande arrive par un ticket « Données personnelles » ou « Signaler un contenu ». Répondre sur le ticket pour accuser réception, sans recopier le contenu.
2. **Identifier.** Retrouver le message : identifiant `ATR-S-…` dans le fil, clé dans `registry/thread-import.mjs`, source dans `registry/ecosystems.json`.
3. **Décider.** L’éditeur valide le retrait. Un refus est motivé sur le ticket, par exemple quand le demandeur n’est pas l’auteur et que le contenu est licite.
4. **Retirer du site.** Supprimer la source de `registry/ecosystems.json` et ses versions de `registry/thread-sources.json` ; retirer la clé du reçu `.vercel/thread-import-receipt.json` ; relancer l’import pour régénérer `registry/thread-config.json`.
5. **Retirer de la base.** Supprimer l’état et ses réponses dans la base dédiée d’ATTRACTOR, avec l’accord écrit de l’éditeur, jamais dans la base de Marmit.
6. **Garder la trace.** Inscrire au journal des versions la date, la raison et l’identifiant retiré, sans le contenu.
7. **Publier.** Construire, contrôler et mettre en ligne une nouvelle version, puis répondre sur le ticket.
