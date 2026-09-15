// Browser integration check using Chromium's built-in DevTools protocol.
// Set CHROME_PATH to an installed Chromium executable.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const executable=process.env.CHROME_PATH;
const siteBase=process.env.ATTRACTOR_CHECK_URL || 'http://127.0.0.1:4310';
if(!executable)throw Error('CHROME_PATH requis');
mkdirSync('data/browser',{recursive:true});mkdirSync('screenshots',{recursive:true});
const browser=spawn(executable,['--headless','--disable-gpu','--no-first-run','--remote-debugging-port=9431',`--user-data-dir=${resolve('data/browser')}`],{windowsHide:true,stdio:'ignore'});
let socket;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  let pages;
  for(let i=0;i<40;i++){try{pages=await(await fetch('http://127.0.0.1:9431/json')).json();if(pages.length)break;}catch{}await sleep(250);}
  assert.ok(pages?.length,'Chromium accessible');
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
  function call(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}
  async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function waitFor(expression){for(let i=0;i<60;i++){if(await evaluate(expression))return;await sleep(100);}throw Error(`Timeout: ${expression}`);}
  async function open(path){await call('Page.navigate',{url:`${siteBase}${path}`});await waitFor(`document.readyState==='complete' && location.pathname===${JSON.stringify(path.split('?')[0])}`);}
  await call('Runtime.enable');await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await open('/?source=controlled');await sleep(400);
  assert.ok(await evaluate("document.querySelector('#home').hidden===false"));
  writeFileSync('screenshots/home-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
  if(process.env.ATTRACTOR_CHECK_REGISTRY==='yes'){
    await evaluate(`fetch('/api/v2/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"source":"controlled"}'}).then(r=>r.ok)`);
  }
  if(process.env.ATTRACTOR_CHECK_DISCOVERY==='yes'){
    if(process.env.ATTRACTOR_CHECK_HONEY==='yes'){
      await open('/agent-tools/coerce-llm-output-to-schema');
      await evaluate("document.querySelector('#honey-form button').click()");
      await waitFor("document.querySelector('#honey-result').textContent.includes('12.5')");
      await evaluate(`document.querySelector('#honey-input').value=JSON.stringify({value:{count:'2',important:'keep'},schema:{type:'object',properties:{count:{type:'number'}},additionalProperties:false}});document.querySelector('#honey-form button').click()`);
      await waitFor("document.querySelector('#honey-status').textContent.includes('erreurs de validation')");
      assert.ok(await evaluate("document.querySelector('#honey-result').textContent.includes('keep')"));
      writeFileSync('screenshots/honey-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      for(const path of ['/agent-tools','/agent-tools/coerce-llm-output-to-schema','/agent-tools/map-json-fields-api']){await open(path);assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),`Honey overflow ${path}`);}
      writeFileSync('screenshots/honey-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
      await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    }
    await open('/commons');
    await evaluate("document.querySelector('#commons-form button').click()");
    await waitFor("document.querySelector('#commons-results article') !== null");
    assert.ok(await evaluate("document.querySelector('#commons-results').textContent.includes('12.5')"));
    writeFileSync('screenshots/commons-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Commons mobile overflow');
    writeFileSync('screenshots/commons-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await open('/catalog');
    assert.equal(await evaluate("document.querySelectorAll('.cards article').length"),27);
    writeFileSync('screenshots/catalog-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
    await open('/recipes/csv-leading-zero-identifiers');
    assert.ok(await evaluate("document.body.textContent.includes('00042')"));
    await evaluate("document.querySelector('a[href*=\"recipe=\"]').click()");
    await waitFor("location.pathname==='/registry' && document.querySelector('#selected') && !document.querySelector('#selected').hidden");
    assert.ok(await evaluate("document.querySelector('#recipe-title').textContent==='csv-leading-zero-identifiers'"));
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    for(const path of ['/catalog','/recipes/csv-leading-zero-identifiers','/research']){
      await open(path);assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),`Pas de débordement ${path}`);
    }
    writeFileSync('screenshots/research-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  }
  await open('/tools');
  await evaluate("document.querySelector('#validator button').click()");
  await waitFor("document.querySelector('#validation').textContent.includes('false')");
  await evaluate(`document.querySelector('#data').value='{"name":"demo","count":3}';document.querySelector('#validator button').click()`);
  await waitFor("document.querySelector('#validation').textContent.includes('true')");
  if(process.env.ATTRACTOR_CHECK_REGISTRY==='yes'){
    await open('/registry');
    await waitFor("document.querySelectorAll('#recipe-list button').length>0");
    await evaluate("document.querySelector('#recipe-list button').click()");
    await waitFor("!document.querySelector('#selected').hidden");
    await evaluate("document.querySelector('#use-output').value=JSON.stringify(JSON.parse(document.querySelector('#recipe-detail').textContent).examples[0].expected);document.querySelector('#use-form button').click()");
    await waitFor("document.querySelector('#use-status').textContent.includes('verified')");
    await evaluate("document.querySelector('#contribute button').click()");
    await waitFor("document.querySelector('#contribute-status').textContent.includes('Version publiée')");
    await open('/dashboard');
    assert.ok(await evaluate("document.querySelector('#admin-content').hidden"));
    {
      const operator=siteBase.startsWith('http://127.0.0.1:')?'local-operator-test-only':JSON.parse(readFileSync('.vercel/registry-private.json','utf8')).admin;
      await evaluate(`document.querySelector('#operator-key').value=${JSON.stringify(operator)};document.querySelector('#operator button').click()`);
        await waitFor("!document.querySelector('#admin-content').hidden");
        await waitFor("document.querySelector('#observatory select') !== null");
        await evaluate("document.querySelector('#observatory details').open=true;document.querySelector('#observatory details button').click()");
        await waitFor("document.querySelector('#observatory details pre:last-child').textContent.includes('created_at')");
        await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Private observatory mobile width');
        writeFileSync('screenshots/observatory-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
        await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
      assert.ok(await evaluate("Number(document.querySelector('#artifacts-count').textContent)>0"));
    }
  }else{
  await open('/benchmark');
  await evaluate(`document.querySelector('[data-task="adaptation"]').click()`);
  await waitFor("!document.querySelector('#task-panel').hidden");
  await evaluate(`document.querySelector('#answer').value=JSON.parse(document.querySelector('#resource').textContent).instruction.match(/\\d+/)[0];document.querySelector('#submit-task button').click()`);
  await waitFor("document.querySelector('#task-result').textContent.includes('Nouvelle contrainte')");
  await evaluate(`document.querySelector('#answer').value=String(document.querySelector('#resource').textContent.match(/\\d+/g).map(Number).reduce((a,b)=>a+b,0));document.querySelector('#submit-task button').click()`);
  await waitFor("document.querySelector('#task-result').textContent.includes('Tâche réussie')");
  await open('/dashboard');await waitFor("document.querySelector('#sessions-count').textContent!=='—'");
  assert.ok(await evaluate("Number(document.querySelector('#solved-count').textContent)>=1"));
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const path of ['/','/tools','/benchmark','/dashboard']){await open(path);assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),`Pas de débordement ${path}`);}
  await open('/');
  writeFileSync('screenshots/home-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data,'base64'));
  assert.equal(errors.length,0,'Aucune exception JavaScript');
  console.log(process.env.ATTRACTOR_CHECK_REGISTRY==='yes'?'PASS: registry UI, server validation, recipe read/use/publish, private operator view, desktop/mobile, no JavaScript exceptions.':'PASS: desktop, mobile (4 routes), invalid → corrected JSON, two-step adaptation, persisted dashboard, no JavaScript exceptions.');
}finally{socket?.close();browser.kill();}
