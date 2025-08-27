/* ====== 공통 유틸 ====== */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function today(){ return new Date().toISOString().slice(0,10); }
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

/* 퀴즈 모달 */
const quizModal=$("quizModal"), quizClose=$("quizClose"), qCount=$("qCount"), qScore=$("qScore"), qWord=$("qWord"), qChoices=$("qChoices"), qNext=$("qNext"), qRestart=$("qRestart");
/* 통계 모달 */
const statsModal=$("statsModal"), statsClose=$("statsClose"), stTotal=$("stTotal"), stAcc=$("stAcc"), stToday=$("stToday"), weakList=$("weakList"), recentList=$("recentList");

/* ====== 상태 ====== */
let words=[];                 // 서버에서 받아온 목록
let currentFilterDate="";     // YYYY-MM-DD
let currentQuery="";
let bulkParsed=[];

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

/* ====== 렌더 ====== */
function render(){
  let arr = [...words];

  // 검색/정렬
  const q = (searchEl?.value || "").trim().toLowerCase();
  if(q) arr = arr.filter(it => it.word.toLowerCase().includes(q) || (it.meaning||"").toLowerCase().includes(q));
  const sort = (sortEl?.value || "created_desc");
  if(sort==="created_desc") arr.sort((a,b)=> (b.id||0)-(a.id||0));
  if(sort==="alpha_asc")   arr.sort((a,b)=> a.word.localeCompare(b.word));
  if(sort==="alpha_desc")  arr.sort((a,b)=> b.word.localeCompare(a.word));

  // 카드 렌더
  listEl.innerHTML = "";
  arr.forEach(it=>{
    const total=(it.correct||0)+(it.wrong||0);
    const acc = total? Math.round((it.correct||0)*100/total):0;
    const li = document.createElement("li");
    li.className="word-card";
    li.innerHTML=`
      <h3>${esc(it.word)}</h3>
      <p><strong>뜻</strong> ${esc(it.meaning)}</p>
      ${it.example?`<p><strong>예문</strong> ${esc(it.example)}</p>`:""}
      <div class="meta">
        <span>등록일 ${esc(it.registered_on || "")}</span>
        <span>정답률 ${acc}% (${it.correct||0}/${total||0})</span>
      </div>
    `;
    listEl.appendChild(li);
  });
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

/* ====== 날짜 조회 ====== */
loadByDateBtn?.addEventListener("click", async ()=>{
  currentFilterDate = filterDateEl?.value || "";
  await loadWords({date: currentFilterDate, q: currentQuery});
});
searchEl?.addEventListener("input", ()=> render());
sortEl?.addEventListener("change", ()=> render());

/* ====== 대량 등록: 파서 ====== */
function parseBulkText(text){
  const rows = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  for(const row of rows){
    // "word - 뜻 | 예문" 또는 "word: 뜻 | 예문"
    const [left, example=""] = row.split("|").map(s=>s.trim());
    if(!left) continue;
    const m = left.split(/[-:]/); // - 또는 :
    if(m.length<2) continue;
    const word = m[0].trim();
    const meaning = m.slice(1).join("-").trim(); // 뜻에 '-' 포함 가능
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

/* ====== 대량 등록: 미리보기 ====== */
bulkParseBtn?.addEventListener("click", ()=>{
  bulkParsed = parseBulkText(bulkInput.value);
  renderBulkPreview(bulkParsed);
  bulkStatus.textContent = bulkParsed.length ? `인식된 항목: ${bulkParsed.length}개` : `항목이 없습니다.`;
});

/* ====== 대량 등록: 등록 (배치 처리 + 스피너 + 진행률 + 에러 로깅) ====== */
bulkApplyBtn?.addEventListener("click", async ()=>{
  if (!bulkParsed.length) return;
  const d = bulkDateEl?.value || today();

  // UI 잠금 + 스피너 on
  bulkApplyBtn.disabled = true;
  bulkParseBtn.disabled = true;
  bulkSpinner.classList.remove("hidden");
  bulkStatus.textContent = `등록 중... 0/${bulkParsed.length}`;

  let ok=0, fail=0;

  // ★ 속도 개선: 10개씩 배치 전송 (동시 전송은 서버 과부하/쿼터 고려하여 1배치씩 직렬 처리)
  const BATCH_SIZE = 10;
  for (let i=0;i<bulkParsed.length;i+=BATCH_SIZE){
    const slice = bulkParsed.slice(i, i+BATCH_SIZE);

    try{
      // 각각 POST (병렬) — 실패 사유 확인을 위해 allSettled 사용
      const results = await Promise.allSettled(
        slice.map(it => jpost("/api/words", {
          word: it.word, meaning: it.meaning, example: it.example||"",
          level: 1, registered_on: d
        }))
      );
      results.forEach(r => {
        if(r.status==="fulfilled") ok++; else {
          fail++;
          // 실패 사유 콘솔에 출력 (PythonAnywhere Error log도 확인)
          console.error("대량등록 실패:", r.reason);
        }
      });
    }catch(batchErr){
      // 배치 전체가 실패한 경우
      console.error("배치 실패:", batchErr);
      fail += slice.length;
    }

    bulkStatus.textContent = `등록 중... ${ok+fail}/${bulkParsed.length}`;
  }

  // 완료 UI
  bulkSpinner.classList.add("hidden");
  bulkStatus.textContent = `완료: ${ok}개 등록, 실패 ${fail}개`;
  bulkInput.value=""; bulkParsed=[]; renderBulkPreview([]);
  bulkApplyBtn.disabled = true;
  bulkParseBtn.disabled = false;

  // 목록 갱신(현재 필터 유지)
  await loadWords({date: currentFilterDate});
});

/* ====== 퀴즈 ====== */
let quizState={pool:[], idx:0, score:0};
btnQuiz?.addEventListener("click", async ()=>{
  const d = filterDateEl?.value || "";
  const pool = await jget(`/api/quiz${d?`?date=${d}`:""}`);
  if(pool.length<4){ alert("퀴즈는 단어가 최소 4개 이상 필요해요."); return; }
  quizState.pool = shuffle(pool).slice(0, 20);
  quizState.idx=0; quizState.score=0;
  quizModal.classList.remove("hidden");
  nextQuestion();
});
quizClose?.addEventListener("click", ()=> quizModal.classList.add("hidden"));
qRestart?.addEventListener("click", ()=>{ quizState.idx=0; quizState.score=0; nextQuestion(); });
qNext?.addEventListener("click", ()=>{ quizState.idx++; nextQuestion(); });

function nextQuestion(){
  qChoices.innerHTML=""; qNext.disabled=true;
  const total = quizState.pool.length;
  if(quizState.idx>=total){
    qWord.textContent=`완료! 최종 점수: ${quizState.score} / ${total}`;
    qCount.textContent=`${total}/${total}`;
    return;
  }
  const correct = quizState.pool[quizState.idx];
  qWord.textContent = correct.word;
  qCount.textContent = `${quizState.idx+1}/${total}`;
  qScore.textContent = `점수 ${quizState.score}`;

  const others = shuffle(quizState.pool.filter(w=>w.id!==correct.id)).slice(0,3);
  const options = shuffle([correct, ...others]);
  options.forEach(opt=>{
    const div = document.createElement("div");
    div.className="choice";
    div.textContent = opt.meaning;
    div.addEventListener("click", async ()=>{
      [...qChoices.children].forEach(el=>el.classList.add("disabled"));
      const ok = (opt.id===correct.id);
      if(ok){ div.classList.add("correct"); quizState.score++; }
      else{
        div.classList.add("wrong");
        const c = [...qChoices.children].find(el=>el.textContent===correct.meaning);
        c && c.classList.add("correct");
      }
      qScore.textContent = `점수 ${quizState.score}`;
      qNext.disabled=false;

      // 서버에 정오답 반영
      try{ await jpost(`/api/words/${correct.id}/result`, {correct: ok}); }catch(e){}
    });
    qChoices.appendChild(div);
  });
}

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

  const all = await jget("/api/words");  // 전체
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

  statsModal.classList.remove("hidden");
});
statsClose?.addEventListener("click", ()=> statsModal.classList.add("hidden"));

/* ====== 최초 로드 ====== */
currentFilterDate = filterDateEl?.value || "";
loadWords({date: currentFilterDate}).catch(err=>{
  console.error(err);
  alert("목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
});
