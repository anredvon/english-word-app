/* Learner-friendly Wordbook controls layered on top of legacy CRUD behavior. */
(() => {
  const view=document.getElementById('wordbookView');if(!view)return;
  const panel=document.getElementById('wordManagePanel'),addButton=document.getElementById('wordbookAdd'),closeButton=document.getElementById('wordManageClose'),singleTab=document.getElementById('manageSingleTab'),bulkTab=document.getElementById('manageBulkTab'),single=document.getElementById('singleManage'),bulk=document.getElementById('bulkManage');
  const localDate=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
  let filter='all',requestToken=0;
  function openPanel(mode='single'){panel?.classList.remove('hidden');panel?.setAttribute('aria-hidden','false');setMode(mode);setTimeout(()=>document.getElementById(mode==='single'?'word':'bulkInput')?.focus(),0);}
  function closePanel(){panel?.classList.add('hidden');panel?.setAttribute('aria-hidden','true');}
  function setMode(mode){const isSingle=mode==='single';single?.classList.toggle('hidden',!isSingle);bulk?.classList.toggle('hidden',isSingle);singleTab?.classList.toggle('is-active',isSingle);bulkTab?.classList.toggle('is-active',!isSingle);}
  addButton?.addEventListener('click',()=>openPanel('single'));closeButton?.addEventListener('click',closePanel);panel?.querySelector('.manage-backdrop')?.addEventListener('click',closePanel);singleTab?.addEventListener('click',()=>setMode('single'));bulkTab?.addEventListener('click',()=>setMode('bulk'));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel&&!panel.classList.contains('hidden'))closePanel();});

  const filterButtons=[...document.querySelectorAll('[data-word-filter]')];
  function markFilter(){filterButtons.forEach(b=>b.classList.toggle('is-active',b.dataset.wordFilter===filter));}
  async function loadFilter(){const token=++requestToken,date=document.getElementById('filterDate'),list=document.getElementById('wordList');markFilter();try{let url='/api/words';if(filter==='today')url+=`?date=${localDate()}`;const r=await fetch(url);if(!r.ok)throw new Error();let items=await r.json();if(token!==requestToken)return;if(filter==='difficult')items=items.filter(w=>{const c=Number(w.correct||0),x=Number(w.wrong||0),t=c+x;return x>0&&(!t||Math.round(c*100/t)<70);});if(date)date.value=filter==='today'?localDate():'';if(typeof window.renderWordbookItems==='function')window.renderWordbookItems(items);else{window.DinoWordbookItems=items;document.dispatchEvent(new CustomEvent('dino:wordbook-data',{detail:{items}}));}}
    catch(_){if(list)list.innerHTML='<li class="empty-state">단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</li>';}}
  filterButtons.forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.wordFilter;const date=document.getElementById('filterDate');if(filter==='today'){if(date)date.value=localDate();document.getElementById('loadByDate')?.click();}else if(filter==='all'){if(date)date.value='';document.getElementById('loadByDate')?.click();}else loadFilter();}));
  window.addEventListener('dino:wordbook-open',()=>{filter='all';const date=document.getElementById('filterDate');if(date)date.value='';document.getElementById('loadByDate')?.click();markFilter();});
  document.getElementById('bulkSection')?.classList.remove('hidden');
})();