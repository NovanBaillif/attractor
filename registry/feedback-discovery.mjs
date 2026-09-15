import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export function buildFeedback(output) {
  const base = 'civilisation/convention/feedback-trial/';
  const hash = value => createHash('sha256').update(value).digest('hex');
  const report = JSON.parse(readFileSync(base + 'report.json', 'utf8'));
  for (const name of ['run.mjs', 'check-cases.mjs', 'guard.mjs', 'cases.json', 'external-contest.json', '../message.schema.json']) {
    if (report.hashes[name] !== hash(readFileSync(base + name))) throw Error('Feedback report is stale: ' + name);
  }
  const mapping = [
    ['replay.mjs', 'feedback-replay.mjs'], ['check-cases.mjs', 'feedback-check-cases.mjs'],
    ['guard.mjs', 'feedback-guard.mjs'], ['cases.json', 'feedback-cases.json'],
    ['report.json', 'feedback-report.json'], ['experiment-event.json', 'feedback-experiment.json'],
    ['external-contest.json', 'feedback-contest.json'], ['source.json', 'feedback-source.json'],
    ['PUBLIC-GUIDE.md', 'feedback-guide.md']
  ];
  const files = [];
  for (const [source, name] of mapping) {
    let content = readFileSync(base + source, 'utf8');
    if (source === 'replay.mjs') content = content.replace("'./check-cases.mjs'", "'./feedback-check-cases.mjs'").replace("'./cases.json'", "'./feedback-cases.json'");
    if (source === 'check-cases.mjs') content = content.replace("'./guard.mjs'", "'./feedback-guard.mjs'");
    writeFileSync(output + '/public/' + name, content);
    files.push({name, sha256: hash(content), bytes: Buffer.byteLength(content)});
  }
  const event = JSON.parse(readFileSync(base + 'experiment-event.json', 'utf8'));
  if (!event.data.evidence.includes('urn:sha256:' + hash(readFileSync(base + 'report.json')))) throw Error('Feedback event refers to another report.');
  writeFileSync(output + '/public/feedback-manifest.json', JSON.stringify({
    title: 'Attractor controlled feedback trial', operator_controlled: true,
    case_count: report.total_cases, experiment_event: {source: event.source, id: event.id},
    scope: 'Portable replay checks behavior; the report also records separate schema/reference checks.', files
  }, null, 2) + '\n');
  return [...files.map(f => 'public/' + f.name), 'public/feedback-manifest.json'];
}
