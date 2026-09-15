import {writeFileSync} from 'node:fs';
import {contribution,seeds} from './recipes.mjs';
const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const sql=seeds.map(raw=>{const seed=contribution(raw);return `insert into attractor.artifacts(slug,recipe,examples,conventions,content_hash,verification,origin) select '${seed.slug}',${literal(seed.recipe)},${literal(seed.examples)},${literal(seed.conventions)},'${seed.content_hash}',${literal(seed.verification)},'seed' where not exists(select 1 from attractor.artifacts where origin='seed' and content_hash='${seed.content_hash}');`;}).join('\n');
writeFileSync('registry/seed.sql',sql+'\n');console.log('registry/seed.sql prêt : trois exemples marqués seed.');
