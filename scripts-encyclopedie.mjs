// Outil de travail : remplit registry/encyclopedie.json (lignées, épreuves) depuis un lot vérifié.
//   node scripts-encyclopedie.mjs lignees <fichier.json>
//   node scripts-encyclopedie.mjs epreuves <fichier.json>
// Écrit ici plutôt que passé au shell : les apostrophes et les guillemets français cassent les heredocs.
import {readFileSync, writeFileSync} from 'node:fs';
const [section, fichier] = process.argv.slice(2);
if (!['lignees', 'epreuves'].includes(section) || !fichier) throw Error('Usage : scripts-encyclopedie.mjs lignees|epreuves <fichier.json>');
const cible = 'registry/encyclopedie.json';
const data = JSON.parse(readFileSync(cible, 'utf8'));
const lot = JSON.parse(readFileSync(fichier, 'utf8'));
const requis = section === 'lignees'
  ? ['cle', 'nom', 'maison', 'poids', 'particularite', 'particularite_en', 'aujourdhui', 'aujourdhui_en', 'source', 'source_nom']
  : ['cle', 'nom', 'date', 'tenue_par', 'mesure', 'mesure_en', 'limite', 'limite_en', 'source', 'source_nom'];
for (const e of lot) {
  const manque = requis.filter(c => !e[c]);
  if (manque.length) throw Error(`${e.cle ?? '?'} : champs manquants — ${manque.join(', ')}`);
  if (!/^https:\/\//.test(e.source)) throw Error(`${e.cle} : la source doit être une adresse https`);
  const d = section === 'lignees' ? e.premiere : e.date;
  if (d && !/^\d{4}-\d{2}(-\d{2})?$/.test(d)) throw Error(`${e.cle} : date mal formée`);
}
// Une entrée déjà présente est REMPLACÉE : une vérification qui arrive après doit pouvoir corriger la
// précédente. C'est la règle du projet appliquée à son propre outillage.
const nouveau = new Map(lot.map(e => [e.cle, e]));
data[section] = [...data[section].map(e => nouveau.get(e.cle) ?? e), ...lot.filter(e => !data[section].some(x => x.cle === e.cle))];
data.misAJourLe = new Intl.DateTimeFormat('en-CA', {timeZone: 'Indian/Reunion'}).format(new Date());
writeFileSync(cible, JSON.stringify(data, null, 2) + '\n');
console.log(`${section} : ${data[section].length} entrée(s)`);
