/* R8 Product Icon Set V1 — coherent 24px rounded outline system. */
(() => {
  const icons={
    home:'<path d="M3.75 10.55 12 3.8l8.25 6.75v8.05a1.65 1.65 0 0 1-1.65 1.65H5.4a1.65 1.65 0 0 1-1.65-1.65Z"/><path d="M9.15 20.25v-6.1h5.7v6.1"/>',
    book:'<path d="M4.2 5.15A2.65 2.65 0 0 1 6.85 2.5H11v17.1H6.85A2.65 2.65 0 0 0 4.2 22.25Z"/><path d="M19.8 5.15a2.65 2.65 0 0 0-2.65-2.65H13v17.1h4.15a2.65 2.65 0 0 1 2.65 2.65Z"/>',
    review:'<path d="M19.55 7.35A8.35 8.35 0 1 0 20.2 14"/><path d="M19.6 3.9v4.9h-4.9"/><path d="m8.65 12.25 2.05 2.05 4.45-4.55"/>',
    history:'<path d="M4.2 19.7h15.6"/><path d="M6.35 16.9v-4.1M11.05 16.9V8.95M15.75 16.9V5.4M20.1 4.15v15.6" opacity="0"/><path d="M5.4 7.6 9.15 5l3.2 2.15 5.75-4"/>',
    search:'<circle cx="10.65" cy="10.65" r="6.15"/><path d="m15.25 15.25 4.5 4.5"/>',
    cards:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 9h9M7.5 13h5.4"/>',
    mistakes:'<path d="M12 3.45 21 19.4a1.05 1.05 0 0 1-.92 1.55H3.92A1.05 1.05 0 0 1 3 19.4Z"/><path d="M12 9v4.5M12 17.05v.1"/>',
    award:'<circle cx="12" cy="9" r="5.25"/><path d="m8.65 13.05-1.2 7.1L12 17.6l4.55 2.55-1.2-7.1"/><path d="m9.9 9.1 1.35 1.35 2.9-3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    close:'<path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/>',
    back:'<path d="m14.8 5-7 7 7 7"/>',
    speaker:'<path d="M4 9.1h3.4L12 5.4v13.2l-4.6-3.7H4Z"/><path d="M15.3 9a4.25 4.25 0 0 1 0 6M17.75 6.7a7.35 7.35 0 0 1 0 10.6"/>',
    more:'<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>'
  };
  const svg=name=>`<span class="product-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icons[name]||''}</svg></span>`;
  const replace=(el,name)=>{if(!el||el.dataset.productIcon===name)return;el.innerHTML=svg(name);el.dataset.productIcon=name};
  function mount(){
    document.querySelectorAll('.app-nav-item').forEach(el=>replace(el.querySelector('.ui-icon'),el.dataset.view==='home'?'home':el.dataset.view==='wordbook'?'book':el.dataset.view==='wrong'?'review':'history'));
    replace(document.querySelector('.wordbook-search .ui-icon'),'search');
    const wrong=document.querySelectorAll('.wrong-summary article>span.ui-icon');replace(wrong[0],'cards');replace(wrong[1],'mistakes');replace(wrong[2],'award');
    document.querySelectorAll('.word-more').forEach(el=>{el.textContent='';el.insertAdjacentHTML('beforeend',svg('more'));el.dataset.productIcon='more'});
    document.querySelectorAll('.btn-speak').forEach(el=>{if(el.classList.contains('word-speak-icon'))return; if(!el.querySelector('.product-icon'))el.insertAdjacentHTML('afterbegin',svg('speaker'))});
  }
  window.DinoIcons={mount,svg};mount();window.addEventListener('dino:wordbook-open',()=>setTimeout(mount,0));
})();