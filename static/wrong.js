/* Wrong-answer notebook using canonical study-event aggregates. */
(() => {
  const view=document.getElementById('wrongView'); if(!view)return;
  const num=v=>Number(v||0), esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function mastery(w){const c=num(w.correct),x=num(w.wrong),n=num(w.attempts)||c+x,r=n?c/n:0;if(!n)return['처음 만남','new'];if(n<2)return['배우는 중','learning'];if(n<3||r<.7)return['익숙해지는 중','growing'];if(r<.8)return['거의 암기','almost'];return['완전 암기','master'];}
  async function load(){
    const list=document.getElementById('wrongList'),status=document.getElementById('wrongStatus'); list.innerHTML='<div class="wrong-empty">복습할 단어를 확인하고 있어요…</div>';
    try{const r=await fetch('/api/stats/words');if(!r.ok)throw new Error();const all=await r.json();const words=all.filter(w=>num(w.wrong)>0).sort((a,b)=>num(b.wrong)-num(a.wrong)||num(a.correct)-num(b.correct));
      document.getElementById('wrongTotal').textContent=words.length;document.getElementById('wrongAttempts').textContent=words.reduce((s,w)=>s+num(w.wrong),0);document.getElementById('wrongMastered').textContent=words.filter(w=>mastery(w)[1]==='master').length;status.textContent=words.length?`실제 학습 이벤트에서 오답이 확인된 ${words.length}개 단어예요.`:'아직 오답 기록이 없어요.';
      list.innerHTML='';if(!words.length){list.innerHTML='<div class="wrong-empty"><img class="wrong-empty-mascot" src="/static/assets/mascot/dino_empty_reading.png" alt=""><h3>아직 복습할 단어가 없어요</h3><p>퀴즈에서 어려운 단어가 생기면 여기에 모아둘게요.</p></div>';return;}
      words.forEach(w=>{const [label,cls]=mastery(w),attempts=num(w.correct)+num(w.wrong),rate=attempts?Math.round(num(w.correct)*100/attempts):0;const card=document.createElement('article');card.className='wrong-card';card.innerHTML=`<div class="wrong-word"><strong>${esc(w.word)}</strong><span>${esc(w.meaning||'')}</span>${w.example?`<p>${esc(w.example)}</p>`:''}</div><div class="mastery-badge ${cls}"><i aria-hidden="true"></i>${label}</div><div class="wrong-metrics"><span>정답 <b>${num(w.correct)}</b></span><span>오답 <b>${num(w.wrong)}</b></span><span>정답률 <b>${rate}%</b></span></div>`;list.appendChild(card);});
      window.DinoWrongWords=words;
    }catch(_){list.innerHTML='<div class="wrong-empty">오답 정보를 불러오지 못했어요.</div>';status.textContent='잠시 후 다시 시도해 주세요.';}
  }
  document.getElementById('wrongReviewStart')?.addEventListener('click',()=>{if(window.DinoWrongWords?.length)window.DinoStudy?.openWithWords?.(window.DinoWrongWords.slice(0,10));else load();});
  window.DinoWrong={load};
})();