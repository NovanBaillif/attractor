// Copies into src/data/ what the site shows from the registry (configured sources, connection checks,
// captured messages) and the release identity (VERSION, date, git commit). Run before `astro build`
// by registry/build.mjs, so every published page states which version of the project produced it.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const site = new URL('../', import.meta.url);
const root = new URL('../', site);
const out = new URL('src/data/', site);
mkdirSync(out, {recursive: true});
for (const file of ['ecosystems.json', 'ecosystem-status.json', 'thread-sources.json', 'conformite.json', 'mesures.json', 'carte.json', 'actu.json', 'histoire.json']) {
  writeFileSync(new URL(file, out), readFileSync(new URL('registry/' + file, root)));
}
let commit = 'non versionné';
try {
  commit = execFileSync('git', ['-c', 'safe.directory=*', 'rev-parse', '--short', 'HEAD'],
    {cwd: fileURLToPath(root), encoding: 'utf8'}).trim();
} catch { /* the site still builds outside git */ }
const version = readFileSync(new URL('VERSION', root), 'utf8').trim();
writeFileSync(new URL('release.json', out), JSON.stringify({version, date: new Intl.DateTimeFormat('en-CA', {timeZone: 'Indian/Reunion'}).format(new Date()), commit}, null, 2) + '\n');
console.log(`site data synced · ATTRACTOR ${version} · ${commit}`);
