// Capture the public The Colony comments listed in registry/ecosystems.json (thread.mode "import") into
// registry/thread-sources.json, next to the GitHub captures. Read-only, anonymous, through the checked connectors:
// the configured author and key must match what Moltbook returns, and a comment flagged as spam is refused.
// A message edited after an earlier capture is added as a revision; earlier text is kept.
//   node registry/capture-colony.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {readSource} from './connectors/index.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const config = read('registry/ecosystems.json'), sources = read('registry/thread-sources.json');
const capturedAt = new Date().toISOString();
const report = [];

for (const s of config.sources.filter(s => s.thread?.mode === 'import' && ['thecolony-comment'].includes(s.connector))) {
  const r = await readSource(s);
  const key = 'thecolony:' + r.external_id;
  if (key !== s.thread.key) throw Error(`${s.id}: key differs from configuration`);
  if (r.author_declared !== s.thread.author) throw Error(`${s.id}: author differs from configuration`);
  if (r.metadata?.is_spam) throw Error(`${s.id}: flagged as spam, not imported`);
  const versions = sources.comments.filter(c => String(c.id) === key);
  const last = versions.at(-1);
  if (last && last.body === r.body) { report.push({source: s.id, action: 'unchanged'}); continue; }
  const entry = {id: key, author: r.author_declared, body: r.body, source_url: r.source_url,
    original_created_at: r.metadata?.created_at || r.updated_at, original_updated_at: r.updated_at, captured_at: capturedAt,
    platform: 'thecolony',
    
    ...(s.thread.role ? {role: s.thread.role} : {}),
    ...(last ? {revision: r.updated_at} : {})};
  sources.comments.push(entry);
  report.push({source: s.id, action: last ? 'revision' : 'new', bytes: Buffer.byteLength(r.body)});
}
writeFileSync('registry/thread-sources.json', JSON.stringify(sources, null, 2) + '\n');
for (const r of report) console.log(`${r.action.padEnd(10)} ${r.source}${r.bytes ? ' · ' + r.bytes + ' octets' : ''}`);
