const root=document.createElement('article');root.id='observatory';
document.querySelector('#admin-content').prepend(root);
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
window.renderObservatory=async(data,request)=>{
  root.replaceChildren(el('h2','Sources probables · ATTRACTOR 3.0'));
  root.append(el('p',`Mémoire publique, hors tests et infrastructure : ${data.counts.states_shared} dépôts, ${data.counts.states_read} lectures, ${data.counts.states_derived} versions dérivées, ${data.counts.states_verified} artefacts relus puis vérifiés sur contraintes explicites. Historique toutes versions ; chaque requête conserve sa version et son empreinte de catalogue.`));
  root.append(el('p','Regroupements heuristiques, pas des acteurs identifiés. Les sondes restent dans le journal. Fenêtre : 30 jours ; métadonnées historiques parfois absentes.'));
  const counts=el('div');counts.className='cards';
  for(const [label,key] of [['Infrastructure déclarée','declared_infrastructure'],['Infrastructure probable','probable_infrastructure'],['UNKNOWN','unknown'],['INTERACTIVE UNKNOWN','interactive_unknown'],['Contrôlés','controlled']]){const card=el('div');card.append(el('strong',String(data.counts[key])),el('p',label));counts.append(card);}root.append(counts);
  const k=data.kpis.unknown_tool_conversion;
  root.append(el('p',`Unknown Tool Conversion : ${k.denominator?(100*k.rate).toFixed(1)+' %':'non calculable'} (${k.numerator}/${k.denominator} groupes ayant vu les outils). Appels directs sans découverte observée : ${data.kpis.direct_call_groups}.`));
  root.append(el('p',`Hors infrastructure et tests : ${data.counts.unknown_capability_views} catalogues consultés → ${data.counts.unknown_tool_calls} tentatives MCP/API/A2A → ${data.counts.unknown_tool_successes} exécutions réussies → ${data.counts.unknown_honey_results} résultats JSON renvoyés → ${data.counts.unknown_contributions} contributions → ${data.counts.cross_source_reuse} reprises entre groupes probables.`));
  root.append(el('p',`Conversion en exécution réussie : ${data.kpis.unknown_successful_tool_conversion.numerator}/${data.kpis.unknown_successful_tool_conversion.denominator} groupes ayant vu le catalogue. Le taux de tentatives inclut les appels refusés.`));
  for(const [label,key] of [['Honey Reuse Rate','honey_reuse_rate'],['Contribution Rate','contribution_rate'],['Cross-Source Reuse Rate','cross_source_reuse_rate']]){
    const metric=data.kpis[key];root.append(el('p',`${label} : ${metric.denominator?(100*metric.rate).toFixed(1)+' %':'non calculable'} (${metric.numerator}/${metric.denominator} groupes).`));
  }
  root.append(el('p',`Reprises de valeurs vérifiées : ${data.counts.value_reuse}. Usages de recettes recalculés : ${data.counts.verified_reuse}.`));
  root.append(el('p','Un résultat renvoyé ne prouve pas sa consommation. Une reprise vérifiée ne prouve ni indépendance ni réussite de la tâche. CAKTR : non défini, non calculé.'));
  const filter=el('select');filter.setAttribute('aria-label','Filtrer les sources');
  for(const name of ['ALL','UNKNOWN','INTERACTIVE_UNKNOWN','DECLARED_INFRASTRUCTURE','PROBABLE_INFRASTRUCTURE','CONTROLLED']){const o=el('option',name);o.value=name;filter.append(o);}root.append(filter);
  const list=el('div');root.append(list);
  const render=()=>{list.replaceChildren();for(const g of data.groups.filter(g=>filter.value==='ALL'||g.classification===filter.value)){
    const item=el('details');item.append(el('summary',`${g.id} · ${g.classification} · ${g.tool_calls} appel(s) · ${g.subjects} trace(s)`));
    item.append(el('p',`Dernier événement : ${g.last_event} à ${g.last_at}. ${g.periodic?'Récurrence ~'+g.interval_seconds+' s. ':''}Confiance : ${g.confidence}.`));
    item.append(el('pre',JSON.stringify({user_agents:g.user_agents,clientInfo:g.clients,protocols:g.protocols,first_at:g.first_at,last_at:g.last_at,tool_catalog_hash:g.catalogs,tools_presented:g.presented_tools,errors:g.error_count,expected_transport:g.expected_transport},null,2)));
    const button=el('button','Afficher les requêtes exactes');const log=el('pre');button.type='button';
    button.onclick=async()=>{button.disabled=true;try{const results=await Promise.all(g.subject_ids.slice(0,20).map(id=>request('/api/v2/admin/timeline?subject='+encodeURIComponent(id),undefined,true)));log.textContent=JSON.stringify(results.flatMap(r=>r.events).sort((a,b)=>a.id-b.id),null,2);if(g.subject_ids.length>20)log.append('\nAffichage limité aux 20 premières traces. Chaque réponse contient au plus 200 événements ; pagination API avec before=<id>.');}catch(e){log.textContent=e.message;}finally{button.disabled=false;}};
    item.append(button,log);list.append(item);
  }};filter.onchange=render;render();
};
