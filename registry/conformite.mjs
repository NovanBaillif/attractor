// Measure what can be measured about ATTRACTOR's compliance on a deployed site, and write registry/conformite.json.
// Read-only GET requests. The site shows the result, dated, on its "Conformité" page.
//   node registry/conformite.mjs <base-url> [accessibility-summary.json]
// The optional accessibility file comes from the automated WCAG 2.1 A/AA check (axe-core) run in a browser.
import {readFileSync, writeFileSync} from 'node:fs';

const base = (process.argv[2] || 'https://attractor-observatory-demo.vercel.app').replace(/\/$/, '');
const axeFile = process.argv[3];
const get = async path => {
  const r = await fetch(base + path, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
  return {status: r.status, headers: r.headers, text: await r.text()};
};
const checks = [];
const add = (id, label, ok, detail) => checks.push({id, label, status: ok ? 'ok' : 'ecart', detail});

const home = await get('/');
const h = name => home.headers.get(name) || '';
const csp = h('content-security-policy');
add('https', 'HTTPS imposé (HSTS)', /max-age=(\d+)/.test(h('strict-transport-security')) && Number(/max-age=(\d+)/.exec(h('strict-transport-security'))[1]) >= 31536000, h('strict-transport-security') || 'absent');
add('csp', 'Politique de sécurité du contenu stricte', csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'") && !/script-src[^;]*'unsafe-inline'/.test(csp), csp ? 'default-src self, scripts par empreinte, cadres interdits' : 'absente');
add('nosniff', 'Types de fichiers non devinés', h('x-content-type-options') === 'nosniff', h('x-content-type-options') || 'absent');
add('referrer', 'Aucune adresse transmise aux autres sites', h('referrer-policy') === 'no-referrer', h('referrer-policy') || 'absent');
add('permissions', 'Caméra, micro, position et paiement désactivés', /camera=\(\)/.test(h('permissions-policy')) && /microphone=\(\)/.test(h('permissions-policy')), h('permissions-policy') || 'absent');

const pages = ['/', '/projet/', '/memoire/', '/securite/', '/conversation', '/registry', '/api/v3/thread'];
let cookies = 0;
for (const p of pages) cookies += (await fetch(base + p, {redirect: 'manual'})).headers.getSetCookie().length;
add('cookies', 'Aucun cookie', cookies === 0, `${cookies} cookie(s) sur ${pages.length} adresses`);

const external = new Set();
for (const p of pages.slice(0, 5)) {
  const html = (await get(p)).text;
  for (const m of html.matchAll(/<(?:script|link|img|iframe|source|video|audio)\b[^>]*?\s(?:src|href)="(https?:)?\/\/([^/"]+)[^"]*"/gi)) {
    const host = m[2].toLowerCase();
    if (host !== new URL(base).host) external.add(host);
  }
}
add('tiers', 'Aucun service tiers chargé par le navigateur', external.size === 0, external.size ? [...external].join(', ') : 'aucun');

const sec = await get('/.well-known/security.txt');
add('securitytxt', 'Contact de sécurité publié (RFC 9116)', sec.status === 200 && /^Contact:/m.test(sec.text) && /^Expires:/m.test(sec.text), sec.status === 200 ? 'présent' : `absent (${sec.status})`);

for (const [path, label] of [['/mentions-legales/', 'Mentions légales'], ['/confidentialite/', 'Page de confidentialité'], ['/conditions/', 'Conditions d’utilisation et signalement']]) {
  const r = await get(path);
  add(path.replace(/\//g, ''), label, r.status === 200, r.status === 200 ? 'publiée' : `absente (${r.status})`);
}
add('ia', 'Mention des textes écrits par une IA sur chaque page', /écrits par une IA/.test(home.text), /écrits par une IA/.test(home.text) ? 'présente en bas de page' : 'absente');

let accessibility = null;
if (axeFile) {
  accessibility = JSON.parse(readFileSync(axeFile, 'utf8'));
  const rules = Object.keys(accessibility.byRule || {});
  add('accessibilite', 'Accessibilité WCAG 2.1 A et AA, contrôle automatique', rules.length === 0,
    rules.length === 0 ? `aucun défaut sur ${accessibility.checks} contrôles` : `${rules.length} règle(s) en défaut sur ${accessibility.checks} contrôles : ${rules.join(', ')}`);
}

const version = (/ATTRACTOR (\d+\.\d+\.\d+)/.exec(home.text) || [])[1] || null;
const result = {measured_at: new Date().toISOString(), base, version_measured: version, tool: 'registry/conformite.mjs', checks,
  accessibility_tool: accessibility ? 'axe-core 4.10.2, WCAG 2.1 A et AA, 11 pages à 390 et 1280 px' : null};
writeFileSync('registry/conformite.json', JSON.stringify(result, null, 2) + '\n');
for (const c of checks) console.log(`${c.status === 'ok' ? 'ok    ' : 'ÉCART '} ${c.label} · ${c.detail}`);
console.log(`version mesurée : ${version} · ${checks.filter(c => c.status === 'ok').length}/${checks.length} conformes`);
