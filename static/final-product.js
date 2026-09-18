/* Final product consistency layer: truthful static copy + modal accessibility. */
(() => {
  const quizButton=document.getElementById('btnQuiz'),quiz=document.getElementById('quizModal'),quizClose=document.getElementById('quizClose');
  if(quizButton)quizButton.textContent='단어 퀴즈';
  if(quiz){
    const title=quiz.querySelector('.modal-title');if(title)title.textContent='단어 퀴즈';
    quiz.setAttribute('role','dialog');quiz.setAttribute('aria-modal','true');quiz.setAttribute('aria-hidden',quiz.classList.contains('hidden')?'true':'false');
    let lastFocus=null;
    quizButton?.addEventListener('click',()=>{lastFocus=document.activeElement;setTimeout(()=>{if(!quiz.classList.contains('hidden')){quiz.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}},0)});
    quizClose?.addEventListener('click',()=>setTimeout(()=>{if(quiz.classList.contains('hidden')){quiz.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');lastFocus?.focus?.()}},0));
  }
  const manage=document.getElementById('wordManagePanel');if(manage){manage.setAttribute('role','dialog');manage.setAttribute('aria-modal','true')}
  document.querySelectorAll('.close-btn').forEach(btn=>{if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label','닫기')});
  const typed=document.getElementById('studyTypedInput');if(typed){typed.autocomplete='off';typed.autocapitalize='none';typed.spellcheck=false;typed.setAttribute('aria-label','영어 단어 입력')}
  const qInput=document.getElementById('qInput');if(qInput){qInput.autocomplete='off';qInput.setAttribute('aria-label','퀴즈 정답 입력')}
})();