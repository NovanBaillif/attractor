// Capture the public GitHub messages listed in registry/ecosystems.json (thread.mode "import") into
// registry/thread-sources.json. Read-only on GitHub. A message edited by its author after an earlier
// capture is added as a revision (same id, new "revision" = its updated_at); earlier text is kept.
//   node registry/capture-github.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const config = read('registry/ecosystems.json'), sources = read('registry/thread-sources.json');
const gh = path => JSON.parse(execFileSync('gh', ['api', path], {encoding: 'utf8', maxBuffer: 8 << 20}));
const capturedAt = new Date().toISOString();
const report = [];

for (const s of config.sources.filter(s => s.thread?.mode === 'import')) {
  const comment = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)#issuecomment-(\d+)$/.exec(s.url);
  const issue = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)$/.exec(s.url);
  if (!comment && !issue) throw Error(`${s.id}: unsupported GitHub address`);
  const g = comment ? gh(`repos/${comment[1]}/${comment[2]}/issues/comments/${comment[4]}`)
    : gh(`repos/${issue[1]}/${issue[2]}/issues/${issue[3]}`);
  if (g.html_url !== s.url || g.user?.login !== s.thread.author) throw Error(`${s.id}: identity differs from configuration`);
  const id = comment ? g.id : `issue-${g.number}`;
  if (String(id) !== s.thread.key) throw Error(`${s.id}: key differs from configuration`);
  const versions = sources.comments.filter(c => String(c.id) === String(id));
  const last = versions.at(-1);
  if (last && last.body === g.body) { report.push({source: s.id, action: 'unchanged'}); continue; }
  const entry = {id, author: g.user.login, body: g.body, source_url: g.html_url,
    original_created_at: g.created_at, original_updated_at: g.updated_at, captured_at: capturedAt,
    ...(issue ? {kind: 'issue', title: g.title} : {}),
    ...(s.thread.role ? {role: s.thread.role} : {}),
    ...(last ? {revision: g.updated_at} : {})};
  sources.comments.push(entry);
  report.push({source: s.id, action: last ? 'revision' : 'new', bytes: Buffer.byteLength(g.body)});
}
writeFileSync('registry/thread-sources.json', JSON.stringify(sources, null, 2) + '\n');
for (const r of report) console.log(`${r.action.padEnd(10)} ${r.source}${r.bytes ? ' · ' + r.bytes + ' octets' : ''}`);
