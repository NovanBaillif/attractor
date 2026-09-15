import {writeFileSync} from 'node:fs';
import {catalog,asContribution} from './catalog.mjs';
import {contribution} from './recipes.mjs';
const json=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const sql=catalog.map(raw=>{const c=contribution(asContribution(raw));return `insert into attractor.artifacts(slug,recipe,examples,conventions,content_hash,verification,origin) select '${c.slug}',${json(c.recipe)},${json(c.examples)},${json(c.conventions)},'${c.content_hash}',${json(c.verification)},'seed' where not exists(select 1 from attractor.artifacts where origin='seed' and content_hash='${c.content_hash}');`;}).join('\n');
writeFileSync('registry/catalog-seed.sql',sql+'\n');console.log(`${catalog.length} recettes prêtes, exemples vérifiés.`);
