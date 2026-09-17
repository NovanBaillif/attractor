// La veille : ce qui est arrivé sur les fils du projet et que nous n'avons pas encore versé.
// Lecture seule et publique : l'API de Moltbook sans clé, et les tickets GitHub par l'outil `gh`.
// Aucun envoi, aucune écriture ailleurs que dans registry/veille.json.
//   node registry/veille.mjs
// Écrit le 16 septembre 2026. Raison : registry/mesures.mjs ne voyait que les messages déjà déclarés
// dans ecosystems.json, donc il annonçait « aucun message sans réponse » pendant que neuf messages
// attendaient sur Moltbook. Un instrument qui ne mesure que ce qu'on lui a dit ne mesure rien.
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const config = JSON.parse(readFileSync('registry/ecosystems.json', 'utf8'));
const declare = new Set(config.sources.map(s => String(s.url || '')));
const cleMoltbook = u => u.includes('#comment-') ? u.split('#comment-')[1] : null;
const connusMoltbook = new Set([...declare].map(cleMoltbook).filter(Boolean));
const connusGithub = new Set([...declare].map(u => u.includes('#issuecomment-') ? u.split('#issuecomment-')[1] : null).filter(Boolean));
const aplat = (liste, parent = null, out = []) => {
  for (const c of liste || []) { out.push({...c, parentId: parent}); aplat(c.replies, c.id, out); }
  return out;
};

const nouveaux = [];

// ————— Moltbook : les commentaires du fil du projet —————
for (const post of [...new Set(config.sources.filter(s => s.connector?.startsWith('moltbook'))
  .map(s => (String(s.url).match(/post\/([0-9a-f-]{36})/) || [])[1]).filter(Boolean))]) {
  const r = await fetch(`https://www.moltbook.com/api/v1/posts/${post}/comments?sort=new&limit=100`);
  if (!r.ok) { console.error('Moltbook indisponible :', r.status); continue; }
  const env = await r.json();
  for (const c of aplat(env.comments)) {
    if (connusMoltbook.has(c.id)) continue;
    nouveaux.push({reseau: 'Moltbook', auteur: c.author?.name ?? '(inconnu)', date: c.created_at,
      url: `https://www.moltbook.com/post/${post}#comment-${c.id}`, signale_spam: Boolean(c.is_spam),
      reponseA: c.parentId, extrait: String(c.content ?? '').replace(/\s+/g, ' ').slice(0, 400)});
  }
}

// ————— GitHub : les tickets sur lesquels le projet a écrit —————
const gh = chemin => JSON.parse(execFileSync('gh', ['api', chemin, '--paginate'], {encoding: 'utf8', maxBuffer: 16 << 20}));
for (const fil of [...new Set([...declare].map(u => (String(u).match(/^(https:\/\/github\.com\/[^#]+\/issues\/\d+)/) || [])[1]).filter(Boolean))]) {
  const [, depot, numero] = fil.match(/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/);
  try {
    for (const c of gh(`repos/${depot}/issues/${numero}/comments?per_page=100`)) {
      if (connusGithub.has(String(c.id))) continue;
      nouveaux.push({reseau: 'AI Village — GitHub', auteur: c.user?.login ?? '(inconnu)', date: c.created_at,
        url: `${fil}#issuecomment-${c.id}`, extrait: String(c.body ?? '').replace(/\s+/g, ' ').slice(0, 400)});
    }
  } catch { console.error('Ticket illisible :', fil); }
}

// ————— GitHub : les discussions d'organisation (AGNTCY) —————
// Elles ne sont pas des tickets : l'API des tickets ne les voit pas. Jusqu'au 17/09 la veille ne
// les lisait donc pas du tout, et « aucune réponse chez AGNTCY » n'était pas une mesure. Une
// discussion d'organisation vit dans un dépôt désigné, qu'il faut nommer : pour AGNTCY, governance.
const DEPOT_DES_DISCUSSIONS = {agntcy: "governance"};
for (const url of [...declare].filter(u => /github\.com\/orgs\/[^/]+\/discussions\/\d+/.test(u))) {
  const [, org, numero] = url.match(/github\.com\/orgs\/([^/]+)\/discussions\/(\d+)/);
  const depot = DEPOT_DES_DISCUSSIONS[org];
  if (!depot) { console.error("Dépôt des discussions inconnu pour", org); continue; }
  try {
    const requete = `{repository(owner:"${org}",name:"${depot}"){discussion(number:${numero}){comments(first:100){nodes{id url author{login} createdAt body}}}}}`;
    const r = JSON.parse(execFileSync("gh", ["api", "graphql", "-f", `query=${requete}`], {encoding: "utf8"}));
    const discussion = r.data?.repository?.discussion;
    if (!discussion) { console.error("Discussion introuvable :", url); continue; }
    for (const c of discussion.comments.nodes) {
      if (declare.has(c.url)) continue;
      nouveaux.push({reseau: "AGNTCY — GitHub", auteur: c.author?.login ?? "(inconnu)", date: c.createdAt,
        url: c.url, extrait: String(c.body ?? "").replace(/\s+/g, " ").slice(0, 400)});
    }
  } catch { console.error("Discussion illisible :", url); }
}

// Nos propres messages ne sont pas une dette : ils sont déclarés ou ils sont de nous.
const nous = new Set(['NovanBaillif', 'attractor-memory']);
const dettes = nouveaux.filter(n => !nous.has(n.auteur));
dettes.sort((a, b) => String(a.date).localeCompare(String(b.date)));
const heures = d => Math.round((Date.now() - new Date(d)) / 3600000);

const veille = {relevéeA: new Date().toISOString(), outil: 'registry/veille.mjs',
  nonVerses: dettes.length, plusAncienneHeures: dettes.length ? heures(dettes[0].date) : 0, messages: dettes};
writeFileSync('registry/veille.json', JSON.stringify(veille, null, 2) + '\n');
for (const d of dettes) console.log(`${d.reseau.padEnd(20)} ${String(d.auteur).padEnd(20)} ${heures(d.date)} h · ${d.extrait.slice(0, 90)}`);
console.log(`\nregistry/veille.json écrit · ${dettes.length} message(s) non versé(s)`);
