/* Búsqueda por rangos: conserva formato y referencias Wiki fuera del texto editado. */
window.StrataSearch=(()=>{
  let panel,query,replacement,counter,caseButton,wordButton,replaceRow,ranges=[],index=0,sensitive=false,whole=false,refreshTimer;
  const editors=()=>[...document.querySelectorAll('.page-editor')];
  function collect(){const result=[];for(const editor of editors()){
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('[data-export="ignore"],.strata-layer-annotation,.page-meta')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n,text='',nodes=[];
    while((n=walker.nextNode())){if(nodes.length&&nodes.at(-1).node.parentElement.closest('p,div,li,td,th,blockquote,h1,h2,h3')!==n.parentElement.closest('p,div,li,td,th,blockquote,h1,h2,h3'))text+='\n';nodes.push({node:n,start:text.length});text+=n.data;}
    if(!query.value)continue;const escaped=query.value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),regex=new RegExp(escaped,sensitive?'gu':'giu');
    for(const m of text.matchAll(regex)){
      const start=m.index,end=start+m[0].length;if(whole&&(/[\p{L}\p{N}_]/u.test(text[start-1]||'')||/[\p{L}\p{N}_]/u.test(text[end]||'')))continue;
      const a=nodes.find(x=>start>=x.start&&start<x.start+x.node.length),b=nodes.find(x=>end>x.start&&end<=x.start+x.node.length);if(!a||!b)continue;
      const range=document.createRange();range.setStart(a.node,start-a.start);range.setEnd(b.node,end-b.start);result.push(range);
    }
  }return result;}
  function paint(scroll=false){ranges=collect();index=Math.max(0,Math.min(index,ranges.length-1));counter.textContent=ranges.length?`${index+1} de ${ranges.length} resultados`:'0 resultados';
    if(window.Highlight&&CSS.highlights){CSS.highlights.set('strata-search',new Highlight(...ranges));CSS.highlights.set('strata-search-current',new Highlight(...(ranges[index]?[ranges[index]]:[])));}
    if(scroll&&ranges[index]){const n=ranges[index].startContainer.parentElement;n.scrollIntoView({block:'center',behavior:'auto'});}return ranges;
  }
  function close(){if(!panel)return;panel.hidden=true;CSS.highlights?.delete('strata-search');CSS.highlights?.delete('strata-search-current');}
  function replace(all=false){paint();if(!ranges.length)return;const positions=all?Array.from({length:ranges.length},(_,i)=>ranges.length-1-i):[index],text=replacement.value;
    for(const i of positions){const r=collect()[i];if(!r)continue;const editor=r.startContainer.parentElement.closest('.page-editor');editor.focus({preventScroll:true});const sel=getSelection();sel.removeAllRanges();sel.addRange(r);document.execCommand('insertText',false,text);}
    editors().forEach(e=>syncFichaHighlights(e,false));syncDOMPagesToState();scheduleProjectSave();paint(true);query.focus();
  }
  function open(withReplace=false,text){if(!panel)build();closeHomeScreen();StrataCanvas.hide();StrataPlanning.show(null);panel.hidden=false;replaceRow.hidden=!withReplace;if(text!==undefined)query.value=text;index=0;paint(true);query.focus();query.select();}
  function build(){const{el,button}=StrataV8.ui;panel=el('section','search-panel');panel.id='search-panel';panel.hidden=true;panel.setAttribute('aria-label','Buscar y reemplazar en el capítulo');
    query=el('input','s-input');query.id='search11-query';query.placeholder='Buscar…';query.setAttribute('aria-label','Buscar');counter=el('span','search-counter');counter.role='status';
    const row=el('div','search-row');caseButton=button('Aa',()=>{sensitive=!sensitive;caseButton.setAttribute('aria-pressed',String(sensitive));paint();},'btn');caseButton.title='Mayúsculas y minúsculas';caseButton.setAttribute('aria-pressed','false');wordButton=button('Palabra',()=>{whole=!whole;wordButton.setAttribute('aria-pressed',String(whole));paint();},'btn');wordButton.title='Palabra completa';wordButton.setAttribute('aria-pressed','false');
    const move=delta=>{if(!ranges.length)return;index=(index+delta+ranges.length)%ranges.length;paint(true);};
    row.append(query,button('↑',()=>move(-1),'btn'),button('↓',()=>move(1),'btn'),caseButton,wordButton,button('✕',close,'btn'));panel.append(row,counter,button('Reemplazar…',()=>replaceRow.hidden=!replaceRow.hidden,'text-btn'));
    replaceRow=el('div','search-row');replacement=el('input','s-input');replacement.id='search11-replacement';replacement.placeholder='Reemplazar con…';replacement.setAttribute('aria-label','Reemplazar con');replaceRow.append(replacement,button('Reemplazar',()=>replace()),button('Todo',()=>replace(true)));panel.append(replaceRow);document.getElementById('center').append(panel);
    query.oninput=()=>{index=0;paint();};panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Enter'){e.preventDefault();move(e.shiftKey?-1:1);}});
    document.addEventListener('input',e=>{if(!panel.hidden&&e.target.closest('.page-editor')){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>paint(),100);}});
  }
  function init(){document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['f','h'].includes(e.key.toLowerCase())&&!e.target.closest('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();open(e.key.toLowerCase()==='h');}},true);}
  return{init,open,close,paint,replace,get matches(){return ranges.length;}};
})();
