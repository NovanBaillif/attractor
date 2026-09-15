let key = '', busy = false;
const $ = id => document.getElementById(id);
const labels = { NORMAL: 'En activité', OBSERVATION_ONLY: 'En observation', FULL_STOP: 'Agents arrêtés', proposed: 'À examiner', accepted: 'Acceptée sur les tests', rejected: 'Échec des tests', contested: 'Contestée', quarantined: 'En quarantaine', builder: 'Construction', reviewer: 'Revue', user: 'Transmission' };
function el(tag, value, cls) { const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n; }
function details(value) { const d = el('details'); d.append(el('summary', 'Voir les preuves'), el('pre', JSON.stringify(value, null, 2))); return d; }
async function refresh() {
  const r = await fetch('/api/world'); if (!r.ok) throw Error('Lecture de la cité impossible.'); const s = await r.json();
  const selectedProject = $('agent-project').value;
  $('agent-project').replaceChildren(...s.projects.map(p => { const o = el('option', p.title); o.value = p.id; return o; }));
  if (s.projects.some(p => p.id === selectedProject)) $('agent-project').value = selectedProject;
  $('stats').replaceChildren(...[[labels[s.mode], 'état des agents'], [s.agents.length, 'mandats contrôlés'], [`${s.treasury.spent} / ${s.treasury.limit}`, 'crédits de travail utilisés'], [s.versions.reduce((n, v) => n + v.reuseCount, 0), 'réutilisations observées']].map(([value, label]) => { const c = el('div', undefined, 'stat'); c.append(el('strong', value), el('span', label)); return c; }));
  $('projects').replaceChildren(...s.projects.map(p => {
    const c = el('article', undefined, 'card'); c.append(el('h3', p.title), el('p', p.purpose), el('span', `${p.tests.length} critères fixés · ${p.paused ? 'suspendu' : 'ouvert'}`, 'badge'));
    if (key) { const b = el('button', p.paused ? 'Lever le veto' : 'Suspendre ce projet'); b.onclick = () => command('veto', { projectId: p.id, paused: !p.paused, reason: $('reason').value }); c.append(b); }
    c.append(details(p.tests));
    for (const v of s.versions.filter(v => v.projectId === p.id)) { const row = el('div', undefined, 'version'); row.append(el('span', labels[v.status], `badge ${v.status}`), el('strong', v.parentId ? 'Révision transmise' : 'Première proposition'), el('p', v.reason), details({ recipe: v.recipe, evidence: v.evidence, parentId: v.parentId, reuseCount: v.reuseCount, lawVersion: v.lawVersion })); c.append(row); }
    return c;
  }));
  if (!s.projects.length) $('projects').append(el('p', 'Ouvrir les commandes puis avancer le cycle pour fonder le premier projet.'));
  $('agents').replaceChildren(...s.agents.map(a => { const c = el('article', undefined, 'card'); c.append(el('h3', a.name), el('span', labels[a.role], 'badge'), el('p', a.mandate), el('p', `${a.spent}/${a.budget} crédits · ${a.revoked ? 'mandat révoqué' : 'mandat actif'}`)); if (key && !a.revoked) { const b = el('button', 'Révoquer'); b.onclick = () => command('revoke', { agentId: a.id, reason: $('reason').value }); c.append(b); } return c; }));
  $('laws').replaceChildren(...s.laws.toReversed().map(l => { const c = el('article', undefined, 'card'); c.append(el('h3', `Constitution · version ${l.version}`), el('p', l.content), el('p', l.reason)); return c; }));
  $('appeals').replaceChildren(...s.appeals.map(a => { const c = el('article', undefined, 'card'); c.append(el('h3', a.status === 'open' ? 'Arbitrage humain attendu' : 'Recours tranché'), el('p', a.reason), el('p', a.reasonResolved || 'La version est suspendue pendant son examen.')); if (key && a.status === 'open') for (const [decision, label] of [['restore', 'Rétablir'], ['quarantine', 'Mettre en quarantaine']]) { const b = el('button', label); b.onclick = () => command('resolve', { appealId: a.id, decision, reason: $('reason').value }); c.append(b); } return c; }));
  if (!s.appeals.length) $('appeals').append(el('p', 'Aucun recours ouvert. Tout agent mandaté peut contester une version, même sans crédits.'));
  $('events').replaceChildren(...s.events.map(e => { const row = el('div', undefined, 'event'); row.append(el('span', `#${e.seq}`), el('strong', e.action), details({ actor: e.actor, at: e.at, detail: e.detail, hash: e.hash })); return row; }));
}
async function post(path, body) {
  if (busy) return; busy = true; document.querySelectorAll('button').forEach(b => b.disabled = true);
  try { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) }); const result = await r.json(); if (!r.ok) throw Error(result.error); $('message').textContent = result.message || `Décision enregistrée${result.receipt ? ` · reçu ${result.receipt.seq}` : ''}.`; await refresh(); return result; }
  catch (e) { $('message').textContent = e.message; }
  finally { busy = false; document.querySelectorAll('button').forEach(b => b.disabled = false); }
}
const command = (action, payload) => post('/api/command', { action, payload, requestId: crypto.randomUUID() });
$('access').onsubmit = async e => {
  e.preventDefault(); const candidate = $('key').value.trim(); $('key').value = '';
  try {
    const r = await fetch('/api/operator', { headers: { Authorization: `Bearer ${candidate}` } });
    if (!r.ok) throw Error('Clé opérateur incorrecte.');
    key = candidate; $('commands').hidden = false; $('founding').hidden = false; $('access').hidden = true;
    $('message').textContent = 'Commandes humaines ouvertes.'; await refresh();
  } catch (e) { $('message').textContent = e.message; }
};
$('lock').onclick = () => { key = ''; $('credential').value = ''; $('commands').hidden = true; $('founding').hidden = true; $('access').hidden = false; refresh().catch(e => $('message').textContent = e.message); };
$('project-form').onsubmit = e => { e.preventDefault(); try { command('project', { title: $('project-title').value, purpose: $('purpose').value, tests: JSON.parse($('tests').value) }); } catch { $('message').textContent = 'Critères JSON invalides.'; } };
$('agent-form').onsubmit = async e => {
  e.preventDefault(); $('credential').value = '';
  const credential = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
  const r = await command('enrol', { name: $('agent-name').value, role: $('agent-role').value, projects: [$('agent-project').value], mandate: $('mandate').value, budget: Number($('budget').value), credential });
  if (r?.ok) $('credential').value = credential;
};
$('law-form').onsubmit = e => { e.preventDefault(); command('law', { content: $('law').value, reason: $('law-reason').value }); };
$('step').onclick = () => post('/api/demo', {});
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => command('mode', { mode: b.dataset.mode, reason: $('reason').value }));
refresh().catch(e => $('message').textContent = e.message);
