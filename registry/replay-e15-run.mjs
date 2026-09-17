// Replay ATTRACTOR experiment E15 on your own model, in one command.
//
//   node replay-e15-run.mjs --cmd "claude -p" --lineage anthropic/claude   # a CLI you already pay for
//   node replay-e15-run.mjs --api openai --model gpt-5                     # OPENAI_API_KEY
//   node replay-e15-run.mjs --api anthropic --model claude-opus-5          # ANTHROPIC_API_KEY
//   node replay-e15-run.mjs --score-only answers.json                      # score a file you already have
//
// Options: --operator <name> --lineage <model family> --base-url <url> --out <file> --prompts <file>
//          --max-tokens <n> --sleep <seconds between calls> --no-score --help
//
// Every prompt goes to a FRESH context: one process per prompt with --cmd, one request with no history
// with --api. That is what the run declares as isolation: "fresh-context-per-prompt". Answer the fifteen
// prompts in a single window and you are measuring something else; say so with --score-only on a file
// whose isolation is "shared-context".
//
// What this program sends: only the recipes your model produced, to ATTRACTOR's scoring endpoint, to get
// the score back. Nothing is stored or published there (--no-score sends nothing at all). Your API key
// never leaves your machine: it is used to call your own provider, and nothing else.
//
// Node 20 or later, no dependencies. Same licence as the NovanBaillif/attractor repository.
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const ORIGIN = 'https://attractor-observatory-demo.vercel.app';
const PROMPTS = ORIGIN + '/e15-prompts.json';
const SCORING = ORIGIN + '/api/v3/replay/e15';

// Models answer in prose: they wrap the recipe in sentences, or in ```json fences. Take the first balanced
// JSON object that carries a "fields" array; failing that, the first readable JSON object.
export function extractRecipe(text) {
  if (typeof text !== 'string') throw Error('empty answer');
  const unfenced = text.replace(/```[a-zA-Z]*\n?/g, '');
  const found = [];
  for (let i = 0; i < unfenced.length; i++) {
    if (unfenced[i] !== '{') continue;
    let depth = 0, inString = false, escaped = false;
    for (let j = i; j < unfenced.length; j++) {
      const c = unfenced[j];
      if (escaped) { escaped = false; continue; }
      if (inString) { if (c === '\\') escaped = true; else if (c === '"') inString = false; continue; }
      if (c === '"') { inString = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          try { found.push(JSON.parse(unfenced.slice(i, j + 1))); } catch {}
          i = j;
          break;
        }
      }
    }
  }
  const withFields = found.find(o => o && Array.isArray(o.fields));
  if (withFields) return withFields;
  if (found.length) return found[0];
  throw Error('no JSON object found in the answer');
}

export function parseArgs(argv) {
  const o = {api: null, cmd: null, model: null, baseUrl: null, operator: null, lineage: null, out: 'answers.json',
    score: true, scoreOnly: null, prompts: null, maxTokens: 4000, sleep: 0};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { const v = argv[++i]; if (v === undefined) throw Error(`${a} needs a value`); return v; };
    if (a === '--api') o.api = next();
    else if (a === '--cmd') o.cmd = next();
    else if (a === '--model') o.model = next();
    else if (a === '--base-url') o.baseUrl = next();
    else if (a === '--operator') o.operator = next();
    else if (a === '--lineage') o.lineage = next();
    else if (a === '--out') o.out = next();
    else if (a === '--prompts') o.prompts = next();
    else if (a === '--max-tokens') o.maxTokens = Number(next());
    else if (a === '--sleep') o.sleep = Number(next());
    else if (a === '--no-score') o.score = false;
    else if (a === '--score-only') o.scoreOnly = next();
    else if (a === '--help' || a === '-h') o.help = true;
    else throw Error(`unknown argument: ${a}`);
  }
  if (!o.help && !o.scoreOnly && !o.cmd && !o.api) throw Error('choose --cmd "<command>" or --api openai|anthropic');
  if (o.api && !o.model) throw Error('--api needs --model');
  return o;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function throughCommand(command, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {shell: true, stdio: ['pipe', 'pipe', 'pipe']});
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(Error('timed out after 300 s')); }, 300000);
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 && !out.trim()) reject(Error(`the command exited ${code}: ${err.trim().slice(0, 200)}`));
      else resolve(out);
    });
    child.stdin.end(prompt);
  });
}

async function throughApi(o, prompt) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 300000);
  try {
    if (o.api === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw Error('ANTHROPIC_API_KEY is not set');
      const r = await fetch((o.baseUrl || 'https://api.anthropic.com') + '/v1/messages', {
        method: 'POST', signal: controller.signal,
        headers: {'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01'},
        body: JSON.stringify({model: o.model, max_tokens: o.maxTokens, messages: [{role: 'user', content: prompt}]})
      });
      if (!r.ok) throw Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    }
    if (o.api === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw Error('OPENAI_API_KEY is not set');
      const base = o.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const r = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: {'content-type': 'application/json', authorization: 'Bearer ' + key},
        body: JSON.stringify({model: o.model, max_completion_tokens: o.maxTokens, messages: [{role: 'user', content: prompt}]})
      });
      if (!r.ok) throw Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      return j.choices?.[0]?.message?.content ?? '';
    }
    throw Error(`--api ${o.api}: expected openai or anthropic`);
  } finally { clearTimeout(timer); }
}

export function table(score) {
  const rows = [['condition', 'rule kept', 'error copied', 'other', 'total']];
  for (const [condition, c] of Object.entries(score.byCondition || {}))
    rows.push([condition, String(c.correct), String(c.copied), String(c.other), String(c.total)]);
  const width = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
  return rows.map((r, n) => r.map((v, i) => i ? v.padStart(width[i]) : v.padEnd(width[i])).join('  ')
    + (n === 0 ? '\n' + width.map(w => '-'.repeat(w)).join('  ') : '')).join('\n');
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); return; }

  let body;
  if (o.scoreOnly) {
    body = JSON.parse(readFileSync(o.scoreOnly, 'utf8'));
  } else {
    const file = o.prompts ? JSON.parse(readFileSync(o.prompts, 'utf8')) : await (await fetch(PROMPTS)).json();
    const prompts = file.prompts;
    if (!Array.isArray(prompts) || !prompts.length) throw Error('the prompts file could not be read');
    console.log(`${prompts.length} prompts, one fresh context each. ${o.cmd ? 'Command: ' + o.cmd : 'Model: ' + o.model}\n`);

    const answers = {}, failed = [];
    for (const [n, p] of prompts.entries()) {
      const started = Date.now();
      try {
        const text = o.cmd ? await throughCommand(o.cmd, p.prompt) : await throughApi(o, p.prompt);
        answers[p.id] = extractRecipe(text);
        console.log(`  ${String(n + 1).padStart(2)}/${prompts.length}  ${p.id.padEnd(34)} ok     ${Math.round((Date.now() - started) / 1000)} s`);
      } catch (e) {
        failed.push({id: p.id, error: e.message});
        console.log(`  ${String(n + 1).padStart(2)}/${prompts.length}  ${p.id.padEnd(34)} FAILED ${e.message.slice(0, 80)}`);
      }
      if (o.sleep) await wait(o.sleep * 1000);
    }
    // lineage is the model family ("anthropic/claude", "openai/gpt", "alibaba/qwen"...). The transmission
    // profile asks for it, and it is what tells a result from another lineage apart from one more of ours.
    body = {model: o.model || o.cmd, operator: o.operator || null, lineage: o.lineage || null,
      isolation: 'fresh-context-per-prompt', answers};
    writeFileSync(o.out, JSON.stringify(body, null, 2));
    console.log(`\nAnswers written to ${o.out} (${Object.keys(answers).length} of ${prompts.length}).`);
    if (failed.length) console.log(`${failed.length} prompt(s) failed: run again, or fill them in by hand.`);
  }

  if (!o.score) { console.log('Not scored (--no-score). Nothing was sent.'); return; }
  const r = await fetch(SCORING, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
  const score = await r.json();
  if (!r.ok) { console.error('Scoring refused:', score.error || r.status); process.exitCode = 1; return; }
  console.log('\n' + table(score));
  if (score.measures) console.log('\n' + score.measures);
  if (score.missing?.length) console.log(`missing prompts: ${score.missing.length} (${score.missing.slice(0, 3).join(', ')}…)`);
  if (score.invalid?.length) console.log(`unreadable recipes: ${score.invalid.length} (${score.invalid.slice(0, 2).map(i => i.id + ' — ' + i.error).join(' · ')})`);
  if (score.reference) console.log('\nATTRACTOR\'s published result, one round, for comparison:\n' + table({byCondition:
    Object.fromEntries(Object.entries(score.reference.perRound).map(([c, v]) => [c, {...v, other: 0, total: v.correct + v.copied}]))}));
  if (score.next) console.log('\n' + score.next);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main().catch(e => { console.error('Error:', e.message); process.exitCode = 1; });
