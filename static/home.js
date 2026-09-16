/* Playful Dino Refined — learner home dashboard.
   Uses the existing /api/words contract; no synthetic persisted stats. */
(() => {
  const home = document.getElementById('homeView');
  const wordbook = document.getElementById('wordbookView');
  const study = document.getElementById('studyView');
  const navItems = [...document.querySelectorAll('.app-nav-item')];
  if (!home || !wordbook) return;
  const isoToday=()=>new Date().toISOString().slice(0,10), num=v=>Number(v||0);
  function setView(view){
    home.classList.toggle('hidden',view!=='home'); wordbook.classList.toggle('hidden',view!=='wordbook'); study?.classList.add('hidden');
    document.querySelector('.app-nav')?.classList.remove('study-nav-hidden');
    navItems.forEach(item=>{const active=item.dataset.view===view;item.classList.toggle('is-active',active);active?item.setAttribute('aria-current','page'):item.removeAttribute('aria-current');});
    window.scrollTo({top:0,behavior:'smooth'}); if(view==='home') loadHome();
  }
  async function loadHome(){const status=document.getElementById('homeDataStatus');try{const response=await fetch('/api/words');if(!response.ok)throw new Error();const items=await response.json(),today=isoToday(),todayWords=items.filter(w=>String(w.registered_on||'').slice(0,10)===today),reviewed=items.filter(w=>num(w.correct)+num(w.wrong)>0),wrong=items.filter(w=>num(w.wrong)>0).sort((a,b)=>num(b.wrong)-num(a.wrong)),attempts=items.reduce((s,w)=>s+num(w.correct)+num(w.wrong),0),correct=items.reduce((s,w)=>s+num(w.correct),0),accuracy=attempts?Math.round(correct*100/attempts):0;
    document.getElementById('homeNewCount').textContent=todayWords.length;document.getElementById('homeReviewCount').textContent=wrong.length;document.getElementById('homeAccuracy').textContent=`${accuracy}%`;document.getElementById('homeReviewed').textContent=reviewed.length;document.getElementById('homeTotal').textContent=items.length;document.getElementById('homeProgressText').textContent=todayWords.length?`오늘 등록한 ${todayWords.length}개 단어로 시작해요`:'오늘 등록된 단어가 없으면 최근 단어로 학습해요';document.getElementById('homeProgressFill').style.width=todayWords.length?'100%':'0%';document.getElementById('homeDinoMessage').textContent=wrong.length?`다시 만나볼 단어가 ${wrong.length}개 있어! 천천히 해보자.`:'좋아! 지금까지 틀린 단어가 없네. 오늘 단어를 만나볼까?';
    const weak=document.getElementById('homeWeakWords');weak.innerHTML='';if(!wrong.length)weak.innerHTML='<div class="home-empty">아직 복습할 단어가 없어요 🌱</div>';else wrong.slice(0,5).forEach(w=>{const chip=document.createElement('button');chip.type='button';chip.className='weak-chip';chip.innerHTML=`<strong>${escapeHtml(w.word)}</strong><span>${escapeHtml(w.meaning||'')}</span><small>오답 ${num(w.wrong)}회</small>`;chip.onclick=()=>setView('wordbook');weak.appendChild(chip);});status.textContent='실제 단어 데이터 기준';}catch(_){status.textContent='학습 정보를 불러오지 못했어요';}}
  function escapeHtml(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  document.getElementById('homeStudyStart')?.addEventListener('click',()=>window.DinoStudy?.open());
  document.querySelector('[data-open-wordbook]')?.addEventListener('click',()=>setView('wordbook'));
  navItems.forEach(item=>item.addEventListener('click',e=>{const view=item.dataset.view;e.preventDefault();if(view==='home'||view==='wordbook')setView(view);else{const toast=document.getElementById('toastMsg');toast.textContent=view==='wrong'?'오답노트는 다음 단계에서 연결할게요.':'학습기록은 다음 단계에서 연결할게요.';toast.className='toast toast-info show';setTimeout(()=>toast?.classList.remove('show'),1800);}}));
  window.DinoHome={setView,loadHome}; setView('home');
})();