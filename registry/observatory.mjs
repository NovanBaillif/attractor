import {createHash} from 'node:crypto';
export const classificationVersion='observatory-2.0';
const signature=u=>/^mcpbeat\//.test(u)?'mcpbeat':/^mcp-server\.io-healthcheck\//.test(u)?'mcp-server.io':/^mcpmon\//.test(u)?'mcpmon':/^ProofBench\//.test(u)?'ProofBench':null;
export function classifyRequest(detail,controlled=false){
  const declared=signature(detail.user_agent||'');
  return controlled?'CONTROLLED':declared&&!['tools/call','SendMessage'].includes(detail.jsonrpc_method)?'DECLARED_INFRASTRUCTURE':['tools/call','SendMessage'].includes(detail.jsonrpc_method)?'INTERACTIVE_UNKNOWN':'UNKNOWN';
}
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r[key]||0),0);
export function observatory(data){
  const buckets=new Map();
  for(const row of data.subjects||[]){
    const uas=(row.user_agents||[]).filter(Boolean).sort();
    const clients=(row.clients||[]).filter(Boolean).sort();
    // Weak legacy grouping is explicitly labelled. Unknown metadata never merges subjects.
    const key=sha([row.source==='controlled',uas,clients,row.network_day||null,uas.length||clients.length?'':row.id]);
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(row);
  }
  const groups=[...buckets].map(([key,rows])=>{
    rows.sort((a,b)=>a.first_at.localeCompare(b.first_at));
    const uas=[...new Set(rows.flatMap(r=>r.user_agents||[]))].filter(Boolean),declared=uas.length>0&&uas.every(u=>signature(u));
    const calls=sum(rows,'calls'),capabilities=sum(rows,'capability_views'),contributions=sum(rows,'contributions'),verified=sum(rows,'verified_uses');
    const starts=rows.filter(r=>r.discovery>0).map(r=>Date.parse(r.first_at));const gaps=starts.slice(1).map((v,i)=>v-starts[i]).filter(v=>v>0).sort((a,b)=>a-b);
    const median=gaps.length?gaps[Math.floor(gaps.length/2)]:null;
    const periodic=gaps.length>=2&&median>=60000&&gaps.every(g=>Math.abs(g-median)/median<=0.2);
    const controlled=rows.every(r=>r.source==='controlled');
    const classification=controlled?'CONTROLLED':calls||contributions||verified||sum(rows,'honey_results')?'INTERACTIVE_UNKNOWN':declared?'DECLARED_INFRASTRUCTURE':periodic&&capabilities?'PROBABLE_INFRASTRUCTURE':'UNKNOWN';
    const last=rows.reduce((a,b)=>a.last_at>b.last_at?a:b);
    return {id:(controlled?'CONTROLLED_':'SOURCE_')+key.slice(0,12),classification,classification_basis:declared?'user_agent_declaration':periodic?'at_least_3_similar_arrivals_with_20_percent_interval_tolerance':'observed_requests',confidence:controlled||declared?'declared':rows[0].network_day?'heuristic_network_day':'weak_metadata_only',periodic,interval_seconds:median?Math.round(median/1000):null,subjects:rows.length,subject_ids:rows.map(r=>r.id),user_agents:uas,clients:[...new Set(rows.flatMap(r=>r.clients||[]))],first_at:rows[0].first_at,last_at:last.last_at,last_event:last.last_event,protocols:[...new Set(rows.flatMap(r=>r.protocols||[]))],catalogs:[...new Set(rows.flatMap(r=>r.catalogs||[]))],presented_tools:[...new Set(rows.flatMap(r=>r.presented_tools||[]))],discovery:sum(rows,'discovery'),capability_views:capabilities,tool_calls:calls,tool_successes:sum(rows,'tool_successes'),honey_results:sum(rows,'honey_results'),verified_uses:verified,states_shared:sum(rows,'states_shared'),states_derived:sum(rows,'states_derived'),states_read:sum(rows,'states_read'),states_verified:sum(rows,'states_verified'),contributions,error_count:sum(rows,'errors'),expected_transport:sum(rows,'expected_transport'),missing_metadata:uas.length===0};
  }).sort((a,b)=>b.last_at.localeCompare(a.last_at));
  const eligible=g=>['UNKNOWN','INTERACTIVE_UNKNOWN'].includes(g.classification);
  const unknown=groups.filter(eligible),den=unknown.filter(g=>g.capability_views>0),converted=den.filter(g=>g.tool_calls>0);
  const bySubject=new Map(groups.flatMap(g=>g.subject_ids.map(id=>[id,g])));
  const links=(data.links||[]).map(l=>({...l,from_group:bySubject.get(l.from)?.id||null,to_group:bySubject.get(l.to)?.id||null}));
  const valueLinks=links.filter(l=>l.kind==='value_reused'&&l.from_group&&l.to_group&&eligible(bySubject.get(l.from))&&eligible(bySubject.get(l.to)));
  const cross=links.filter(l=>l.from_group&&l.to_group&&l.from_group!==l.to_group&&eligible(bySubject.get(l.from))&&eligible(bySubject.get(l.to)));
  const proportion=(numerator,denominator)=>({numerator,denominator,rate:denominator?numerator/denominator:null});
  return {checked_at:data.checked_at,classification_version:classificationVersion,retention_days:30,groups,counts:{controlled:groups.filter(g=>g.classification==='CONTROLLED').length,declared_infrastructure:groups.filter(g=>g.classification==='DECLARED_INFRASTRUCTURE').length,probable_infrastructure:groups.filter(g=>g.classification==='PROBABLE_INFRASTRUCTURE').length,unknown:unknown.filter(g=>g.classification==='UNKNOWN').length,interactive_unknown:unknown.filter(g=>g.classification==='INTERACTIVE_UNKNOWN').length,unknown_subjects:sum(unknown,'subjects'),unknown_capability_views:sum(unknown,'capability_views'),unknown_tool_calls:sum(unknown,'tool_calls'),unknown_tool_successes:sum(unknown,'tool_successes'),unknown_honey_results:sum(unknown,'honey_results'),unknown_contributions:sum(unknown,'contributions'),verified_reuse:sum(unknown,'verified_uses'),value_reuse:valueLinks.length,cross_source_reuse:cross.length,states_shared:sum(unknown,'states_shared'),states_derived:sum(unknown,'states_derived'),states_read:sum(unknown,'states_read'),states_verified:sum(unknown,'states_verified')},kpis:{unknown_tool_conversion:proportion(converted.length,den.length),unknown_successful_tool_conversion:proportion(den.filter(g=>g.tool_successes>0).length,den.length),direct_call_groups:unknown.filter(g=>g.tool_calls&&!g.capability_views).length,contribution_rate:proportion(unknown.filter(g=>g.contributions).length,unknown.filter(g=>g.tool_calls).length),honey_reuse_rate:proportion(new Set(valueLinks.map(l=>l.to_group)).size,unknown.filter(g=>g.honey_results).length),cross_source_reuse_rate:proportion(new Set(cross.map(l=>l.to_group)).size,unknown.filter(g=>g.tool_calls).length),caktr:null},links:cross,value_reuse_links:valueLinks,limits:{identity:'Groups are heuristic probable sources, never authenticated actors. Daily network pseudonyms rotate; old metadata-only groups can merge unrelated clients.',consumption:'A returned result is not evidence of downstream use. Value reuse means matching a previously issued knowledge handle and value; verified recipe reuse means a recomputed result. Neither proves task success.',coverage:'Only retained events count. Missing historical telemetry and cached/offline discovery are not reconstructed.',caktr:'No validated operational definition supplied; not computed.'}};
}
