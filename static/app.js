const KEY = "ewa_words_v1";
function loadWords(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}}
function saveWords(words){localStorage.setItem(KEY,JSON.stringify(words))}
function uid(){return Math.random().toString(36).slice(2,10)}
function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* ===== PWA 등록 ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/static/sw.js").catch(()=>{});
  });
}

/* ===== 엘리먼트 ===== */
const form=document.getElementById("wordForm");
const wordInput=document.getElementById("word");
const meaningInput=document.getElementById("meaning");
const exampleInput=document.getElementById("example");
const clearBtn=document.getElementById("clearAll");
const listEl=document.getElementById("wordList");
const searchEl=document.getElementById("search");
const sortEl=document.getElementById("sort");
const btnExport=document.getElementById("btnExport");
const fileImport=document.getElementById("fileImport");
const btnQuiz=document.getElementById("btnQuiz");
const btnStats=document.getElementById("btnStats");
const btnBulk=document.getElementById("btnBulk");

/* 퀴즈 모달 */
const quizModal=document.getElementById("quizModal");
const quizClose=document.getElementById("quizClose");
const qCount=document.getElementById("qCount");
const qScore=document.getElementById("qScore");
const qWord=document.getElementById("qWord");
const qChoices=document.getElementById("qChoices");
const qNext=document.getElementById("qNext");
const qRestart=document.getElementById("qRestart");

/* 통계 모달 */
const statsModal=document.getElementById("statsModal");
const statsClose=document.getElementById("statsClose");
const stTotal=document.getElementById("stTotal");
const stAcc=document.getElementById("stAcc");
const stToday=document.getElementById("stToday");
const weakList=document.getElementById("weakList");
const recentList=document.getElementById("recentList");

/* 대량 등록 모달 */
const bulkModal=document.getElementById("bulkModal");
const bulkClose=document.getElementById("bulkClose");
const bulkText=document.getElementById("bulkText");
const bulkParse=document.getElementById("bulkParse");
const bulkApply=document.getElementById("bulkApply");
const bulkPreview=document.getElementById("bulkPreview");
const bulkImage=document.getElementById("bulkImage");
const ocrStatus=document.getElementById("ocrStatus");

/* ===== 상태 ===== */
let words=loadWords();
words=words.map(w=>({
  id:w.id||uid(),
  word:w.word, meaning:w.meaning, example:w.example||"",
  level:Number.isFinite(w.level)?w.level:1,
  createdAt:Number.isFinite(w.createdAt)?w.createdAt:Date.now(),
  correct:Number.isFinite(w.correct)?w.correct:0,
  wrong:Number.isFinite(w.wrong)?w.wrong:0,
  lastTested:Number.isFinite(w.lastTested)?w.lastTested:0
}));
saveWords(words);

/* ===== 렌더 ===== */
function render(){
  const q=(searchEl.value||"").trim().toLowerCase();
  let arr=[...words];
  const sort=sortEl.value;
  if(sort==="created_desc")arr.sort((a,b)=>b.createdAt-a.createdAt);
  if(sort==="alpha_asc")arr.sort((a,b)=>a.word.localeCompare(b.word));
  if(sort==="alpha_desc")arr.sort((a,b)=>b.word.localeCompare(a.word));
  if(q)arr=arr.filter(it=>it.word.toLowerCase().includes(q)||it.meaning.toLowerCase().includes(q));
  listEl.innerHTML="";
  arr.forEach(it=>{
    const total=it.correct+it.wrong, acc=total?Math.round((it.correct/total)*100):0;
    const li=document.createElement("li");
    li.className="word-card";
    li.innerHTML=`
      <h3>
        ${escapeHtml(it.word)}
        <button class="speak sm" data-id="${it.id}" data-act="speak">발음</button>
      </h3>
      <p><strong>뜻</strong> ${escapeHtml(it.meaning)}</p>
      ${it.example?`<p><strong>예문</strong> ${escapeHtml(it.example)}</p>`:""}
      <div class="meta">
        <span>${new Date(it.createdAt).toLocaleString()}</span>
        <span>레벨 ${it.level} · ${acc}% (${it.correct}/${total||0})</span>
      </div>
      <div class="actions">
        <button data-id="${it.id}" data-act="inc">레벨↑</button>
        <button data-id="${it.id}" data-act="dec">레벨↓</button>
        <button data-id="${it.id}" data-act="reset" class="ghost">정오답 리셋</button>
        <button data-id="${it.id}" data-act="del" class="ghost">삭제</button>
      </div>`;
    listEl.appendChild(li);
  });
}

/* ===== 이벤트(등록/삭제 등) ===== */
form.addEventListener("submit",e=>{
  e.preventDefault();
  const w=wordInput.value.trim(), m=meaningInput.value.trim(), ex=exampleInput.value.trim();
  if(!w||!m)return;
  words.push({id:uid(),word:w,meaning:m,example:ex,level:1,createdAt:Date.now(),correct:0,wrong:0,lastTested:0});
  saveWords(words); form.reset(); render();
});
clearBtn.addEventListener("click",()=>{ if(!confirm("전체 삭제할까요?"))return; words=[]; saveWords(words); render(); });
listEl.addEventListener("click",(e)=>{
  const btn=e.target.closest("button"); if(!btn)return;
  const id=btn.dataset.id, act=btn.dataset.act, idx=words.findIndex(w=>w.id===id);
  if(act==="speak"){ const t=words.find(w=>w.id===id); if(t) speak(`${t.word}. ${t.example||""}`); return; }
  if(idx<0)return;
  if(act==="inc")words[idx].level++;
  if(act==="dec")words[idx].level=Math.max(1,words[idx].level-1);
  if(act==="reset"){words[idx].correct=0;words[idx].wrong=0;words[idx].lastTested=0;}
  if(act==="del")words.splice(idx,1);
  saveWords(words); render();
});
searchEl.addEventListener("input",render);
sortEl.addEventListener("change",render);

/* ===== 발음(TTS) ===== */
function speak(text){try{const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=0.95;speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}

/* ===== 백업/복원 ===== */
btnExport.addEventListener("click",()=>{
  const data=JSON.stringify(words,null,2);
  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  const ts=new Date().toISOString().replace(/[:.]/g,"-"); a.download=`ewa-backup-${ts}.json`; a.click();
  URL.revokeObjectURL(a.href);
});
fileImport.addEventListener("change",async(e)=>{
  const f=e.target.files?.[0]; if(!f)return;
  const text=await f.text();
  try{
    const arr=JSON.parse(text); if(!Array.isArray(arr))throw 0;
    words=arr.map(x=>({id:x.id||uid(),word:String(x.word||"").trim(),meaning:String(x.meaning||"").trim(),example:String(x.example||""),level:Number.isFinite(x.level)?x.level:1,createdAt:Number.isFinite(x.createdAt)?x.createdAt:Date.now(),correct:Number.isFinite(x.correct)?x.correct:0,wrong:Number.isFinite(x.wrong)?x.wrong:0,lastTested:Number.isFinite(x.lastTested)?x.lastTested:0})).filter(x=>x.word&&x.meaning);
    saveWords(words); render(); alert("복원 완료!");
  }catch{ alert("JSON 형식이 올바르지 않습니다."); } finally{ e.target.value=""; }
});

/* ===== 퀴즈 ===== */
let quizState={pool:[],idx:0,score:0};
function openQuiz(){ if(words.length<4){alert("퀴즈는 단어가 최소 4개 이상 필요해요.");return;}
  quizState.pool=shuffle([...words]); quizState.idx=0; quizState.score=0; quizModal.classList.remove("hidden"); nextQuestion();}
function closeQuiz(){ quizModal.classList.add("hidden"); try{speechSynthesis.cancel()}catch{} }
function nextQuestion(){
  qChoices.innerHTML=""; qNext.disabled=true;
  const total=Math.min(quizState.pool.length,20);
  if(quizState.idx>=total){ qWord.textContent=`완료! 최종 점수: ${quizState.score} / ${total}`; qCount.textContent=`${total}/${total}`; return; }
  const correct=quizState.pool[quizState.idx];
  qWord.textContent=correct.word; qCount.textContent=`${quizState.idx+1}/${total}`; qScore.textContent=`점수 ${quizState.score}`;
  const others=shuffle(words.filter(w=>w.id!==correct.id)).slice(0,3);
  const options=shuffle([correct,...others]);
  options.forEach(opt=>{
    const div=document.createElement("div"); div.className="choice"; div.textContent=opt.meaning; div.dataset.id=opt.id;
    div.addEventListener("click",()=>{
      Array.from(qChoices.children).forEach(el=>el.classList.add("disabled"));
      const ok=(opt.id===correct.id);
      if(ok){div.classList.add("correct");quizState.score++;correct.correct=(correct.correct||0)+1;}
      else{div.classList.add("wrong");const c=Array.from(qChoices.children).find(el=>el.dataset.id===correct.id);c?.classList.add("correct");correct.wrong=(correct.wrong||0)+1;}
      correct.lastTested=Date.now(); saveWords(words); qScore.textContent=`점수 ${quizState.score}`; qNext.disabled=false; speak(`${correct.word}. ${correct.example||""}`);
    });
    qChoices.appendChild(div);
  });
}
btnQuiz.addEventListener("click",openQuiz);
quizClose.addEventListener("click",closeQuiz);
qRestart.addEventListener("click",()=>{quizState.idx=0;quizState.score=0;nextQuestion();});
qNext.addEventListener("click",()=>{quizState.idx++;nextQuestion();});

/* ===== 통계 ===== */
btnStats.addEventListener("click",()=>{renderStats();statsModal.classList.remove("hidden");});
statsClose.addEventListener("click",()=>statsModal.classList.add("hidden"));
function renderStats(){
  const totalWords=words.length;
  const totals=words.reduce((a,w)=>{a.correct+=(w.correct||0);a.wrong+=(w.wrong||0);return a;},{correct:0,wrong:0});
  const attempts=totals.correct+totals.wrong; const acc=attempts?Math.round((totals.correct/attempts)*100):0;
  const todayKey=new Date().toDateString();
  const todayCount=words.filter(w=>w.lastTested&&new Date(w.lastTested).toDateString()===todayKey).length;
  stTotal.textContent=String(totalWords); stAcc.textContent=`${acc}%`; stToday.textContent=String(todayCount);
  const byWeak=[...words].map(w=>{const t=(w.correct||0)+(w.wrong||0);const rate=t?(w.correct/t):0;return {...w,tries:t,acc:rate};})
    .sort((a,b)=>{ if(a.tries>=3&&b.tries<3)return -1; if(a.tries<3&&b.tries>=3)return 1; return a.acc-b.acc; }).slice(0,10);
  weakList.innerHTML=""; byWeak.forEach(w=>{const t=w.tries, accPct=t?Math.round(w.acc*100):0;
    const li=document.createElement("li"); li.className="weak-item";
    li.innerHTML=`<div style="min-width:120px;"><div><strong>${escapeHtml(w.word)}</strong></div><div class="badge">${escapeHtml(w.meaning)}</div><div class="badge">정답 ${w.correct||0} / 시도 ${t}</div></div><div class="bar"><i style="width:${accPct}%;"></i></div><div style="min-width:48px;text-align:right;">${accPct}%</div>`;
    weakList.appendChild(li);
  });
  const recent=[...words].filter(w=>w.lastTested).sort((a,b)=>b.lastTested-a.lastTested).slice(0,10);
  recentList.innerHTML=""; recent.forEach(w=>{const t=(w.correct||0)+(w.wrong||0); const accPct=t?Math.round((w.correct/t)*100):0;
    const li=document.createElement("li"); li.className="weak-item";
    li.innerHTML=`<div style="min-width:120px;"><div><strong>${escapeHtml(w.word)}</strong></div><div class="badge">${escapeHtml(w.meaning)}</div></div><div class="badge">최근: ${new Date(w.lastTested).toLocaleString()}</div><div class="badge">정답 ${w.correct||0} / 시도 ${t} · ${accPct}%</div>`;
    recentList.appendChild(li);
  });
}

/* ===== 대량 등록 (텍스트 파서) ===== */
let bulkParsed=[];
function parseBulkText(text){
  const rows=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  for(const row of rows){
    // "word - 뜻 | 예문" 또는 "word: 뜻 | 예문"
    const [left, ex=""] = row.split("|").map(s=>s.trim());
    if(!left)continue;
    const m = left.split(/[-:]/); // - 또는 :
    if(m.length<2) continue;
    const word=m[0].trim(); const meaning=m.slice(1).join("-").trim(); // 뜻에 -가 들어가면 보존
    if(!word || !meaning) continue;
    out.push({word,meaning,example:ex});
  }
  return out;
}
function renderBulkPreview(list){
  bulkPreview.innerHTML="";
  list.forEach(it=>{
    const li=document.createElement("li"); li.className="weak-item";
    li.innerHTML=`<div style="flex:1;"><strong>${escapeHtml(it.word)}</strong> — ${escapeHtml(it.meaning)} ${it.example?`<div class="badge">${escapeHtml(it.example)}</div>`:""}</div>`;
    bulkPreview.appendChild(li);
  });
  bulkApply.disabled = list.length===0;
}
btnBulk.addEventListener("click",()=>{bulkModal.classList.remove("hidden");});
bulkClose.addEventListener("click",()=>{bulkModal.classList.add("hidden");});
bulkParse.addEventListener("click",()=>{
  bulkParsed=parseBulkText(bulkText.value);
  renderBulkPreview(bulkParsed);
});
bulkApply.addEventListener("click",()=>{
  if(bulkParsed.length===0)return;
  const now=Date.now();
  bulkParsed.forEach(it=>words.push({id:uid(),word:it.word,meaning:it.meaning,example:it.example||"",level:1,createdAt:now,correct:0,wrong:0,lastTested:0}));
  saveWords(words); render();
  alert(`${bulkParsed.length}개 등록 완료!`);
  bulkParsed=[]; bulkPreview.innerHTML=""; bulkText.value="";
});

/* ===== 대량 등록 (이미지 → OCR → 텍스트 자동 채움) ===== */
bulkImage.addEventListener("change", async (e)=>{
  const file=e.target.files?.[0]; if(!file)return;
  ocrStatus.textContent="이미지 인식 중...(해상도/조명에 따라 수 초 걸릴 수 있어요)";
  try{
    const { data:{ text } } = await Tesseract.recognize(file, 'eng+kor', {
      logger:m=>{ if(m.status==="recognizing text"){ ocrStatus.textContent=`OCR 진행: ${Math.round((m.progress||0)*100)}%`; } }
    });
    // OCR 결과를 텍스트 박스에 넣고 미리보기 실행
    bulkText.value = text;
    bulkParsed = parseBulkText(text);
    renderBulkPreview(bulkParsed);
    ocrStatus.textContent = `OCR 완료: ${bulkParsed.length}개 항목 인식`;
  }catch(err){
    console.error(err);
    ocrStatus.textContent="OCR 실패: 이미지 선명도/각도/해상도를 확인해 주세요.";
  }finally{
    e.target.value="";
  }
});

/* ===== 초기 ===== */
render();
