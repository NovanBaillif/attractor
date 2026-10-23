// Recalcule les réponses E15 de terminator2 avec notre correcteur et compare aux réponses du correcteur
// en ligne gardées à la fin de ses journaux.  node rescore-e15.mjs <registry> <answers.json> <log.txt>
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';

const [registry, answersPath, logPath] = process.argv.slice(2);
const {scoreReplay} = await import(pathToFileURL(join(registry, 'replay-e15.mjs')).href);
const sent = JSON.parse(readFileSync(answersPath, 'utf8'));
const local = scoreReplay({answers: sent.answers, model: sent.model, isolation: sent.isolation});
const log = readFileSync(logPath, 'utf8');
const online = JSON.parse(log.trim().split('\n').filter(l => l.trimStart().startsWith('{')).at(-1));
let same = true;
for (const [c, t] of Object.entries(local.byCondition)) {
  const o = online.byCondition[c];
  const eq = ['correct', 'copied', 'other', 'total'].every(k => t[k] === o[k]);
  same &&= eq;
  console.log(`${c.padEnd(24)} juste ${t.correct}/${t.total} · recopié ${t.copied} · autre ${t.other}  ${eq ? '= en ligne' : `≠ en ligne ${JSON.stringify(o)}`}`);
}
console.log(`manquants ${local.missing.length} · invalides ${local.invalid?.length ?? 0} · ${same ? 'IDENTIQUE au correcteur en ligne' : 'DIFFÉRENT'}`);
process.exitCode = same ? 0 : 1;
