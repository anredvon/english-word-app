/* Learning history — actual study events, with a complete zero-data state. */
(() => {
  const view=document.getElementById('historyView');if(!view)return;
  const num=v=>Number(v||0),iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`},fmt=d=>`${d.getMonth()+1}/${d.getDate()}`;
  function last7(){const a=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);a.push(d)}return a}
  const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  function shell(){
    text('historyWeekWords','0');text('historyAttempts','0');text('historyAccuracy','—');
    const labels=view.querySelectorAll('.history-summary article small');if(labels[0])labels[0].textContent='최근 7일 학습 단어';if(labels[1])labels[1].textContent='최근 7일 풀이';if(labels[2])labels[2].textContent='최근 7일 정답률';if(labels[3])labels[3].textContent='전체 단어';
    const head=view.querySelector('.history-head p');if(head)head.textContent='실제로 공부한 날짜와 풀이 기록을 한눈에 확인해요.';const title=view.querySelector('.history-card h3');if(title)title.textContent='최근 7일 학습 흐름';
    const chart=document.getElementById('historyChart');if(chart){chart.classList.add('is-empty');chart.innerHTML='<div class="history-chart-empty"><strong>아직 학습 기록이 없어요</strong><span>단어를 공부하거나 퀴즈를 풀면 실제 학습 기록이 이곳에 쌓여요.</span></div>'}
    const recent=document.getElementById('historyRecent');if(recent)recent.innerHTML='<div class="history-empty"><strong>첫 학습을 기다리고 있어요</strong><span>오늘의 학습이나 단어 퀴즈를 완료하면 날짜별 기록을 확인할 수 있어요.</span></div>';
    const note=view.querySelector('.history-note');if(note)note.textContent='※ 학습기록은 단어 등록일이 아니라 실제 문제를 풀고 결과를 저장한 시점을 기준으로 표시해요.';
    text('historyStatus','학습 기록 준비됨');
  }
  async function load(){shell();const status=document.getElementById('historyStatus');try{
    const days=last7(),from=iso(days[0]),to=iso(days[6]);
    const [sr,hr,wr,mr]=await Promise.allSettled([fetch(`/api/stats/daily?from=${from}&to=${to}`),fetch(`/api/history?from=${from}&to=${to}`),fetch('/api/words'),fetch('/api/stats/words')]);
    const sres=sr.status==='fulfilled'?sr.value:null,hres=hr.status==='fulfilled'?hr.value:null,wres=wr.status==='fulfilled'?wr.value:null,mres=mr.status==='fulfilled'?mr.value:null;
    let stats=[],history=[],words=[],masteryWords=[];
    if(sres?.ok){const x=await sres.json();stats=Array.isArray(x)?x:[]}
    if(hres?.ok){const x=await hres.json();history=Array.isArray(x)?x:[]}
    if(wres?.ok){const x=await wres.json();words=Array.isArray(x)?x:[]}if(mres?.ok){const x=await mres.json();masteryWords=Array.isArray(x)?x:[]}
    text('historyTotalWords',words.length);const mastered=masteryWords.filter(w=>num(w.attempts)>=3&&num(w.accuracy)>=80).length,growing=masteryWords.filter(w=>num(w.attempts)>0&&!(num(w.attempts)>=3&&num(w.accuracy)>=80)).length,needReview=masteryWords.filter(w=>num(w.wrong)>0&&num(w.accuracy)<70).length,learned=mastered+growing; text('historyMastered',mastered);text('historyGrowing',growing);text('historyNeedReview',needReview);const mf=document.getElementById('historyMasteryFill');if(mf)mf.style.width=learned?`${Math.round(mastered/learned*100)}%`:'0%';text('historyMasteryMessage',learned?`${learned}개 단어를 학습했고, 그중 ${mastered}개를 완전 암기 단계까지 키웠어요.`:'첫 학습을 시작하면 단어의 기억 성장이 여기에 쌓여요.');
    const map=new Map(stats.map(s=>[String(s.day||'').slice(0,10),s]));
    const weekAttempts=days.reduce((s,d)=>s+num(map.get(iso(d))?.attempts),0),weekCorrect=days.reduce((s,d)=>s+num(map.get(iso(d))?.correct),0),weekWords=days.reduce((s,d)=>s+num(map.get(iso(d))?.words),0),accuracy=weekAttempts?Math.round(weekCorrect*100/weekAttempts):0;
    text('historyWeekWords',weekWords);text('historyAttempts',weekAttempts);text('historyAccuracy',weekAttempts?`${accuracy}%`:'—');
    const chart=document.getElementById('historyChart');if(chart&&weekAttempts){chart.innerHTML='';chart.classList.remove('is-empty');const max=Math.max(1,...days.map(d=>num(map.get(iso(d))?.attempts)));days.forEach(d=>{const count=num(map.get(iso(d))?.attempts),cell=document.createElement('div');cell.className='history-bar-cell';cell.innerHTML=`<div class="history-bar-track"><span style="height:${Math.max(count?14:2,Math.round(count/max*100))}%"></span></div><strong>${count}</strong><small>${fmt(d)}</small>`;chart.appendChild(cell)})}
    const recent=document.getElementById('historyRecent');if(recent&&history.length){recent.innerHTML='';history.forEach(s=>{const day=String(s.day||'').slice(0,10),parts=day.split('-'),row=document.createElement('article');row.className='history-row';row.innerHTML=`<div><strong>${Number(parts[1])}월 ${Number(parts[2])}일</strong><span>${num(s.words)}개 단어 · ${num(s.attempts)}문제 · 오답 ${num(s.wrong)}개</span></div><b>${num(s.attempts)?Math.round(num(s.correct)*100/num(s.attempts)):0}%</b>`;recent.appendChild(row)})}
    if(status)status.textContent=weekAttempts?'실제 학습 이벤트 기준':'최근 7일 학습 기록 없음';
    if(!sres?.ok&&!hres?.ok&&status)status.textContent='새 학습기록 API를 불러오지 못했어요. 서버 Reload 후 다시 확인해 주세요.';
  }catch(_){if(status)status.textContent='학습기록 일부를 불러오지 못했지만 새 학습부터 정상적으로 기록돼요.'}}
  shell();window.DinoHistory={load};
})();
/* Load the word-quiz interaction layer after app.js has initialized its legacy globals. */
(() => {if(document.querySelector('script[data-quiz-product]'))return;const s=document.createElement('script');s.src='/static/quiz-product.js';s.defer=true;s.dataset.quizProduct='true';document.head.appendChild(s)})();