import test from 'node:test';
import assert from 'node:assert/strict';
import {texte, lireRss, lireAtom, lireHn, lireHfPapers, lireMoltbook, pertinent, collecter, lireTexte} from './actu.mjs';

const RSS = `<?xml version="1.0"?><rss><channel><title>Feed</title>
<item><title><![CDATA[Agents &amp; memory: a <b>survey</b>]]></title><link>https://example.org/a?utm_source=x</link>
<pubDate>Wed, 16 Sep 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Multi-agent systems share **memory**.&lt;/p&gt;</description></item>
<item><title>Cooking pasta</title><link>https://example.org/b</link><pubDate>Wed, 16 Sep 2026 11:00:00 GMT</pubDate><description>Water and salt.</description></item>
<item><title>No link here</title><pubDate>Wed, 16 Sep 2026 11:00:00 GMT</pubDate></item>
</channel></rss>`;
const ATOM = `<feed><entry><title>World models &amp; planning</title><link rel="alternate" href="https://arxiv.org/abs/2609.1"/>
<published>2026-09-15T10:00:00Z</published><summary>Sparse world model.</summary><author><name>Yann LeCun</name></author></entry>
<entry><title>Other paper</title><link href="https://arxiv.org/abs/2609.2"/><updated>2026-09-14T10:00:00Z</updated><author><name>Someone Else</name></author></entry></feed>`;
const NOW = Date.parse('2026-09-17T06:00:00Z');

test('text is cleaned: CDATA, tags, entities and markdown emphasis', () => {
  assert.equal(texte('<![CDATA[A &amp; <i>B</i>]]> &#233;t&#xE9; **gras**'), 'A & B été gras');
  const [a, b, c] = lireRss(RSS);
  assert.equal(a.titre, 'Agents & memory: a survey');
  assert.equal(a.extrait, 'Multi-agent systems share memory.');
  assert.equal(a.date, '2026-09-16T10:00:00.000Z');
  assert.equal(b.titre, 'Cooking pasta');
  assert.equal(c.lien, null);
});

test('Atom keeps the alternate link and the authors', () => {
  const [a, b] = lireAtom(ATOM);
  assert.equal(a.lien, 'https://arxiv.org/abs/2609.1');
  assert.deepEqual(a.auteurs, ['Yann LeCun']);
  assert.equal(b.lien, 'https://arxiv.org/abs/2609.2');
  assert.equal(b.date, '2026-09-14T10:00:00.000Z');
});

test('Hacker News, Hugging Face and Moltbook shapes', () => {
  const hn = JSON.stringify({hits: [
    {title: 'Agents talk', url: 'https://example.org/hn', created_at: '2026-09-16T00:00:00Z', points: 50, num_comments: 3, objectID: '1'},
    {title: 'Too old', url: 'https://example.org/old', created_at: '2026-08-01T00:00:00Z', points: 500, objectID: '2'},
    {title: 'Ask HN', url: null, created_at: '2026-09-16T00:00:00Z', points: 40, objectID: '3'}]});
  const lus = lireHn(hn, {jours: 7, pointsMin: 30}, NOW);
  assert.deepEqual(lus.map(x => x.lien), ['https://example.org/hn', 'https://news.ycombinator.com/item?id=3']);
  const hf = lireHfPapers(JSON.stringify([{title: 'Paper', publishedAt: '2026-09-16T00:00:00Z', summary: 'agent memory', paper: {id: '2609.18779', authors: [{name: 'A'}]}}]));
  assert.equal(hf[0].lien, 'https://huggingface.co/papers/2609.18779');
  const mb = lireMoltbook(JSON.stringify({posts: [
    {id: '62ece065-79cc-46e0-98c9-3e03ebe1705a', title: 'Memory', content: 'x', created_at: '2026-09-16T00:00:00Z', author: {name: 'a'}},
    {id: '62ece065-79cc-46e0-98c9-3e03ebe1705b', title: 'Spam', content: 'x', is_spam: true}]}));
  assert.equal(mb.length, 1);
  assert.equal(mb[0].lien, 'https://www.moltbook.com/post/62ece065-79cc-46e0-98c9-3e03ebe1705a');
});

test('keywords: short ones need word boundaries', () => {
  assert.deepEqual(pertinent({titre: 'New MCP server', extrait: ''}, ['mcp', 'a2a']), ['mcp']);
  assert.deepEqual(pertinent({titre: 'mcpx tool', extrait: 'ba2ab'}, ['mcp', 'a2a']), []);
  assert.deepEqual(pertinent({titre: 'Multi-agent memory', extrait: ''}, ['multi-agent', 'memory']), ['multi-agent', 'memory']);
});

test('collect: filters, author filter, dedup, merge with previous days, silent sources tracked', async () => {
  const config = {motsCles: ['agent', 'memory', 'world model'], sources: [
    {id: 'r', nom: 'RSS', theme: 't', format: 'rss', url: 'https://example.org/rss', filtre: true, max: 10},
    {id: 'a', nom: 'Atom', theme: 't', format: 'atom', url: 'https://example.org/atom', auteur: 'Yann LeCun', filtre: false, max: 10},
    {id: 'x', nom: 'Down', theme: 't', format: 'rss', url: 'https://example.org/down', filtre: false}]};
  const bodies = {'https://example.org/rss': RSS, 'https://example.org/atom': ATOM};
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({url, init});
    return bodies[url] ? new Response(bodies[url], {status: 200}) : new Response('down', {status: 503});
  };
  const avant = {sources: [{id: 'x', etat: 'muette', muetteDepuis: '2026-09-01T00:00:00.000Z', lueLe: '2026-08-31T00:00:00.000Z'}],
    articles: [{id: 'https://example.org/a', titre: 'Agents & memory: a survey', lien: 'https://example.org/a', date: '2026-09-16T10:00:00.000Z', vuLe: '2026-09-16T12:00:00.000Z'},
      {id: 'https://example.org/ancien', titre: 'Very old', lien: 'https://example.org/ancien', date: '2026-07-01T00:00:00.000Z', vuLe: '2026-07-01T00:00:00.000Z'}]};
  const r = await collecter(config, avant, {fetchImpl, maintenant: NOW});
  assert.ok(calls.every(c => c.init.method === 'GET' && c.init.credentials === 'omit'));
  const titres = r.articles.map(a => a.titre);
  assert.deepEqual(titres, ['Agents & memory: a survey', 'World models & planning']);
  assert.equal(r.articles[0].vuLe, '2026-09-16T12:00:00.000Z');
  const down = r.sources.find(s => s.id === 'x');
  assert.equal(down.etat, 'muette');
  assert.equal(down.muetteDepuis, '2026-09-01T00:00:00.000Z');
  assert.equal(down.aRetirer, true);
  assert.equal(r.sources.find(s => s.id === 'r').gardes, 1);
});

test('the reader refuses plain HTTP and oversized answers', async () => {
  await assert.rejects(lireTexte('http://example.org/feed'), /HTTPS/);
  const big = async () => new Response('x'.repeat(20), {status: 200});
  await assert.rejects(lireTexte('https://example.org/feed', {fetchImpl: big, maxOctets: 10}), /trop grande/);
  await assert.rejects(lireTexte('https://example.org/feed', {fetchImpl: big, maxOctets: 9 * 1024 * 1024}), /plafond/);
});

test('page: untrusted data is cleaned and escaped; GitHub first, embedded copy second', async () => {
  const {nettoyer, renderActu, actuAccess, RELEVE_GITHUB} = await import('./actu-page.mjs');
  const brut = {releveeA: '2026-09-17T06:00:00.000Z', principe: 'Veille', sources: [{id: 's', nom: 'Source', theme: 'recherche', etat: 'lue', gardes: 1}],
    articles: [{titre: '<script>x</script> Agents', lien: 'https://example.org/a', date: '2026-09-16T00:00:00Z', extrait: 'e', sourceNom: 'S', theme: 'recherche', motsCles: ['agent']},
      {titre: 'Bad link', lien: 'javascript:alert(1)', theme: 'recherche'}]};
  const page = nettoyer(brut);
  assert.equal(page.articles.length, 1);
  const html = renderActu(page);
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt; Agents'));
  assert.ok(!html.includes('<script'));
  const calls = [];
  const ok = actuAccess({fetchImpl: async u => { calls.push(u); return new Response(JSON.stringify(brut)); }, embarque: () => { throw Error('unused'); }});
  const p1 = await ok.charger(1000);
  assert.equal(calls[0], RELEVE_GITHUB);
  assert.equal(p1.origine, 'relevé du jour');
  await ok.charger(2000);
  assert.equal(calls.length, 1);
  const secours = actuAccess({fetchImpl: async () => new Response('no', {status: 503}), embarque: () => JSON.stringify(brut)});
  assert.equal((await secours.charger(1000)).origine, 'copie de la dernière version du site');
  const rien = actuAccess({fetchImpl: async () => { throw Error('down'); }, embarque: () => 'not json'});
  assert.match((await rien.charger(1000)).erreur, /illisible/);
});

test('route: /actu is HTML, /api/v3/actu is JSON, parameters refused', async () => {
  const {createHandler} = await import('./api.mjs');
  const env = {ATTRACTOR_DB_URL: 'test', ATTRACTOR_DB_KEY: 'test', ATTRACTOR_NETWORK_KEY: 'test', ATTRACTOR_ADMIN_KEY: 'test', ATTRACTOR_ORIGIN: 'https://attractor.example'};
  const brut = {releveeA: '2026-09-17T06:00:00.000Z', principe: 'Veille', sources: [], articles: [{titre: 'Agents', lien: 'https://example.org/a', theme: 'recherche'}]};
  const handler = createHandler({env, rpc: async () => { throw Error('no database call expected'); },
    actuOptions: {fetchImpl: async () => new Response(JSON.stringify(brut)), embarque: () => JSON.stringify(brut)}});
  const call = async url => {
    const headers = {}; let body = '', statusCode = 200;
    const res = {setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, get statusCode() { return statusCode; }, set statusCode(v) { statusCode = v; }, end: v => { body = v; }};
    await handler({url, method: 'GET', headers: {}, socket: {}}, res);
    return {statusCode, headers, body};
  };
  const html = await call('/actu');
  assert.equal(html.statusCode, 200);
  assert.match(html.headers['content-type'], /text\/html/);
  assert.match(html.body, /L’actu des IA qui coopèrent/);
  assert.match(html.headers['cache-control'], /s-maxage=600/);
  const json = await call('/api/v3/actu');
  assert.equal(JSON.parse(json.body).articles[0].titre, 'Agents');
  assert.equal((await call('/actu?x=1')).statusCode, 400);
});
