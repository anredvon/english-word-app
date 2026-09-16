/* Wrong-answer notebook using existing correct/wrong counters. */
(() => {
  const view=document.getElementById('wrongView'); if(!view)return;
  const num=v=>Number(v||0), esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function mastery(w){const c=num(w.correct),x=num(w.wrong),n=c+x,r=n?c/n:0;if(n>=5&&r>=.85)return['⭐','마스터','master'];if(n>=3&&r>=.6)return['🌿','익숙해지는 중','growing'];return['🌱','배우는 중','learning'];}
  async function load(){
    const list=document.getElementById('wrongList'),status=document.getElementById('wrongStatus'); list.innerHTML='<div class="wrong-empty">복습할 단어를 확인하고 있어요…</div>';
    try{const r=await fetch('/api/words');if(!r.ok)throw new Error();const all=await r.json();const words=all.filter(w=>num(w.wrong)>0).sort((a,b)=>num(b.wrong)-num(a.wrong)||num(a.correct)-num(b.correct));
      document.getElementById('wrongTotal').textContent=words.length;document.getElementById('wrongAttempts').textContent=words.reduce((s,w)=>s+num(w.wrong),0);document.getElementById('wrongMastered').textContent=words.filter(w=>mastery(w)[2]==='master').length;status.textContent=words.length?`오답 기록이 있는 ${words.length}개 단어를 실제 학습 기록에서 가져왔어요.`:'아직 오답 기록이 없어요.';
      list.innerHTML='';if(!words.length){list.innerHTML='<div class="wrong-empty"><span>🦖✨</span><h3>아직 복습할 단어가 없어요</h3><p>퀴즈에서 어려운 단어가 생기면 여기에 모아둘게요.</p></div>';return;}
      words.forEach(w=>{const [icon,label,cls]=mastery(w),attempts=num(w.correct)+num(w.wrong),rate=attempts?Math.round(num(w.correct)*100/attempts):0;const card=document.createElement('article');card.className='wrong-card';card.innerHTML=`<div class="wrong-word"><strong>${esc(w.word)}</strong><span>${esc(w.meaning||'')}</span>${w.example?`<p>${esc(w.example)}</p>`:''}</div><div class="mastery-badge ${cls}">${icon} ${label}</div><div class="wrong-metrics"><span>정답 <b>${num(w.correct)}</b></span><span>오답 <b>${num(w.wrong)}</b></span><span>정답률 <b>${rate}%</b></span></div>`;list.appendChild(card);});
      window.DinoWrongWords=words;
    }catch(_){list.innerHTML='<div class="wrong-empty">오답 정보를 불러오지 못했어요.</div>';status.textContent='잠시 후 다시 시도해 주세요.';}
  }
  document.getElementById('wrongReviewStart')?.addEventListener('click',()=>{if(window.DinoWrongWords?.length)window.DinoStudy?.openWithWords?.(window.DinoWrongWords.slice(0,10));else load();});
  window.DinoWrong={load};
})();