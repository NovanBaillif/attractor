import {readFileSync,writeFileSync} from 'node:fs';
const auth=JSON.parse(readFileSync(`${process.env.APPDATA}/com.vercel.cli/Data/auth.json`,'utf8'));
const params=new URLSearchParams({projectId:'prj_tmisCzfggv8J6la0lOH8G7Hyy2vR',ownerId:'team_wG9PcIi3zrCi5Hvi6x5RoiQ4',teamId:'team_wG9PcIi3zrCi5Hvi6x5RoiQ4',startDate:String(Date.parse('2026-09-10T20:57:00Z')),endDate:String(Date.parse('2026-09-10T21:04:00Z')),page:'0'});
const rows=[];
for(let page=0;page<10;page++){
  params.set('page',String(page));
  const response=await fetch('https://vercel.com/api/logs/request-logs?'+params,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(20000)});
  if(!response.ok){console.log({status:response.status,message:(await response.text()).slice(0,500)});process.exitCode=1;break;}
  const data=await response.json();rows.push(...(data.rows||[]));
  if(!data.hasMoreRows)break;
}
writeFileSync('.vercel/arrival-request-logs.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({count:rows.length,keys:[...new Set(rows.flatMap(Object.keys))],rows:rows.map(r=>({at:r.timestamp,id:r.requestId,path:r.requestPath,method:r.requestMethod,status:r.statusCode,userAgent:r.userAgent,referrer:r.referrer,referer:r.referer,logs:r.logs,events:r.events}))},null,2));
