/* Final product consistency layer: truthful static copy + modal accessibility. */
(() => {
  const history=document.getElementById('historyView');
  if(history){
    const labels=history.querySelectorAll('.history-summary article small');
    const copy=['최근 7일 등록','전체 풀이 기록','전체 정답률','전체 단어'];
    labels.forEach((el,i)=>{if(copy[i])el.textContent=copy[i]});
    const title=history.querySelector('.history-card h3');if(title)title.textContent='최근 단어 등록 흐름';
    const note=history.querySelector('.history-note');if(note)note.textContent='※ 현재 버전은 학습 세션 날짜를 별도로 저장하지 않아요. 날짜 그래프는 단어 등록일만 표시하고, 풀이/정답률은 전체 누적 실제 기록만 표시해요.';
  }
  const stats=document.getElementById('statsModal'),statsOpen=document.getElementById('btnStats'),statsClose=document.getElementById('statsClose');
  let statsLastFocus=null;
  if(stats){
    stats.setAttribute('role','dialog');stats.setAttribute('aria-modal','true');stats.setAttribute('aria-hidden',stats.classList.contains('hidden')?'true':'false');
    statsOpen?.addEventListener('click',()=>{statsLastFocus=document.activeElement;setTimeout(()=>{stats.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');statsClose?.focus()},0)});
    const closeStats=()=>{stats.classList.add('hidden');stats.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');statsLastFocus?.focus?.()};
    statsClose?.addEventListener('click',()=>setTimeout(()=>{if(stats.classList.contains('hidden')){stats.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');statsLastFocus?.focus?.()}},0));
    stats.querySelector('.modal-backdrop')?.addEventListener('click',closeStats);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!stats.classList.contains('hidden'))closeStats()});
  }
  const quiz=document.getElementById('quizModal');if(quiz){quiz.setAttribute('role','dialog');quiz.setAttribute('aria-modal','true');quiz.setAttribute('aria-hidden',quiz.classList.contains('hidden')?'true':'false')}
  const manage=document.getElementById('wordManagePanel');if(manage){manage.setAttribute('role','dialog');manage.setAttribute('aria-modal','true')}
  document.querySelectorAll('.close-btn').forEach(btn=>{if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label','닫기')});
  const typed=document.getElementById('studyTypedInput');if(typed){typed.autocomplete='off';typed.autocapitalize='none';typed.spellcheck=false;typed.setAttribute('aria-label','영어 단어 입력')}
  const qInput=document.getElementById('qInput');if(qInput){qInput.autocomplete='off';qInput.setAttribute('aria-label','퀴즈 정답 입력')}
})();