function escapeRegExp(str){return String(str).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
/* ====== 공통 유틸 ====== */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function today(){ const d=new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
async function jget(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function jpost(url, body){ const r=await fetch(url,{method:"POST",headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

/* ====== 엘리먼트 ====== */
const form = $("wordForm");
const wordEl = $("word");
const meaningEl = $("meaning");
const exampleEl = $("example");
const regDateEl = $("regDate");

const bulkSection = $("bulkSection");
const toggleBulk = $("toggleBulk");
const bulkInput = $("bulkInput");
const bulkDateEl = $("bulkDate");
const bulkParseBtn = $("bulkParse");
const bulkApplyBtn = $("bulkApply");
const bulkPreview = $("bulkPreview");
const bulkStatus = $("bulkStatus");
const bulkSpinner = $("bulkSpinner");

const filterDateEl = $("filterDate");
const loadByDateBtn = $("loadByDate");
const listEl = $("wordList");
const searchEl = $("search");
const sortEl = $("sort");
const btnQuiz = $("btnQuiz");
const btnStats = $("btnStats");

const quizModeSel = $("quizMode");
const qWrongOnly = $("qWrongOnly");

/* 퀴즈 모달 */
/* 주관식 입력 요소 */
const qInputWrap = $("qInputWrap");
const qInput = $("qInput");
const qSubmit = $("qSubmit");
const quizModal=$("quizModal"), quizClose=$("quizClose"), qCount=$("qCount"), qScore=$("qScore"), qWord=$("qWord"), qChoices=$("qChoices"), qNext=$("qNext"), qRestart=$("qRestart");
/* 통계 모달 */
const statsModal=$("statsModal"), statsClose=$("statsClose"), stTotal=$("stTotal"), stAcc=$("stAcc"), stToday=$("stToday"), weakList=$("weakList"), recentList=$("recentList");

/* ====== 상태 ====== */
let words=[];                 
let currentFilterDate="";     
let currentQuery="";
let bulkParsed=[];
let quizState = { pool:[], idx:0, score:0, wrongIds:[], mode:"en2ko" };

/* ====== 초기값 ====== */
if (regDateEl) regDateEl.value = today();
if (bulkDateEl) bulkDateEl.value = today();
if (filterDateEl) filterDateEl.value = today();

/* ====== 토글: 대량 등록 열기/닫기 ====== */
toggleBulk?.addEventListener("click", ()=>{
  const isHidden = bulkSection.classList.toggle("hidden");
  toggleBulk.textContent = isHidden ? "열기" : "닫기";
});

/* ====== 서버에서 목록 로드 ====== */
async function loadWords({date, q}={}){
  const params = new URLSearchParams();
  if(date) params.set("date", date);
  if(q) params.set("q", q);
  const url = "/api/words" + (params.toString()?`?${params.toString()}`:"");
  words = await jget(url);
  render();
}

/* ====== 발음 ====== */
function speakWord(word){
  if(!("speechSynthesis" in window)) { alert("이 브라우저는 음성합성을 지원하지 않아요."); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.95;
  u.pitch = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* ====== 렌더 ====== */
function render(){
  let arr = [...words];
  const q = (searchEl?.value || "").trim().toLowerCase();
  if(q) arr = arr.filter(it => it.word.toLowerCase().includes(q) || (it.meaning||"").toLowerCase().includes(q));
  const sort = (sortEl?.value || "created_desc");
  if(sort==="created_desc") arr.sort((a,b)=> (b.id||0)-(a.id||0));
  if(sort==="alpha_asc")   arr.sort((a,b)=> a.word.localeCompare(b.word));
  if(sort==="alpha_desc")  arr.sort((a,b)=> b.word.localeCompare(a.word));

  listEl.innerHTML = "";
  arr.forEach(it=>{
    const total=(it.correct||0)+(it.wrong||0);
    const acc = total? Math.round((it.correct||0)*100/total):0;
    const li = document.createElement("li");
    li.className="word-card";
    li.innerHTML = `
      <h3>${esc(it.word)}</h3>
      <p><strong>뜻</strong> ${esc(it.meaning)}</p>
      ${it.example?`<p><strong>예문</strong> ${esc(it.example)}</p>`:""}
      <div class="meta">
        <span>등록일 ${esc(it.registered_on || "")}</span>
        <span>정답률 ${acc}% (${it.correct||0}/${total||0})</span>
      </div>
      <div class="row gap">
        <button class="ghost sm btn-speak" data-word="${esc(it.word)}">🔊 발음</button>
        <button class="ghost sm danger btn-del" data-id="${it.id}">삭제</button>
      </div>
    `;
    listEl.appendChild(li);

    // 이벤트
    li.querySelector(".btn-speak")?.addEventListener("click", (e)=>{
      const w = e.currentTarget.getAttribute("data-word");
      speakWord(w);
    });
    li.querySelector(".btn-del")?.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-id");
      if(!confirm("정말 삭제할까요?")) return;
      await fetch(`/api/words/${id}`, { method: "DELETE" });
      await loadWords({date: currentFilterDate});
    });
  }); // <-- forEach 닫기 (중요)
}

/* ====== 단일 등록 ====== */
form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    word: (wordEl.value||"").trim(),
    meaning: (meaningEl.value||"").trim(),
    example: (exampleEl.value||"").trim(),
    level: 1,
    registered_on: regDateEl?.value || today(),
  };
  if(!payload.word || !payload.meaning){ alert("단어와 뜻을 입력하세요."); return; }
  await jpost("/api/words", payload);
  form.reset();
  if (regDateEl) regDateEl.value = today();
  await loadWords({date: currentFilterDate});
});

/* ====== 날짜 조회/검색/정렬 ====== */
loadByDateBtn?.addEventListener("click", async ()=>{
  currentFilterDate = filterDateEl?.value || "";
  await loadWords({date: currentFilterDate, q: currentQuery});
});
searchEl?.addEventListener("input", ()=> render());
sortEl?.addEventListener("change", ()=> render());

/* ====== 대량 등록: 파서/미리보기/적용 ====== */
function parseBulkText(text){
  const rows = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  for(const row of rows){
    const [left, example=""] = row.split("|").map(s=>s.trim());
    if(!left) continue;
    const m = left.split(/[-:]/);
    if(m.length<2) continue;
    const word = m[0].trim();
    const meaning = m.slice(1).join("-").trim();
    if(!word || !meaning) continue;
    out.push({word, meaning, example});
  }
  return out;
}
function renderBulkPreview(list){
  bulkPreview.innerHTML="";
  list.forEach(it=>{
    const li = document.createElement("li");
    li.className="weak-item";
    li.innerHTML = `<div><strong>${esc(it.word)}</strong> <span class="badge">${esc(it.meaning)}</span></div>
                    ${it.example?`<div class="badge">${esc(it.example)}</div>`:""}`;
    bulkPreview.appendChild(li);
  });
  bulkApplyBtn.disabled = list.length===0;
}
bulkParseBtn?.addEventListener("click", ()=>{
  bulkParsed = parseBulkText(bulkInput.value);
  renderBulkPreview(bulkParsed);
  bulkStatus.textContent = bulkParsed.length ? `인식된 항목: ${bulkParsed.length}개` : `항목이 없습니다.`;
});
bulkApplyBtn?.addEventListener("click", async ()=>{
  if (!bulkParsed.length) return;
  const d = bulkDateEl?.value || today();

  bulkApplyBtn.disabled = true;
  bulkParseBtn.disabled = true;
  bulkSpinner.classList.remove("hidden");
  bulkStatus.textContent = `등록 중...`;

  const items = bulkParsed.map(it=>({
    word: it.word, meaning: it.meaning, example: it.example||"", registered_on: d
  }));

  try{
    const res = await jpost("/api/words/bulk", { items });
    if (!res.ok && typeof res.inserted !== "number") throw new Error(res.error || "bulk failed");
    bulkStatus.textContent = `완료: ${res.inserted}개 등록`;
  }catch(err){
    console.warn("Bulk API 실패, 개별 POST로 폴백:", err);
    let ok=0, fail=0;
    const BATCH_SIZE = 10;
    for (let i=0;i<bulkParsed.length;i+=BATCH_SIZE){
      const slice = bulkParsed.slice(i, i+BATCH_SIZE);
      const results = await Promise.allSettled(
        slice.map(it => jpost("/api/words", {
          word: it.word, meaning: it.meaning, example: it.example||"",
          level: 1, registered_on: d
        }))
      );
      results.forEach(r => { if(r.status==="fulfilled") ok++; else { fail++; console.error("대량등록 실패:", r.reason);} });
      bulkStatus.textContent = `등록 중... ${ok+fail}/${bulkParsed.length}`;
    }
    bulkStatus.textContent = `완료: ${ok}개 등록, 실패 ${fail}개`;
  }finally{
    bulkSpinner.classList.add("hidden");
    bulkInput.value=""; bulkParsed=[]; renderBulkPreview([]);
    bulkApplyBtn.disabled = true;
    bulkParseBtn.disabled = false;
    await loadWords({date: currentFilterDate});
  }
});

/* ====== 퀴즈 ====== */
btnQuiz?.addEventListener("click", async ()=>{
  const d = filterDateEl?.value || "";
  const pool = await jget(`/api/quiz2${d?`?date=${d}`:""}`);
  if(pool.length<4){ alert("퀴즈는 단어가 최소 4개 이상 필요해요."); return; }

  quizState.pool = shuffle(pool).slice(0, 50);
  quizState.idx=0; quizState.score=0; quizState.wrongIds=[];
  quizState.mode = quizModeSel?.value || "en2ko";

  qWrongOnly.disabled = true;
  quizModal.classList.remove("hidden"); document.body.classList.add("modal-open");
  if(qInputWrap){ qInputWrap.classList.add("hidden"); if(qInput){ qInput.value=""; qInput.disabled=false; } if(qSubmit){ qSubmit.disabled=false; } }
  nextQuestion();
});
qWrongOnly?.addEventListener("click", ()=>{
  if(!quizState.wrongIds.length) return;
  quizState.pool = shuffle(words.filter(w=> quizState.wrongIds.includes(w.id)));
  quizState.idx=0; quizState.score=0;
  quizState.wrongIds = [];
  qWrongOnly.disabled = true;
  nextQuestion();
});
quizClose?.addEventListener("click", ()=> quizModal.classList.add("hidden"));
qRestart?.addEventListener("click", ()=>{ quizState.idx=0; quizState.score=0; nextQuestion(); });
qNext?.addEventListener("click", ()=>{ quizState.idx++; nextQuestion(); });

function nextQuestion(){qChoices.innerHTML=""; qNext.disabled=true;
const total = quizState.pool.length;

// 주관식 UI 초기화
if (qInputWrap) { qInputWrap.classList.add("hidden"); }
if (qSubmit) { qSubmit.disabled = false; }
if (qInput) { qInput.value=""; }

if(quizState.idx>=total){
  qWord.textContent=`완료! 최종 점수: ${quizState.score} / ${total}`;
  qCount.textContent=`${total}/${total}`;
  qWrongOnly.disabled = quizState.wrongIds.length===0;
  return;
}

const correct = quizState.pool[quizState.idx];
const mode = quizState.mode;

const others = shuffle(quizState.pool.filter(w=>w.id!==correct.id)).slice(0,3);
let options = [];

const isSubjective = (mode === "sa_en2ko" || mode === "sa_ko2en" || mode === "sa_cloze");

if (!isSubjective) {
  // === 객관식 ===
  if(mode === "en2ko"){
    qWord.textContent = correct.word;
    options = shuffle([correct, ...others]);
    options.forEach(opt => addChoice(opt.meaning, opt.id === correct.id));
  } else if(mode === "ko2en"){
    qWord.textContent = correct.meaning;
    options = shuffle([correct, ...others]);
    options.forEach(opt => addChoice(opt.word, opt.id === correct.id));
  } else { // cloze
    const sentence = (correct.example || `${correct.word} is ...`).replace(new RegExp(correct.word, "ig"), "_____");
    qWord.textContent = sentence;
    options = shuffle([correct, ...others]);
    options.forEach(opt => addChoice(opt.word, opt.id === correct.id));
  }
} else {
  // === 주관식 ===
  if (mode === "sa_en2ko") {
    qWord.textContent = correct.word;
  } else if (mode === "sa_ko2en") {
    qWord.textContent = correct.meaning;
  } else {
    const sentence = (correct.example || `${correct.word} is ...`).replace(new RegExp(correct.word, "ig"), "_____");
    qWord.textContent = sentence;
  }

  if (qInputWrap) qInputWrap.classList.remove("hidden");
  if (qChoices) qChoices.innerHTML = "";
  qNext.disabled = true;

  if (qSubmit) {
    const old = qSubmit._handler;
    if (old) qSubmit.removeEventListener("click", old);
    const handler = async () => {
      const ua = normalizeAnswer(qInput?.value);
      let expected = "";
      if (mode === "sa_en2ko") expected = normalizeAnswer(correct.meaning);
      else if (mode === "sa_ko2en") expected = normalizeAnswer(correct.word);
      else expected = normalizeAnswer(correct.word);

      const isCorrect = ua && ua == expected;

      if (isCorrect) {
        quizState.score++;
        try { await jpost(`/api/words/${correct.id}/result`, {correct: true}); } catch(e){}
      } else {
        quizState.wrongIds.push(correct.id);
        try { await jpost(`/api/words/${correct.id}/result`, {correct: false}); } catch(e){}
      }
      qNext.disabled = false;
      if (qInput) qInput.disabled = true;
      qSubmit.disabled = true;
      if (qInput) {
        qInput.style.borderColor = isCorrect ? "#16a34a" : "#ef4444";
        qInput.style.background = isCorrect ? "#ecfdf5" : "#fef2f2";
      }
    };
    qSubmit.addEventListener("click", handler);
    qSubmit._handler = handler;

    if (qInput) {
      const oldKey = qInput._keyHandler;
      if (oldKey) qInput.removeEventListener("keydown", oldKey);
      const keyHandler = (ev)=>{ if (ev.key === "Enter") { ev.preventDefault(); qSubmit.click(); } };
      qInput.addEventListener("keydown", keyHandler);
      qInput._keyHandler = keyHandler;
      qInput.disabled = false;
      qInput.focus();
      qInput.style.borderColor = "";
      qInput.style.background = "";
    }
  }
}

qCount.textContent = `${quizState.idx+1}/${total}`;
qScore.textContent = `점수 ${quizState.score}`;

function addChoice(label, isCorrect){
  const div = document.createElement("div");
  div.className="choice";
  div.textContent = label;
  div.addEventListener("click", async ()=>{
    [...qChoices.children].forEach(el=>el.classList.add("disabled"));
    if(isCorrect){
      div.classList.add("correct");
      quizState.score++;
      try{ await jpost(`/api/words/${correct.id}/result`, {correct: true}); }catch(e){}
    }else{
      div.classList.add("wrong");
      quizState.wrongIds.push(correct.id);
      const correctText = (mode==="en2ko") ? correct.meaning : correct.word;
      const c = [...qChoices.children].find(el=>el.textContent===correctText);
      c && c.classList.add("correct");
      try{ await jpost(`/api/words/${correct.id}/result`, {correct: false}); }catch(e){}
    }
    qScore.textContent = `점수 ${quizState.score}`;
    qNext.disabled=false;
  });
  qChoices.appendChild(div);
}}

/* ====== 통계 ====== */
btnStats?.addEventListener("click", async ()=>{
  const to = today();
  const from = new Date(Date.now()-29*24*60*60*1000).toISOString().slice(0,10);
  const rows = await jget(`/api/stats/daily?from=${from}&to=${to}`);

  const totalWords = rows.reduce((a,r)=>a+r.words,0);
  const sumCorrect = rows.reduce((a,r)=>a+(r.correct||0),0);
  const sumWrong = rows.reduce((a,r)=>a+(r.wrong||0),0);
  const attempts = sumCorrect + sumWrong;
  const acc = attempts? Math.round(sumCorrect*100/attempts):0;

  stTotal.textContent = String(totalWords);
  stAcc.textContent = `${acc}%`;
  const todayRow = rows.find(r=>r.day===to);
  stToday.textContent = String(todayRow? todayRow.words: 0);

  const all = await jget("/api/words");
  const e1 = [...all].map(w=>{
    const t=(w.correct||0)+(w.wrong||0);
    const rate = t? (w.correct/t):0;
    return {...w, tries:t, acc:rate};
  }).filter(w=>w.tries>=1)
    .sort((a,b)=>a.acc-b.acc).slice(0,10);
  weakList.innerHTML="";
  e1.forEach(w=>{
    const accPct = w.tries? Math.round(w.acc*100):0;
    const li=document.createElement("li"); li.className="weak-item";
    li.innerHTML=`<div><strong>${esc(w.word)}</strong> <span class="badge">${esc(w.meaning)}</span></div>
                  <div class="badge">정답 ${w.correct||0} / 시도 ${w.tries} · ${accPct}%</div>`;
    weakList.appendChild(li);
  });

  const recent=[...all].filter(w=>w.last_tested).sort((a,b)=> new Date(b.last_tested)-new Date(a.last_tested)).slice(0,10);
  recentList.innerHTML="";
  recent.forEach(w=>{
    const t=(w.correct||0)+(w.wrong||0);
    const accPct = t? Math.round((w.correct||0)*100/t):0;
    const li=document.createElement("li"); li.className="weak-item";
    li.innerHTML=`<div><strong>${esc(w.word)}</strong> <span class="badge">${esc(w.meaning)}</span></div>
                  <div class="badge">최근: ${new Date(w.last_tested).toLocaleString()}</div>
                  <div class="badge">정답 ${w.correct||0} / 시도 ${t} · ${accPct}%</div>`;
    recentList.appendChild(li);
  });

  statsModal.classList.remove("hidden"); document.body.classList.add("modal-open");
});
statsClose?.addEventListener("click", ()=> statsModal.classList.add("hidden"));

/* ====== 최초 로드 ====== */
currentFilterDate = filterDateEl?.value || "";
loadWords({date: currentFilterDate}).catch(err=>{
  console.error(err);
  alert("목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
});


function normalizeAnswer(s){ return String(s||'').trim().toLowerCase(); }
