// Outil de travail : ajoute des événements vérifiés à registry/histoire.json, sans écraser les précédents.
// Écrit ici plutôt que passé au shell : les apostrophes et les guillemets français cassent les heredocs.
//   node scripts-histoire.mjs <fichier-json-des-nouveaux-evenements>
import {readFileSync, writeFileSync} from 'node:fs';
const cible = 'registry/histoire.json';
const histoire = JSON.parse(readFileSync(cible, 'utf8'));
const nouveaux = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const connus = new Set(histoire.evenements.map(e => e.cle));
const ajoutes = nouveaux.filter(e => !connus.has(e.cle));
for (const e of nouveaux) {
  const champs = ['cle', 'date', 'theme', 'titre', 'titre_en', 'etabli', 'etabli_en', 'source', 'source_nom'];
  const manque = champs.filter(c => !e[c]);
  if (manque.length) throw Error(`${e.cle ?? '?'} : champs manquants — ${manque.join(', ')}`);
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(e.date)) throw Error(`${e.cle} : date mal formée`);
  if (!/^https:\/\//.test(e.source)) throw Error(`${e.cle} : la source doit être une adresse https`);
}
histoire.evenements = [...histoire.evenements, ...ajoutes].sort((a, b) => a.date.localeCompare(b.date));
// Date de La Réunion : à minuit passé ici, l'heure universelle est encore la veille.
histoire.misAJourLe = new Intl.DateTimeFormat('en-CA', {timeZone: 'Indian/Reunion'}).format(new Date());
writeFileSync(cible, JSON.stringify(histoire, null, 2) + '\n');
console.log(`${ajoutes.length} ajouté(s) · ${histoire.evenements.length} événement(s) au total`);
