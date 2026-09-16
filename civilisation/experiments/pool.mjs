// One stateless call to a model through its command line, and a pool that runs several at once.
// The calls of an experiment are independent by construction — no call ever sees another's answer — so running
// them side by side changes the waiting time and nothing else. Answers come back in the order they were asked.
import {spawn} from 'node:child_process';

export const CLAUDE = 'C:/Users/Utilisateur/.vscode/extensions/anthropic.claude-code-2.1.272-win32-x64/resources/native-binary/claude.exe';
export const SYSTEM = 'You transform JSON specifications into JSON. Answer with one JSON object and nothing else.';

export function ask(prompt, {model = 'sonnet', timeout = 300000} = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(CLAUDE, ['-p', '--model', model, '--output-format', 'json', '--max-turns', '1',
      '--system-prompt', SYSTEM, '--exclude-dynamic-system-prompt-sections', '--no-session-persistence',
      '--disallowedTools', 'Bash,Read,Write,Edit,Glob,Grep,Task,WebFetch,WebSearch,NotebookEdit'],
      {cwd: process.env.ATTRACTOR_EMPTY_DIR, windowsHide: true});
    let out = '', err = '', done = false;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => { child.kill(); finish(Error('ETIMEDOUT after ' + timeout + 'ms')); }, timeout);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', finish);
    child.on('close', code => {
      if (code !== 0) return finish(Error(`exit ${code}: ${err.slice(0, 200)}`));
      try {
        const envelope = JSON.parse(out);
        finish(null, {text: envelope.result ?? '', ms: Date.now() - started, modelUsage: Object.keys(envelope.modelUsage ?? {})});
      } catch (e) { finish(Error('unreadable answer: ' + e.message)); }
    });
    child.stdin.end(prompt);
  });
}

// Runs `work(item, index)` over the list, at most `concurrency` at a time, and returns the results in order.
// A failure is returned in place, never thrown: an experiment records a failed call, it does not stop.
export async function pool(items, work, concurrency = 5) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({length: Math.min(concurrency, items.length)}, async () => {
    for (let i = next++; i < items.length; i = next++) {
      try { results[i] = {ok: true, value: await work(items[i], i)}; }
      catch (error) { results[i] = {ok: false, error}; }
    }
  });
  await Promise.all(runners);
  return results;
}
