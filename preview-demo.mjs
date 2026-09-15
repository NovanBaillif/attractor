import http from 'node:http';
import {readFileSync} from 'node:fs';
const routes={'/':'index.html','/tools':'index.html','/benchmark':'index.html','/dashboard':'index.html','/research':'research.txt'};
http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=routes[path] || path.slice(1);
  if(!/^[a-zA-Z0-9.-]+$/.test(file)){res.writeHead(404);return res.end();}
  try{const body=readFileSync(`demo-dist/${file}`);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':/\.m?js$/.test(file)?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/plain; charset=utf-8');res.end(body);}catch{res.writeHead(404);res.end();}
}).listen(4311,'127.0.0.1',()=>console.log('Demo preview http://127.0.0.1:4311'));
