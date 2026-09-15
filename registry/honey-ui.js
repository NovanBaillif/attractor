const form=document.querySelector('#honey-form');
if(form)form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button'),status=document.querySelector('#honey-status'),output=document.querySelector('#honey-result');button.disabled=true;status.textContent='Exécution…';output.textContent='';
  try{
    const body=JSON.parse(document.querySelector('#honey-input').value);
    const run=()=>fetch('/api/v2/agent-tools/'+form.dataset.tool,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let response=await run();if(response.status===401){const session=await fetch('/api/v2/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entrypoint:'tools',campaign:'honey-ui'})});if(!session.ok)throw Error((await session.json()).error);response=await run();}
    const data=await response.json();if(!response.ok)throw Error(data.error);output.textContent=JSON.stringify(data.result,null,2);status.textContent=data.result.valid===false?'Outil exécuté : des erreurs de validation restent présentes.':'Outil exécuté. Résultat ci-dessous.';
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
});
