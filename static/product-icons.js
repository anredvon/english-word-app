/* R8 Icon Quality Pass — one Lucide-family vocabulary for every visible product concept. */
(() => {
  const icons={
    home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    book:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    learned:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a2 2 0 0 1 2 2v7"/><path d="m16 19 2 2 4-4"/>',
    review:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    history:'<path d="M5 21v-6"/><path d="M12 21V9"/><path d="M19 21V3"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    award:'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    search:'<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    speaker:'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  const svg=name=>`<span class="product-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icons[name]||''}</svg></span>`;
  const replace=(el,name)=>{if(!el||!icons[name])return;el.innerHTML=svg(name);el.dataset.productIcon=name;el.classList.add('product-icon-host');};
  const replaceAt=(selector,name)=>replace(document.querySelector(selector),name);
  function mount(){
    const navMap={home:'home',wordbook:'book',wrong:'review',history:'history'};
    document.querySelectorAll('.app-nav-item').forEach(el=>replace(el.querySelector('.ui-icon'),navMap[el.dataset.view]||'home'));
    replaceAt('.wordbook-search .ui-icon','search');
    document.querySelectorAll('.word-more').forEach(el=>replace(el,'more'));
    document.querySelectorAll('.btn-speak').forEach(el=>{if(el.classList.contains('word-speak-icon'))return;el.querySelector('.product-icon')?.remove();el.insertAdjacentHTML('afterbegin',svg('speaker'));});

    /* Bind directly to the actual legacy HTML classes/metric IDs. */
    replaceAt('#homeAccuracy','target');
    const homeAccuracy=document.getElementById('homeAccuracy')?.closest('article');replace(homeAccuracy?.querySelector('.ui-icon'),'target');
    const homeReviewed=document.getElementById('homeReviewed')?.closest('article');replace(homeReviewed?.querySelector('.ui-icon'),'learned');
    const homeTotal=document.getElementById('homeTotal')?.closest('article');replace(homeTotal?.querySelector('.ui-icon'),'book');

    const wrongTotal=document.getElementById('wrongTotal')?.closest('article');replace(wrongTotal?.querySelector('.ui-icon'),'review');
    const wrongAttempts=document.getElementById('wrongAttempts')?.closest('article');replace(wrongAttempts?.querySelector('.ui-icon'),'alert');
    const wrongMastered=document.getElementById('wrongMastered')?.closest('article');replace(wrongMastered?.querySelector('.ui-icon'),'award');

    const historyWeek=document.getElementById('historyWeekWords')?.closest('article');replace(historyWeek?.querySelector('.ui-icon'),'learned');
    const historyAttempts=document.getElementById('historyAttempts')?.closest('article');replace(historyAttempts?.querySelector('.ui-icon'),'history');
    const historyAccuracy=document.getElementById('historyAccuracy')?.closest('article');replace(historyAccuracy?.querySelector('.ui-icon'),'target');
    const historyTotal=document.getElementById('historyTotalWords')?.closest('article');replace(historyTotal?.querySelector('.ui-icon'),'book');
  }
  window.DinoIcons={mount,svg};mount();
  window.addEventListener('dino:wordbook-open',()=>setTimeout(mount,0));
  window.addEventListener('dino:view-change',()=>setTimeout(mount,0));
})();