/* R8 Icon Quality Pass — coherent rounded product icon vocabulary. */
(() => {
  const icons={
    home:'<path d="M4.5 10.5 12 4l7.5 6.5v8a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9.5 20v-5.5h5V20"/>',
    book:'<path d="M4 5.5c2.7-.8 5.4-.2 8 1.7v12.1c-2.6-1.9-5.3-2.5-8-1.7z"/><path d="M20 5.5c-2.7-.8-5.4-.2-8 1.7v12.1c2.6-1.9 5.3-2.5 8-1.7z"/>',
    learned:'<path d="M4 6c2.4-.7 4.8-.2 7 1.4v10.8c-2.2-1.6-4.6-2.1-7-1.4z"/><path d="M20 6c-2.4-.7-4.8-.2-7 1.4v5.4"/><circle cx="17" cy="17" r="4" class="icon-badge"/><path d="m15.4 17 1.1 1.1 2.2-2.3" class="icon-badge-check"/>',
    review:'<path d="M5.2 8.2A7.8 7.8 0 1 1 4.4 14"/><path d="M4.7 4.8v4h4"/>',
    history:'<path d="M5.5 18.5v-4"/><path d="M12 18.5v-8"/><path d="M18.5 18.5v-12"/>',
    accuracy:'<circle cx="12" cy="12" r="8"/><path d="m8.4 12.1 2.2 2.2 5-5"/>',
    alert:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2v4.5"/><path d="M12 16.2h.01"/>',
    award:'<circle cx="12" cy="9" r="5"/><path d="m9 13-1 7 4-2.2L16 20l-1-7"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
    speaker:'<path d="M5 10h3l4-3v10l-4-3H5z"/><path d="M15.5 9.5a4 4 0 0 1 0 5"/><path d="M18 7a7.5 7.5 0 0 1 0 10"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
  };
  const svg=name=>`<span class="product-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icons[name]||''}</svg></span>`;
  const replace=(el,name)=>{if(!el||!icons[name])return;el.innerHTML=svg(name);el.dataset.productIcon=name;el.classList.add('product-icon-host');};
  function metric(id,name){const value=document.getElementById(id);const card=value?.closest('article');replace(card?.querySelector('.ui-icon'),name);if(card){card.dataset.metricIcon=name;card.classList.add('product-metric-card')}}
  function mount(){
    const navMap={home:'home',wordbook:'book',wrong:'review',history:'history'};
    document.querySelectorAll('.app-nav-item').forEach(el=>replace(el.querySelector('.ui-icon'),navMap[el.dataset.view]||'home'));
    replace(document.querySelector('.wordbook-search .ui-icon'),'search');
    document.querySelectorAll('.word-more').forEach(el=>replace(el,'more'));
    document.querySelectorAll('.btn-speak').forEach(el=>{if(el.classList.contains('word-speak-icon'))return;el.querySelector('.product-icon')?.remove();el.insertAdjacentHTML('afterbegin',svg('speaker'));});
    metric('homeAccuracy','accuracy');metric('homeReviewed','learned');metric('homeTotal','book');
    metric('wrongTotal','review');metric('wrongAttempts','alert');metric('wrongMastered','award');
    metric('historyWeekWords','learned');metric('historyAttempts','history');metric('historyAccuracy','accuracy');metric('historyTotalWords','book');
  }
  window.DinoIcons={mount,svg};mount();
  window.addEventListener('dino:wordbook-open',()=>setTimeout(mount,0));
  window.addEventListener('dino:view-change',()=>setTimeout(mount,0));
})();