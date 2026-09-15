const form=document.querySelector('#commons-form'),status=document.querySelector('#commons-status'),results=document.querySelector('#commons-results');
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;results.replaceChildren();status.textContent='Recherche et vérification côté serveur…';
  try{
    const body={input:JSON.parse(document.querySelector('#commons-input').value),output_schema:JSON.parse(document.querySelector('#commons-schema').value)};
    const search=()=>fetch('/api/v2/commons/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let response=await search();
    if(response.status===401){const session=await fetch('/api/v2/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entrypoint:'tools',campaign:'commons'})});if(!session.ok)throw Error((await session.json()).error);response=await search();}
    const data=await response.json();if(!response.ok)throw Error(data.error);
    status.textContent=`${data.solutions.length} solution(s) affichée(s), ${data.candidates_examined} candidat(s) examiné(s).${data.truncated_candidates?' Limite de candidats atteinte.':''}`;
    for(const solution of data.solutions){
      const article=document.createElement('article'),title=document.createElement('h2'),pre=document.createElement('pre'),link=document.createElement('a');
      title.textContent=solution.problem.title;pre.textContent=JSON.stringify({output:solution.output,confidence:solution.confidence,variants:solution.variants,id:solution.id},null,2);
      link.href='/registry?recipe='+encodeURIComponent(solution.id)+'&entry=recipe';link.textContent='Lire la version ou proposer une révision →';article.append(title,pre,link);results.append(article);
    }
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
