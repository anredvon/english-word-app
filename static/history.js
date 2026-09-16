/* Learning history from existing daily stats + word records. No synthetic streak/session data. */
(() => {
  const view=document.getElementById('historyView'); if(!view)return;
  const num=v=>Number(v||0);
  const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
  const fmt=d=>`${d.getMonth()+1}/${d.getDate()}`;
  function last7(){const a=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);a.push(d);}return a;}
  async function load(){
    const status=document.getElementById('historyStatus');
    try{
      const days=last7(),from=iso(days[0]),to=iso(days[6]);
      const [sr,wr]=await Promise.all([fetch(`/api/stats/daily?from=${from}&to=${to}`),fetch('/api/words')]);
      if(!sr.ok||!wr.ok)throw new Error(); const stats=await sr.json(),words=await wr.json();
      const map=new Map(stats.map(s=>[String(s.date||s.registered_on||'').slice(0,10),s]));
      const weekWords=days.reduce((sum,d)=>sum+num(map.get(iso(d))?.words),0);
      const weekCorrect=days.reduce((sum,d)=>sum+num(map.get(iso(d))?.correct),0),weekWrong=days.reduce((sum,d)=>sum+num(map.get(iso(d))?.wrong),0),weekAttempts=weekCorrect+weekWrong;
      document.getElementById('historyWeekWords').textContent=weekWords;document.getElementById('historyAttempts').textContent=weekAttempts;document.getElementById('historyAccuracy').textContent=`${weekAttempts?Math.round(weekCorrect*100/weekAttempts):0}%`;document.getElementById('historyTotalWords').textContent=words.length;
      const chart=document.getElementById('historyChart');chart.innerHTML='';const max=Math.max(1,...days.map(d=>num(map.get(iso(d))?.words)));
      days.forEach(d=>{const count=num(map.get(iso(d))?.words),cell=document.createElement('div');cell.className='history-bar-cell';cell.innerHTML=`<div class="history-bar-track"><span style="height:${Math.max(count?14:2,Math.round(count/max*100))}%"></span></div><strong>${count}</strong><small>${fmt(d)}</small>`;chart.appendChild(cell);});
      const recent=document.getElementById('historyRecent');recent.innerHTML='';const active=days.slice().reverse().filter(d=>{const s=map.get(iso(d));return s&&num(s.words)+num(s.correct)+num(s.wrong)>0;});
      if(!active.length)recent.innerHTML='<div class="history-empty">이번 주 기록이 아직 없어요. 오늘 학습을 시작해볼까요? 🌱</div>';else active.forEach(d=>{const s=map.get(iso(d)),c=num(s.correct),w=num(s.wrong),a=c+w,rate=a?Math.round(c*100/a):0,row=document.createElement('article');row.className='history-row';row.innerHTML=`<div><strong>${d.getMonth()+1}월 ${d.getDate()}일</strong><span>등록 ${num(s.words)}개 · 문제 기록 ${a}회</span></div><b>${a?rate+'%':'—'}</b>`;recent.appendChild(row);});
      status.textContent='최근 7일 · 기존 학습 기록 기준';
    }catch(_){status.textContent='학습기록을 불러오지 못했어요.';document.getElementById('historyRecent').innerHTML='<div class="history-empty">잠시 후 다시 시도해 주세요.</div>';}
  }
  window.DinoHistory={load};
})();