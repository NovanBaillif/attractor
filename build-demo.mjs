import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
mkdirSync('demo-dist',{recursive:true});
let html=readFileSync('public/index.html','utf8')
  .replace('<script src="/app.js" defer></script>','<script type="module" src="/app.js"></script>')
  .replace('● PROTOTYPE LOCAL','● DÉMONSTRATION')
  .replace('OBSERVATOIRE / DONNÉES LOCALES RÉELLES','OBSERVATOIRE / TES ESSAIS DANS CE NAVIGATEUR')
  .replace('Le service conserve uniquement le résultat et le nombre d’erreurs.','La validation s’effectue dans ton navigateur. Seuls le résultat et le nombre d’erreurs sont conservés localement.')
  .replace('LOCAL / v0.1','DÉMO EN LIGNE / v0.1')
  .replace('<main>','<div class="demo-notice">Démonstration interactive · Les essais restent dans ton navigateur. La collecte de visites d’agents externes est inactive.</div><main>')
  .replace('Aucune session enregistrée.','Aucun essai enregistré.');
writeFileSync('demo-dist/index.html',html);
let app=readFileSync('public/app.js','utf8');
const start=app.indexOf('async function api('),end=app.indexOf('\nconst show',start);
app=app.slice(0,start)+'const api = demoApi;\n'+app.slice(end);
app="import {demoApi} from './demo-api.mjs';\n"+app;
app=app.replace('100 dernières sessions maximum','500 derniers événements de ce navigateur');
writeFileSync('demo-dist/app.js',app);
writeFileSync('demo-dist/style.css',readFileSync('public/style.css','utf8')+'\n.demo-notice{padding:12px 5%;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px;text-align:center}');
for(const name of ['validator.mjs','demo-api.mjs'])copyFileSync(name,`demo-dist/${name}`);
writeFileSync('demo-dist/docs.md','# ATTRACTOR — démonstration en ligne\n\nLe validateur et les trois expériences fonctionnent dans le navigateur. Aucun endpoint API public de collecte n’est exposé par cette démonstration.\n\nLes schémas acceptent : type, properties, required, additionalProperties (booléen), items, enum, minimum, maximum, minLength, maxLength, title et description. Les autres mots-clés sont refusés.\n\nOuvrir /tools pour valider ; /benchmark pour expérimenter ; /dashboard pour consulter les essais de ce navigateur. Les données restent dans localStorage, dans la limite des 500 derniers événements et 50 tâches. Effacer les données du site dans le navigateur pour les supprimer. Aucune transmission entre agents indépendants n’est démontrée.\n');
writeFileSync('demo-dist/research.txt','# Méthode — démonstration ATTRACTOR\n\nCette version montre les parcours de sélection, correction et adaptation. Chaque essai produit une trace enregistrée uniquement dans le navigateur utilisé. Le tableau de bord ne représente pas le trafic global du site.\n\nLes données de tâche et le score sont modifiables par le visiteur : ils ne sont donc pas des preuves scientifiques. Un humain ou un script peut réussir les trois tâches. Le score est un indice illustratif, pas une probabilité d’IA. La mémoire collective est inactive.\n\nLe validateur ne transmet pas le contenu saisi à notre serveur. L’hébergeur peut traiter les métadonnées techniques nécessaires à la livraison des pages. Les traces locales se limitent à 500 événements et 50 tâches ; effacer les données du site pour les supprimer. Utiliser des données synthétiques.\n\nLa collecte centralisée et les expériences entre agents nécessitent une version serveur hébergée, avec base persistante et observatoire privé.\n');
writeFileSync('demo-dist/robots.txt','User-agent: *\nDisallow: /\n');
writeFileSync('demo-dist/llms.txt','# ATTRACTOR demo\n\nInteractive browser demonstration only. No public collection API. No cross-agent memory.\n\n- [Documentation](/docs.md)\n- [Validator](/tools)\n- [Experiments](/benchmark)\n');
writeFileSync('demo-dist/vercel.json',JSON.stringify({version:2,framework:null,buildCommand:null,outputDirectory:'.',rewrites:[...['tools','benchmark','dashboard'].map(p=>({source:`/${p}`,destination:'/index.html'})),{source:'/research',destination:'/research.txt'}],headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}]}]},null,2));
console.log('Démonstration prête : demo-dist/ (fichiers statiques uniquement).');
