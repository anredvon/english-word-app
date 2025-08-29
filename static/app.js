/* ===== 공통 유틸 ===== */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function today(){ return new Date().toISOString().slice(0,10); }
async function jget(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function jpost(url, body){ const r=await fetch(url,{method:"POST",headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

/* ===== 엘리먼트 ===== */
const form=$("wordForm"), wordEl=$("word"), meaningEl=$("meaning"), exampleEl=$("example"), regDateEl=$("regDate");
const bulkSection=$("bulkSection"), toggleBulk=$("toggleBulk"), bulkInput=$("bulkInput"), bulkDateEl=$("bulkDate"), bulkParseBtn=$("bulkParse"), bulkApplyBtn=$("bulkApply"), bulkPreview=$("bulkPreview"), bulkStatus=$("bulkStatus"), bulkSpinner=$("bulkSpinner");
const filterDateEl=$("filterDate"), loadByDateBtn=$("loadByDate"), searchEl=$("search"), btnSearch=$("btnSearch"), sortEl=$("sort"), listEl=$("wordList");
const btnQuiz=$("btnQuiz"), btnStats=$("btnStats"), quizModeSel=$("quizMode"), qWrongOnly=$("qWrongOnly"), voiceSelect=$("voiceSelect");

/* 퀴즈 모달 */
const quizModal=$("quizModal"), quizClose=$("quizClose"), qCount=$("qCount"), qScore=$("qScore"), qWord=$("qWord"), qChoices=$("qChoices"), qInputWrap=$("qInputWrap"), qInput=$("qInput"), qSubmit=$("qSubmit"), qNext=$("qNext"), qRestart=$("qRestart");
/* 통계 모달 */
const statsModal=$("statsModal"), statsClose=$("statsClose"), stTotal=$("stTotal"), stAcc=$("stAcc"), stToday=$("stToday"), weakList=$("weakList"), recentList=$("recentList");

/* ===== 상태 ===== */
let words=[], currentFilterDate="", currentQuery="", bulkParsed=[];
let quizState={ pool:[], idx:0, score:0, wrongIds:[], mode:"en2ko" };

/* ===== 초기값 ===== */
if (regDateEl) regDateEl.value=today();
if (bulkDateEl) bulkDateEl.value=today();
if (filterDateEl) filterDateEl.value=today();

/* ===== 단일 단어 등록 ===== */
form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload={ word:wordEl.value.trim(), meaning:meaningEl.value.trim(), example:exampleEl.value.trim(), registered_on: regDateEl?.value||today() };
  if(!payload.word||!payload.meaning){ alert("단어와 뜻을 입력하세요."); return; }
  const res=await jpost("/api/words", payload);
  if(res.ok){ alert("등록되었습니다."); form.reset(); if(regDateEl) regDateEl.value=today(); await loadWords({date:currentFilterDate}); }
});

/* ===== 대량 등록 ===== */
toggleBulk?.addEventListener("click", ()=> bulkSection.classList.toggle("hidden"));
function parseBulkText(text){ return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(row=>{
  const [left,example=""]=row.split("|").map(s=>s.trim()); if(!left) return null;
  const m=left.split(/[-:]/); if(m.length<2) return null;
  return {word:m[0].trim(),meaning:m.slice(1).join("-").trim(),example}; }).filter(Boolean); }
function renderBulkPreview(list){ bulkPreview.innerHTML=""; list.forEach(it=>{const li=document.createElement("li"); li.textContent=`${it.word} - ${it.meaning} ${it.example||""}`; bulkPreview.appendChild(li);}); }
bulkParseBtn?.addEventListener("click", ()=>{ bulkParsed=parseBulkText(bulkInput.value); renderBulkPreview(bulkParsed); bulkApplyBtn.disabled=bulkParsed.length===0; });
bulkApplyBtn?.addEventListener("click", async ()=>{ if(!bulkParsed.length) return; const d=bulkDateEl?.value||today();
  bulkSpinner.classList.remove("hidden"); let ok=0, fail=0;
  for(const it of bulkParsed){ try{ await jpost("/api/words",{...it,registered_on:d}); ok++; }catch{ fail++; } }
  bulkStatus.textContent=`완료: ${ok}개 등록, 실패 ${fail}개`; bulkSpinner.classList.add("hidden"); bulkInput.value=""; bulkParsed=[]; renderBulkPreview([]); bulkApplyBtn.disabled=true; await loadWords({date:currentFilterDate}); });

/* ===== 발음 기능 ===== */
function speakWord(word){
  const u=new SpeechSynthesisUtterance(word); u.lang="en-US";
  const voices=speechSynthesis.getVoices();
  if(voiceSelect?.value==="male"){ u.voice=voices.find(v=>/male/i.test(v.name))||null; }
  if(voiceSelect?.value==="female"){ u.voice=voices.find(v=>/female/i.test(v.name))||null; }
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
speechSynthesis.onvoiceschanged=()=>{}; // 보이스 로딩 안정화

/* ===== 목록 조회 ===== */
async function loadWords({date,q}={}){
  const params=new URLSearchParams(); if(date) params.set("date",date); if(q) params.set("q",q);
  words=await jget("/api/words"+(params.toString()?`?${params}`:"")); render();
}
function render(){
  let arr=[...words]; const q=(searchEl?.value||"").trim().toLowerCase();
  if(q) arr=arr.filter(it=>it.word.toLowerCase().includes(q)||it.meaning.toLowerCase().includes(q));
  const sort=(sortEl?.value||"created_desc");
  if(sort==="created_desc") arr.sort((a,b)=>b.id-a.id); if(sort==="alpha_asc") arr.sort((a,b)=>a.word.localeCompare(b.word)); if(sort==="alpha_desc") arr.sort((a,b)=>b.word.localeCompare(a.word));
  listEl.innerHTML=""; arr.forEach(it=>{ const li=document.createElement("li"); li.className="word-card";
    li.innerHTML=`<h3>${esc(it.word)}</h3><p>${esc(it.meaning)}</p>${it.example?`<p>${esc(it.example)}</p>`:""}<button class="ghost sm btn-speak" data-word="${esc(it.word)}">🔊 발음</button><button class="ghost sm danger btn-del" data-id="${it.id}">삭제</button>`;
    listEl.appendChild(li);
    li.querySelector(".btn-speak").addEventListener("click",e=>speakWord(e.currentTarget.dataset.word));
    li.querySelector(".btn-del").addEventListener("click",async e=>{ if(!confirm("삭제?"))return; await fetch(`/api/words/${e.currentTarget.dataset.id}`,{method:"DELETE"}); await loadWords({date:currentFilterDate}); });
  });
}
loadByDateBtn?.addEventListener("click",()=>{ currentFilterDate=filterDateEl?.value||""; loadWords({date:currentFilterDate,q:currentQuery}); });
btnSearch?.addEventListener("click",()=>{ currentQuery=searchEl?.value||""; if(currentQuery) loadWords({q:currentQuery}); else loadWords({date:filterDateEl?.value||today()}); });
sortEl?.addEventListener("change",()=>render());

/* ===== 퀴즈 ===== */
btnQuiz?.addEventListener("click", async ()=>{
  const d=filterDateEl?.value||""; const pool=await jget(`/api/quiz${d?`?date=${d}`:""}`);
  if(pool.length<4){ alert("퀴즈는 4개 이상 단어 필요"); return; }
  quizState.pool=shuffle(pool); quizState.idx=0; quizState.score=0; quizState.wrongIds=[]; quizState.mode=quizModeSel?.value||"en2ko"; qWrongOnly.disabled=true; quizModal.classList.remove("hidden"); nextQuestion();
});
quizClose?.addEventListener("click",()=>quizModal.classList.add("hidden"));
qRestart?.addEventListener("click",()=>{ quizState.idx=0; quizState.score=0; nextQuestion(); });
qNext?.addEventListener("click",()=>{ quizState.idx++; nextQuestion(); });
qWrongOnly?.addEventListener("click",()=>{ if(!quizState.wrongIds.length)return; quizState.pool=shuffle(words.filter(w=>quizState.wrongIds.includes(w.id))); quizState.idx=0; quizState.score=0; quizState.wrongIds=[]; qWrongOnly.disabled=true; nextQuestion(); });

function nextQuestion(){
  qChoices.innerHTML=""; qNext.disabled=true; const total=quizState.pool.length;
  if(quizState.idx>=total){ qWord.textContent=`완료! 점수 ${quizState.score}/${total}`; qCount.textContent=`${total}/${total}`; qWrongOnly.disabled=!quizState.wrongIds.length; return; }
  const correct=quizState.pool[quizState.idx]; const others=shuffle(quizState.pool.filter(w=>w.id!==correct.id)).slice(0,3);
  let options=[];
  if(quizState.mode==="en2ko"){ qWord.textContent=correct.word; options=shuffle([correct,...others]); options.forEach(opt=>addChoice(opt.meaning,opt.id===correct.id,correct)); }
  else if(quizState.mode==="ko2en"){ qWord.textContent=correct.meaning; options=shuffle([correct,...others]); options.forEach(opt=>addChoice(opt.word,opt.id===correct.id,correct)); }
  else{ const sentence=(correct.example||`${correct.word} is ...`).replace(new RegExp(correct.word,"ig"),"_____"); qWord.textContent=sentence; options=shuffle([correct,...others]); options.forEach(opt=>addChoice(opt.word,opt.id===correct.id,correct)); }
  qCount.textContent=`${quizState.idx+1}/${total}`; qScore.textContent=`점수 ${quizState.score}`;
  function addChoice(label,isCorrect,correctWord){ const div=document.createElement("div"); div.className="choice"; div.textContent=label;
    div.addEventListener("click",async()=>{ [...qChoices.children].forEach(el=>el.classList.add("disabled"));
      if(isCorrect){ div.classList.add("correct"); quizState.score++; await jpost(`/api/words/${correctWord.id}/result`,{correct:true}); }
      else{ div.classList.add("wrong"); quizState.wrongIds.push(correctWord.id); const correctEl=[...qChoices.children].find(el=>el.textContent===(quizState.mode==="en2ko"?correctWord.meaning:correctWord.word)); correctEl&&correctEl.classList.add("correct"); await jpost(`/api/words/${correctWord.id}/result`,{correct:false}); }
      qScore.textContent=`점수 ${quizState.score}`; qNext.disabled=false; });
    qChoices.appendChild(div); }
}

/* ===== 통계 ===== */
btnStats?.addEventListener("click", async ()=>{
  const to=today(); const from=new Date(Date.now()-29*24*60*60*1000).toISOString().slice(0,10);
  const rows=await jget(`/api/stats/daily?from=${from}&to=${to}`);
  const totalWords=rows.reduce((a,r)=>a+r.words,0); const sumCorrect=rows.reduce((a,r)=>a+(r.correct||0),0); const sumWrong=rows.reduce((a,r)=>a+(r.wrong||0),0);
  const acc=(sumCorrect+sumWrong)?Math.round(sumCorrect*100/(sumCorrect+sumWrong)):0;
  stTotal.textContent=String(totalWords); stAcc.textContent=`${acc}%`; const todayRow=rows.find(r=>r.day===to); stToday.textContent=String(todayRow?todayRow.words:0);
  const all=await jget("/api/words");
  const e1=[...all].map(w=>{const t=(w.correct||0)+(w.wrong||0); const rate=t?(w.correct/t):0; return {...w,tries:t,acc:rate};})
    .filter(w=>w.tries>=1).sort((a,b)=>a.acc-b.acc).slice(0,10);
  weakList.innerHTML=""; e1.forEach(w=>{const accPct=w.tries?Math.round(w.acc*100):0; const li=document.createElement("li"); li.textContent=`${w.word} (${w.meaning}) - 정답 ${w.correct||0}/${w.tries} (${accPct}%)`; weakList.appendChild(li);});
  const recent=[...all].filter(w=>w.last_tested).sort((a,b)=>new Date(b.last_tested)-new Date(a.last_tested)).slice(0,10);
  recentList.innerHTML=""; recent.forEach(w=>{const t=(w.correct||0)+(w.wrong||0); const accPct=t?Math.round((w.correct||0)*100/t):0; const li=document.createElement("li"); li.textContent=`${w.word} (${w.meaning}) · 최근 ${new Date(w.last_tested).toLocaleString()} · 정답 ${w.correct||0}/${t} (${accPct}%)`; recentList.appendChild(li);});
  statsModal.classList.remove("hidden");
});
statsClose?.addEventListener("click",()=>statsModal.classList.add("hidden"));

/* ===== 최초 로드 ===== */
currentFilterDate=filterDateEl?.value||""; loadWords({date:currentFilterDate}).catch(e=>console.error("로드 실패",e));
