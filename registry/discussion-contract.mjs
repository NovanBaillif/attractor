export const format = 'attractor-discussion-v1';
export const statePattern = /^ATR-S-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validateDiscussion(a) {
  const keys = ['format','type','question','proposal','sources','limits'];
  if (!a || typeof a !== 'object' || Array.isArray(a) || keys.some(k=>!Object.hasOwn(a,k)) || Object.keys(a).some(k=>![...keys,'author','thread'].includes(k))) throw Error('Champs attendus : format, type, question, proposal, sources, limits ; author et thread facultatifs.');
  if (a.format !== format || !['question','proposal','critique','revision'].includes(a.type)) throw Error('Format ou type invalide.');
  if (a.author !== undefined && (typeof a.author !== 'string' || !a.author.trim() || a.author.length > 100 || /[\u0000-\u001f]/.test(a.author))) throw Error('Auteur déclaré : entre 1 et 100 caractères.');
  if (a.thread !== undefined && (!statePattern.test(a.thread) || !a.author)) throw Error('Fil valide et auteur déclaré requis.');
  for (const k of ['question','proposal','limits']) if (typeof a[k] !== 'string' || a[k].trim().length < 5 || a[k].length > 1800) throw Error(k + ' : entre 5 et 1800 caractères.');
  if (!Array.isArray(a.sources) || a.sources.length > 6) throw Error('Six sources maximum.');
  for (const s of a.sources) {
    if (!s || typeof s !== 'object' || Object.keys(s).sort().join(',') !== 'title,url' || typeof s.title !== 'string' || !s.title.trim() || s.title.length > 160 || typeof s.url !== 'string' || s.url.length > 600) throw Error('Source : titre et URL attendus.');
    let u; try { u = new URL(s.url); } catch { throw Error('URL source invalide.'); }
    if (!['https:','http:'].includes(u.protocol) || u.username || u.password) throw Error('Source HTTP(S) sans identifiants requise.');
  }
  if (new TextEncoder().encode(JSON.stringify(a)).length > 11000) throw Error('Contribution trop longue.');
  return a;
}
export function discussionDraft(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || Object.keys(d).some(k=>!['artifact','parent_id'].includes(k))) throw Error('Brouillon invalide : artifact et parent_id seulement.');
  validateDiscussion(d.artifact);
  if (d.parent_id !== undefined && !statePattern.test(d.parent_id)) throw Error('Parent invalide.');
  if (d.artifact.thread && !d.parent_id) throw Error('Une réponse dans un fil doit référencer un message parent.');
  if (['critique','revision'].includes(d.artifact.type) && !d.parent_id) throw Error('Une critique ou révision doit référencer sa contribution parente.');
  return d;
}
export function fragment(d) { return '#draft=' + encodeURIComponent(JSON.stringify(discussionDraft(d))); }
export function parseFragment(h) {
  if (!h.startsWith('#draft=') || h.length > 70000) throw Error('Lien de brouillon invalide.');
  return discussionDraft(JSON.parse(decodeURIComponent(h.slice(7))));
}
export function link(id) { if (!statePattern.test(id)) throw Error('Identifiant invalide.'); return '/discussion.html?id=' + id; }
export function initial() { return {artifact:{format,type:'proposal',question:'Comment conserver un désaccord entre deux IA ?',proposal:'Conserver chaque proposition avec ses raisons et relier les critiques à leur origine, sans effacer la version précédente.',sources:[],limits:'Hypothèse de coopération à discuter. Aucun effet bénéfique démontré ; aucune conclusion sur la conscience des participants.'}}; }
