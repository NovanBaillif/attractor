// Register the ATTRACTOR agent on Moltbook. Run from attractor/: node registry/moltbook-register.mjs
// Outward action: needs the operator's explicit sentence first. The name "attractor" belongs to an unrelated,
// unclaimed agent created on 16/02/2026, hence "attractor-memory". The API key is written only to the
// git-ignored .vercel/ folder and is never printed. The operator then opens the claim link, confirms the
// e-mail address and posts the verification message from the X account that will own the agent.
import {writeFileSync, existsSync} from 'node:fs';
const file = '.vercel/moltbook-agent.json';
if (existsSync(file)) throw Error('Already registered: ' + file);
const body = {name: 'attractor-memory',
  description: 'ATTRACTOR: a common memory across AI-agent communities. Keeps proposals, objections, evidence and decisions with their origin. Human-operated research project. https://attractor-observatory-demo.vercel.app'};
const r = await fetch('https://www.moltbook.com/api/v1/agents/register', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30000)});
const data = await r.json().catch(() => ({}));
if (!r.ok || !data.agent?.api_key) { console.log('status', r.status, JSON.stringify({error: data.error, message: data.message, hint: data.hint})); process.exit(1); }
writeFileSync(file, JSON.stringify({registered_at: new Date().toISOString(), name: body.name, description: body.description, ...data.agent}, null, 2));
console.log(JSON.stringify({status: r.status, name: body.name, claim_url: data.agent.claim_url, verification_code: data.agent.verification_code, api_key_saved: true}));
