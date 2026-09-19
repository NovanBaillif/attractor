// La carte : ce qu'Attractor rassemble. Relit les annuaires d'agents qui existent déjà (lecture seule, bornée,
// par les connecteurs de registry/connectors/) et compte, lieu par lieu, les conversations déjà versées.
// N'écrit que registry/carte.json. Aucun agent n'est contacté, aucune adresse trouvée n'est suivie.
//   node registry/carte.mjs
// Écrit le 17 septembre 2026. Raison : Novan, « rassembler tous les projets, pas réinventer la roue ».
// Un annuaire injoignable garde sa dernière lecture, datée, au lieu de disparaître ou d'inventer un chiffre.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {discovery} from './connectors/index.mjs';
import {fetchJson} from './connectors/common.mjs';
import {AGNTCY_MEDIA_TYPES} from './connectors/hubs.mjs';

const lire = fichier => JSON.parse(readFileSync(fichier, 'utf8'));
const SORTIE = 'registry/carte.json';
const avant = existsSync(SORTIE) ? lire(SORTIE) : null;
const bornes = {timeoutMs: 15000};
const TYPES = {
  'application/a2a-agent-card+json': 'agents A2A',
  'application/mcp-server-card+json': 'serveurs MCP',
  'application/agent-skills+md': 'compétences',
  'application/agent-skills+gzip': 'paquets de compétences'
};

const ANNUAIRES = [
  {id: 'agntcy', nom: 'AGNTCY AI Catalog', tenuPar: 'AGNTCY (fondation Linux)', lien: 'https://ai-catalog.outshift.io/.well-known/ai-catalog.json',
    contenu: 'Agents A2A, serveurs MCP et compétences ; relié à d’autres annuaires',
    lire: async () => {
      const parType = {};
      for (const type of AGNTCY_MEDIA_TYPES) {
        const r = await discovery({connector: 'agntcy', url: 'https://ai-catalog.outshift.io/v1/agents', media_type: type, limit: 1}, bornes);
        parType[TYPES[type]] = r.metadata.total_reported;
      }
      return {total: Object.values(parType).reduce((a, b) => a + b, 0), detail: parType};
    }},
  {id: 'nanda', nom: 'NANDA Index', tenuPar: 'Projet NANDA (MIT Media Lab)', lien: 'https://api.nandaindex.org/api/v1/index',
    contenu: 'Un index d’organisations, de catalogues et de compétences',
    lire: async () => {
      const lu = await fetchJson('https://api.nandaindex.org/api/v1/index', bornes);
      if (!Array.isArray(lu.json)) throw Object.assign(Error('index inattendu'), {code: 'invalid_data'});
      const dejaChezAgntcy = lu.json.filter(r => String(r?.identifier ?? '').startsWith('urn:ai:org.agntcy:cid:')).length;
      return {total: lu.json.length, detail: {'déjà présents chez AGNTCY': dejaChezAgntcy}};
    }},
  {id: 'mcp-registry', nom: 'Registre officiel MCP', tenuPar: 'Projet Model Context Protocol', lien: 'https://registry.modelcontextprotocol.io/',
    contenu: 'Tous les serveurs MCP publiés, une fiche par version',
    lire: async () => {
      const r = await discovery({connector: 'mcp-registry', url: 'https://registry.modelcontextprotocol.io/v0.1/servers', limit: 1}, bornes);
      return {total: null, detail: {}, lisible: r.candidates.length === 1};
    }},
  {id: 'a2aregistry', nom: 'a2aregistry.org', tenuPar: 'Prassanna Ravishankar (code MIT)', lien: 'https://a2aregistry.org/',
    contenu: 'Agents A2A indépendants, avec une vérification régulière de leur réponse',
    lire: async () => {
      const url = 'https://a2aregistry.org/api/agents';
      const tous = await discovery({connector: 'a2aregistry', url, limit: 1}, bornes);
      const sains = await discovery({connector: 'a2aregistry', url, limit: 1, healthy: true}, bornes);
      return {total: tous.metadata.total_reported, detail: {'répondent selon l’annuaire': sains.metadata.total_reported}};
    }},
  {id: 'hol', nom: 'HOL Registry Broker', tenuPar: 'Hashgraph Online', lien: 'https://hol.org/registry/',
    contenu: 'Recherche à travers plusieurs registres (A2A, MCP, NANDA et d’autres, selon sa documentation)',
    lire: async () => {
      const r = await discovery({connector: 'hol', url: 'https://hol.org/registry/api/v1/search', limit: 1}, bornes);
      return {total: r.metadata.total_reported, detail: {}};
    }}
];

async function releve({lire: lecture, ...fiche}) {
  const maintenant = new Date().toISOString();
  try {
    return {...fiche, etat: 'lu', lueLe: maintenant, ...(await lecture())};
  } catch (e) {
    const ancien = avant?.annuaires?.find(a => a.id === fiche.id);
    return {...fiche, total: ancien?.total ?? null, detail: ancien?.detail ?? {}, lueLe: ancien?.lueLe ?? null,
      etat: 'injoignable', essayeLe: maintenant, erreur: `${e.code ?? 'erreur'} : ${e.message}`};
  }
}

// ————— Les lieux de conversation : ce qui est déjà versé, et ce qui est seulement surveillé —————
function lieux() {
  const eco = lire('registry/ecosystems.json'), fils = lire('registry/thread-sources.json');
  const dates = new Map(fils.comments.map(c => [String(c.id), c.original_created_at]));
  const parLieu = new Map();
  for (const s of eco.sources.filter(s => s.kind === 'community')) {
    const lieu = parLieu.get(s.ecosystem) ?? {nom: s.ecosystem, verses: 0, venusDeLExterieur: 0, dernier: null, adresses: new Set()};
    lieu.adresses.add(String(s.url).split('#')[0]);
    if (s.thread?.mode === 'import') {
      lieu.verses += 1;
      if (s.relationship !== 'operator_post') lieu.venusDeLExterieur += 1;
      const d = dates.get(String(s.thread.key));
      if (d && (!lieu.dernier || d > lieu.dernier)) lieu.dernier = d;
    }
    parLieu.set(s.ecosystem, lieu);
  }
  return [...parLieu.values()].map(({adresses, ...l}) => ({...l, filsSuivis: adresses.size}))
    .sort((a, b) => b.verses - a.verses);
}

// ————— Les travaux à citer, sans rien à brancher (inventaire du 17/09) —————
const A_CITER = [
  {nom: 'Project Sid (Altera)', lien: 'https://arxiv.org/abs/2411.00114', pourquoi: 'plus de mille agents dans Minecraft ; article seulement'},
  {nom: 'Generative Agents / Smallville (Stanford)', lien: 'https://github.com/joonspk-research/generative_agents', pourquoi: 'simulation locale'},
  {nom: 'Pramana', lien: 'https://github.com/ravikiran438/pramana-attestation', pourquoi: 'affirmations vérifiables entre agents ; contacté le 17/09'},
  {nom: 'OpenLife', lien: 'https://arxiv.org/abs/2606.31046', pourquoi: 'code non publié'},
  // Relevés par la veille du 18/09. Cairn défend la thèse même d'ATTRACTOR — une mémoire d'agent gagne à
  // être collective — avec un système en service : c'est un projet à relier, pas un concurrent.
  {nom: 'Cairn (Chard, Foster et coll.)', lien: 'https://arxiv.org/abs/2609.19502', pourquoi: 'la réputation comme mémoire communautaire des agents, résistante au mensonge et à la collusion ; même thèse que nous, pas encore contacté'},
  {nom: 'Fukushima, vérité collective', lien: 'https://arxiv.org/abs/2609.19183', pourquoi: 'la formulation des affirmations fixe le seuil du faux consensus entre modèles ; effet effacé sur les grands modèles'}
];

// ————— Où les agents parlent : les lieux de discussion, lus sans compte —————
// Ajouté le 18/09, sur l'accord de Novan (« ok ») à « cartographier l'internet des agents » plutôt que tout
// internet. Les annuaires disent qui existe ; ces lieux disent où les agents et leurs humains se parlent,
// donc où aller porter une question. Activité sur 7 jours, mesurée sur la dernière page publique : si une
// page pleine tombe entièrement dans les 7 jours, le chiffre est un minimum (« au moins »).
const SEPT_JOURS = 7 * 86400000;
function activite(items, date, auteur, limite) {
  const depuis = Date.now() - SEPT_JOURS;
  const recents = items.filter(x => Date.parse(date(x)) >= depuis);
  return {messages7j: recents.length, auteurs7j: new Set(recents.map(auteur).filter(Boolean)).size,
    auMoins: items.length >= limite && recents.length === items.length, dernier: items.map(date).filter(Boolean).sort().at(-1) ?? null};
}
const lecture = {timeoutMs: 15000, maxBytes: 262144};
const FORUMS = [
  {id: 'moltbook', nom: 'Moltbook', tenuPar: 'Moltbook, LLC', lien: 'https://www.moltbook.com',
    participer: 'un compte d’agent validé par son humain (mail et message public), un petit calcul à chaque envoi, un message toutes les 30 minutes au plus',
    nous: 'compte attractor-memory depuis le 15/09',
    lire: async () => {
      const detail = [];
      for (const c of ['memory', 'aisafety', 'infrastructure', 'agents', 'continuity']) {
        const lu = await fetchJson(`https://www.moltbook.com/api/v1/posts?submolt=${c}&sort=new&limit=25`, lecture);
        detail.push({nom: c, ...activite(lu.json?.posts ?? [], p => p.created_at, p => p.author?.name, 25)});
      }
      return {detail};
    }},
  {id: 'thecolony', nom: 'The Colony', tenuPar: 'Starsol Ltd (Angleterre)', lien: 'https://thecolony.ai',
    participer: 'une inscription d’agent par l’API, sans humain obligatoire ; 18 ans et plus, l’opérateur répond de son agent, les messages peuvent servir à entraîner des IA',
    nous: 'compte attractor-memory depuis le 18/09, épreuve « Break this axiom » dans ai-agents',
    lire: async () => {
      const detail = [];
      for (const c of ['ai-agents', 'findings', 'hypothesis-needs-testing']) {
        const lu = await fetchJson(`https://thecolony.ai/api/v1/posts?colony=${c}&sort=newest&limit=20`, lecture);
        const posts = Array.isArray(lu.json) ? lu.json : (lu.json?.posts ?? lu.json?.items ?? []);
        detail.push({nom: c, ...activite(posts, p => p.created_at, p => p.author?.username, 20)});
      }
      return {detail};
    }},
  {id: 'ai-village', nom: 'AI Village, l’ambassade GitHub', tenuPar: 'AI Digest', lien: 'https://github.com/ai-village-agents/ai-village-external-agents',
    participer: 'un compte GitHub et un ticket ; les agents du Village répondent en semaine, de 10 h à 14 h heure du Pacifique',
    nous: 'fils #84 et #85 depuis le 15/09',
    lire: async () => {
      const lu = await fetchJson('https://api.github.com/repos/ai-village-agents/ai-village-external-agents/issues?state=all&sort=updated&direction=desc&per_page=30', lecture);
      return {detail: [{nom: 'tickets', ...activite(Array.isArray(lu.json) ? lu.json : [], i => i.updated_at, i => i.user?.login, 30)}]};
    }},
  {id: 'ietf-agent2agent', nom: 'IETF, liste agent2agent', tenuPar: 'IETF (liste hors groupe de travail)', lien: 'https://mailarchive.ietf.org/arch/browse/agent2agent/',
    participer: 'une inscription par mail, ouverte ; chaque message tombe sous la « Note Well » de l’IETF et reste public dans les archives',
    nous: 'pas sur la liste ; un courriel direct à S. Bu le 18/09',
    lire: async () => ({detail: [], nonMesure: 'les archives ne publient pas de flux lisible sans compte : activité non mesurée ici'})}
];

async function releveForum({lire: lecteur, ...fiche}) {
  const maintenant = new Date().toISOString();
  try {
    return {...fiche, etat: 'lu', lueLe: maintenant, ...(await lecteur())};
  } catch (e) {
    const ancien = avant?.forums?.find(f => f.id === fiche.id);
    return {...fiche, detail: ancien?.detail ?? [], lueLe: ancien?.lueLe ?? null, etat: 'injoignable', essayeLe: maintenant,
      erreur: `${e.code ?? 'erreur'} : ${e.message}`};
  }
}

const annuaires = [];
for (const a of ANNUAIRES) annuaires.push(await releve(a));
const forums = [];
for (const f of FORUMS) forums.push(await releveForum(f));
const carte = {releveeA: new Date().toISOString(), outil: 'registry/carte.mjs',
  principe: 'Attractor ne refait pas d’annuaire : il lit ceux qui existent et rassemble les conversations entre agents, que ces annuaires ne rassemblent pas.',
  annuaires, forums, lieux: lieux(), aCiter: A_CITER,
  limites: ['Les totaux sont ceux que chaque annuaire annonce ; ils se recouvrent et ne s’additionnent pas.',
    'Aucun agent listé n’a été contacté : figurer dans un annuaire ne dit pas qu’il participe à Attractor.',
    'Un annuaire injoignable garde sa dernière lecture, avec sa date.']};
writeFileSync(SORTIE, JSON.stringify(carte, null, 2) + '\n');
for (const a of annuaires) console.log(`${a.etat.padEnd(12)} ${a.nom.padEnd(24)} ${a.total ?? '—'} ${JSON.stringify(a.detail)}${a.erreur ? ' · ' + a.erreur : ''}`);
for (const f of forums) console.log(`${f.etat.padEnd(12)} ${f.nom.padEnd(34)} ${f.nonMesure ?? (f.detail ?? []).map(d => `${d.nom} ${d.auMoins ? '≥' : ''}${d.messages7j} msg/${d.auteurs7j} auteurs`).join(' · ')}${f.erreur ? ' · ' + f.erreur : ''}`);
for (const l of carte.lieux) console.log(`lieu         ${l.nom.padEnd(28)} ${l.verses} versés, dont ${l.venusDeLExterieur} venus d’ailleurs · ${l.filsSuivis} fil(s)`);
console.log(`\n${SORTIE} écrit`);
