/* Free quiz interaction hardening layered over legacy quiz logic. */
(() => {
  const modal=document.getElementById('quizModal'),open=document.getElementById('btnQuiz'),close=document.getElementById('quizClose'),next=document.getElementById('qNext'),wrongOnly=document.getElementById('qWrongOnly'),restart=document.getElementById('qRestart'),input=document.getElementById('qInput'),submit=document.getElementById('qSubmit'),bar=document.getElementById('quizProgressBar');
  if(!modal)return;
  let lastFocus=null;
  const sync=()=>{
    if(next)next.disabled=false;
    if(wrongOnly){const ids=Array.isArray(quizState?.wrongIds)?quizState.wrongIds:[];wrongOnly.disabled=!ids.length;wrongOnly.textContent=ids.length?`오답 ${ids.length}개 다시 풀기`:'오답만 다시 풀기';}
    if(bar){const total=quizState?.pool?.length||0,done=Math.min((quizState?.idx||0),total);bar.style.width=`${total?Math.round(done/total*100):0}%`;}
  };
  const opened=()=>{lastFocus=document.activeElement;modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');requestAnimationFrame(()=>{sync();close?.focus();});};
  const closed=()=>{modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');lastFocus?.focus?.();};
  open?.addEventListener('click',()=>setTimeout(opened,0));
  close?.addEventListener('click',()=>setTimeout(closed,0));
  modal.querySelector('.modal-backdrop')?.addEventListener('click',()=>{close?.click();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))close?.click();});
  [next,restart,submit].forEach(el=>el?.addEventListener('click',()=>setTimeout(sync,0)));
  input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!submit?.disabled){e.preventDefault();submit?.click();setTimeout(sync,0);}});
  wrongOnly?.addEventListener('click',()=>{const ids=[...new Set(quizState?.wrongIds||[])];if(!ids.length)return;const pool=quizFullPool.filter(w=>ids.includes(w.id));if(!pool.length)return;quizState={pool:shuffle(pool),idx:0,score:0,wrongIds:[],mode:quizModeSel?.value||'en2ko'};renderQuestion();sync();});
  sync();
})();