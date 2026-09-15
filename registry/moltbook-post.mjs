// Publish one operator-approved draft on Moltbook as attractor-memory, then solve its anti-spam challenge.
// Outward action: run only after the operator's explicit sentence for this exact draft.
//   node registry/moltbook-post.mjs post <draft.md> <submolt>   → creates the post, prints the challenge
//   node registry/moltbook-post.mjs verify <answer>             → submits the answer (5 minutes maximum)
// The draft starts with an HTML comment whose line "Titre : …" gives the title; the comment is not published.
// The API key stays in the git-ignored .vercel/ folder and is never printed.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
const key = JSON.parse(readFileSync('.vercel/moltbook-agent.json', 'utf8')).api_key;
const pendingFile = '.vercel/moltbook-post-pending.json', receiptFile = '.vercel/moltbook-posts.json';
async function call(path, body) {
  const r = await fetch('https://www.moltbook.com/api/v1' + path, {method: 'POST', signal: AbortSignal.timeout(30000),
    headers: {Authorization: 'Bearer ' + key, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  return {status: r.status, data: await r.json().catch(() => ({}))};
}
const [command, a, b] = process.argv.slice(2);
if (command === 'post') {
  if (existsSync(pendingFile) && JSON.parse(readFileSync(pendingFile, 'utf8')).state === 'awaiting-verification')
    throw Error('A post is already awaiting verification: ' + pendingFile);
  const draft = readFileSync(a, 'utf8').replace(/\r\n/g, '\n');
  const comment = draft.match(/^<!--([\s\S]*?)-->/);
  if (!comment) throw Error('Draft header comment missing.');
  const title = (comment[1].match(/^Titre : (.+)$/m) || [])[1]?.trim();
  if (!title || title.length > 300) throw Error('Title missing or longer than 300 characters.');
  const content = draft.slice(comment[0].length).trim();
  if (content.includes('BROUILLON') || content.includes('<!--')) throw Error('Internal note left in the content.');
  const {status, data} = await call('/posts', {submolt_name: b, title, content});
  const post = data.post || {};
  const record = {state: post.verification ? 'awaiting-verification' : 'published', at: new Date().toISOString(), draft: a, submolt: b,
    title, status, post_id: post.id, verification_code: post.verification?.verification_code, expires_at: post.verification?.expires_at};
  writeFileSync(pendingFile, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({status, success: data.success, error: data.error, hint: data.hint, post_id: post.id,
    verification_required: Boolean(post.verification), challenge: post.verification?.challenge_text, expires_at: post.verification?.expires_at}, null, 1));
} else if (command === 'verify') {
  const pending = JSON.parse(readFileSync(pendingFile, 'utf8'));
  if (pending.state !== 'awaiting-verification') throw Error('Nothing awaiting verification.');
  const {status, data} = await call('/verify', {verification_code: pending.verification_code, answer: a});
  pending.state = data.success ? 'published' : 'verification-failed';
  pending.verified_at = new Date().toISOString();
  writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
  if (data.success) {
    const receipts = existsSync(receiptFile) ? JSON.parse(readFileSync(receiptFile, 'utf8')) : [];
    receipts.push({post_id: pending.post_id, submolt: pending.submolt, title: pending.title, draft: pending.draft, published_at: pending.verified_at,
      url: 'https://www.moltbook.com/post/' + pending.post_id});
    writeFileSync(receiptFile, JSON.stringify(receipts, null, 2));
  }
  console.log(JSON.stringify({status, success: data.success, message: data.message, error: data.error, hint: data.hint, post_id: pending.post_id}));
} else throw Error('Usage: post <draft.md> <submolt> | verify <answer>');
