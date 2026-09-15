// Run from attractor/. Credentials come from the existing gh login and are never printed.
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const executable=resolve('data/mcp-publisher/mcp-publisher.exe');
const auth=spawnSync('gh',['auth','token'],{encoding:'utf8',windowsHide:true});
if(auth.status!==0)throw Error('GitHub credentials unavailable');
const token=auth.stdout.trim();
const login=spawnSync(executable,['login','github','--token',token],{encoding:'utf8',windowsHide:true});
if(login.status!==0){console.error((login.stderr+login.stdout).replaceAll(token,'[redacted]'));process.exit(1);}
console.log('MCP Registry authentication successful.');
const publish=spawnSync(executable,['publish','distribution/server.json'],{encoding:'utf8',windowsHide:true});
console.log((publish.stdout+publish.stderr).replaceAll(token,'[redacted]'));process.exit(publish.status||0);
