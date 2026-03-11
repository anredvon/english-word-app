/* ====== 공통 유틸 ====== */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]} return b; }
function today(){ return new Date().toISOString().slice(0,10); }
async function jget(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function jpost(url, body){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

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
const quizModal=$("quizModal"), quizClose=$("quizClose");
const qCount=$("qCount"), qScore=$("qScore"), qWord=$("qWord"), qChoices=$("qChoices");
const qNext=$("qNext"), qRestart=$("qRestart");
/* 주관식 입력 */
const qInputWrap=$("qInputWrap"), qInput=$("qInput"), qSubmit=$("qSubmit");
/* 통계 모달 */
const statsModal=$("statsModal"), statsClose=$("statsClose");
const stTotal=$("stTotal"), stAcc=$("stAcc"), stToday=$("stToday");
const weakList=$("weakList"), recentList=$("recentList");

/* ====== 상태 ====== */
let words = [];
let currentFilterDate = "";
let currentQuery = "";
let bulkParsed = [];
let quizFullPool = []; // 오답재시도용 원본 풀 저장

let quizState = { pool:[], idx:0, score:0, wrongIds:[], mode:"en2ko" };

/* ====== 초기값 ====== */
if (regDateEl) regDateEl.value = today();
if (bulkDateEl) bulkDateEl.value = today();
if (filterDateEl) filterDateEl.value = today();
if (bulkSection) bulkSection.classList.add("hidden");

/* ====== 토스트 알림 (alert 대체) ====== */
function showToast(msg, type="info"){
  let toast = $("toastMsg");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "toastMsg";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> toast.classList.remove("show"), 2000);
}

/* ====== 퀴즈 피드백 오버레이 ====== */
function showFeedback(isCorrect){
  const overlay = $("feedbackOverlay");
  if(!overlay) return;
  overlay.textContent = isCorrect ? "🎉 정답!" : "😢 오답!";
  overlay.className = `feedback-overlay ${isCorrect ? "correct" : "wrong"} show`;
  setTimeout(()=> overlay.classList.remove("show"), 900);
}

/* ====== 토글: 대량 등록 열기/닫기 ====== */
toggleBulk?.addEventListener("click", () => {
  const isHidden = bulkSection.classList.toggle("hidden");
  toggleBulk.textContent = isHidden ? "열기" : "닫기";
});

/* ====== 서버에서 목록 로드 ====== */
async function loadWords({date, q}={}){
  const params = new URLSearchParams();
  if(date) params.set("date", date);
  if(q) params.set("q", q);
  const url = "/api/words" + (params.toString() ? `?${params.toString()}` : "");
  try {
    words = await jget(url);
    render();
  } catch(e) {
    showToast("목록을 불러오지 못했습니다.", "error");
  }
}

/* ====== 발음 ====== */
function speakWord(word){
  if(!("speechSynthesis" in window)){ showToast("이 브라우저는 음성합성을 지원하지 않아요.", "error"); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.95;
  u.pitch = 1.2;
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
  if(arr.length === 0){
    listEl.innerHTML = `<li class="empty-state">📭 단어가 없어요! 단어를 등록해보세요.</li>`;
    return;
  }

  arr.forEach(it=>{
    const total=(it.correct||0)+(it.wrong||0);
    const acc = total ? Math.round((it.correct||0)*100/total) : 0;
    const li = document.createElement("li");
    li.className = "word-card";
    li.innerHTML = `
      <h3>${esc(it.word)}</h3>
      <p><strong>뜻</strong> ${esc(it.meaning)}</p>
      ${it.example ? `<p><strong>예문</strong> ${esc(it.example)}</p>` : ""}
      <div class="meta">
        <span>📅 ${esc(it.registered_on || "")}</span>
        <span>🎯 정답률 ${acc}% (${it.correct||0}/${total||0})</span>
      </div>
      <div class="row gap">
        <button class="ghost sm btn-speak" data-word="${esc(it.word)}">🔊 발음</button>
        <button class="ghost sm danger btn-del" data-id="${it.id}">🗑️ 삭제</button>
      </div>
    `;
    listEl.appendChild(li);

    li.querySelector(".btn-speak")?.addEventListener("click", (e)=>{
      speakWord(e.currentTarget.getAttribute("data-word"));
    });
    li.querySelector(".btn-del")?.addEventListener("click", async (e)=>{
      if(!confirm("정말 삭제할까요?")) return;
      try {
        await fetch(`/api/words/${e.currentTarget.getAttribute("data-id")}`, { method: "DELETE" });
        await loadWords({date: currentFilterDate});
        showToast("삭제되었습니다.", "info");
      } catch(err) {
        showToast("삭제에 실패했습니다.", "error");
      }
    });
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
  if(!payload.word || !payload.meaning){ showToast("단어와 뜻을 입력하세요.", "error"); return; }
  try {
    await jpost("/api/words", payload);
    showToast("✅ 등록되었습니다!", "success");
    form.reset();
    if (regDateEl) regDateEl.value = today();
    await loadWords({date: currentFilterDate});
  } catch(err) {
    showToast("등록에 실패했습니다.", "error");
  }
});

/* ====== 날짜 조회 ====== */
loadByDateBtn?.addEventListener("click", async ()=>{
  currentFilterDate = filterDateEl?.value || "";
  await loadWords({date: currentFilterDate, q: currentQuery});
});
searchEl?.addEventListener("input", ()=> render());
sortEl?.addEventListener("change", ()=> render());

/* ====== 대량 등록 ====== */
function parseBulkText(text){
  return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(row=>{
    const [left, example=""] = row.split("|").map(s=>s.trim());
    const m = left.split(/[-:]/);
    if(m.length<2) return null;
    return {word:m[0].trim(), meaning:m.slice(1).join("-").trim(), example};
  }).filter(Boolean);
}

function renderBulkPreview(list){
  bulkPreview.innerHTML="";
  list.forEach(it=>{
    const li = document.createElement("li");
    li.className="weak-item";
    li.innerHTML = `<div><strong>${esc(it.word)}</strong> <span class="badge">${esc(it.meaning)}</span></div>${it.example?`<div>${esc(it.example)}</div>`:""}`;
    bulkPreview.appendChild(li);
  });
  if(bulkApplyBtn) bulkApplyBtn.disabled = list.length === 0;
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
  bulkSpinner.classList.remove("hidden");
  try{
    const res = await jpost("/api/words/bulk", { items: bulkParsed.map(it=>({...it, registered_on:d})) });
    bulkStatus.textContent = `완료: ${res.inserted}개 등록`;
    showToast(`✅ ${res.inserted}개 등록 완료!`, "success");
    bulkInput.value=""; bulkParsed=[]; renderBulkPreview([]);
    await loadWords({date: currentFilterDate});
  } catch(err) {
    showToast("대량 등록에 실패했습니다.", "error");
    bulkApplyBtn.disabled = false;
  } finally {
    bulkSpinner.classList.add("hidden");
  }
});

/* ====== 퀴즈 ====== */
btnQuiz?.addEventListener("click", async ()=>{
  const d = filterDateEl?.value || "";
  try {
    const pool = await jget(`/api/quiz${d?`?date=${d}`:""}`);
    if(pool.length<4){ showToast("퀴즈는 단어가 최소 4개 이상 필요해요.", "error"); return; }
    quizFullPool = pool; // 원본 저장
    quizState.pool = shuffle(pool).slice(0, 100);
    quizState.idx=0; quizState.score=0; quizState.wrongIds=[];
    quizState.mode = quizModeSel?.value || "en2ko";
    if(qWrongOnly) qWrongOnly.disabled = true;
    quizModal.classList.remove("hidden");
    nextQuestion();
  } catch(err) {
    showToast("퀴즈를 불러오지 못했습니다.", "error");
  }
});

// 오답만 다시: 원본 풀에서 필터 (버그 수정)
qWrongOnly?.addEventListener("click", ()=>{
  if(!quizState.wrongIds.length) return;
  const wrongSet = new Set(quizState.wrongIds);
  quizState.pool = shuffle(quizFullPool.filter(w => wrongSet.has(w.id)));
  quizState.idx=0; quizState.score=0; quizState.wrongIds=[];
  if(qWrongOnly) qWrongOnly.disabled = true;
  nextQuestion();
});

quizClose?.addEventListener("click", ()=> quizModal.classList.add("hidden"));
qRestart?.addEventListener("click", ()=>{ quizState.idx=0; quizState.score=0; nextQuestion(); });
qNext?.addEventListener("click", ()=>{ quizState.idx++; nextQuestion(); });

/* ====== 퀴즈 진행 ====== */
function updateProgressBar(){
  const bar = $("quizProgressBar");
  if(!bar) return;
  const total = quizState.pool.length;
  const pct = total ? Math.round((quizState.idx / total) * 100) : 0;
  bar.style.width = pct + "%";
}

function nextQuestion(){
  qChoices.innerHTML = "";
  qNext.disabled = true;
  qInputWrap.classList.add("hidden");
  if(qInput) qInput.value = "";

  const total = quizState.pool.length;
  updateProgressBar();

  if(quizState.idx >= total){
    qWord.innerHTML = `🏆 완료!<br><span style="font-size:16px">최종 점수: ${quizState.score} / ${total}</span>`;
    qCount.textContent = `${total}/${total}`;
    if(qWrongOnly) qWrongOnly.disabled = quizState.wrongIds.length === 0;
    return;
  }

  const correct = quizState.pool[quizState.idx];
  const mode = quizState.mode;
  const others = shuffle(quizState.pool.filter(w => w.id !== correct.id)).slice(0,3);

  if(mode === "en2ko"){
    qWord.textContent = correct.word;
    shuffle([correct, ...others]).forEach(opt => addChoice(opt.meaning, opt.id === correct.id, correct.id));
  } else if(mode === "ko2en"){
    qWord.textContent = correct.meaning;
    shuffle([correct, ...others]).forEach(opt => addChoice(opt.word, opt.id === correct.id, correct.id));
  } else if(mode === "cloze"){
    const sentence = (correct.example || `${correct.word} is ...`)
      .replace(new RegExp(correct.word, "ig"), "_____");
    qWord.textContent = sentence;
    shuffle([correct, ...others]).forEach(opt => addChoice(opt.word, opt.id === correct.id, correct.id));
  } else if(mode === "en2ko_input"){
    qWord.textContent = correct.word;
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "한국어 뜻 입력";
    // onclick으로만 처리 (addEventListener 중복 방지)
    qSubmit.onclick = ()=> checkInputAnswer(correct.meaning, correct.id);
  } else if(mode === "ko2en_input"){
    qWord.textContent = correct.meaning;
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "영어 단어 입력";
    qSubmit.onclick = ()=> checkInputAnswer(correct.word, correct.id);
  } else if(mode === "cloze_input"){
    const sentence = (correct.example || `${correct.word} is ...`)
      .replace(new RegExp(correct.word, "ig"), "_____");
    qWord.textContent = sentence;
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "정답 단어(영어) 입력";
    qSubmit.onclick = ()=> checkInputAnswer(correct.word, correct.id);
  }

  qCount.textContent = `${quizState.idx+1}/${total}`;
  qScore.textContent = `점수 ${quizState.score}`;
}

function checkInputAnswer(answer, wid){
  const user = (qInput?.value || "").trim().toLowerCase();
  const target = (answer||"").trim().toLowerCase();
  if(qInput) qInput.value = "";

  const isCorrect = user === target;
  showFeedback(isCorrect);

  if(isCorrect){
    quizState.score++;
    jpost(`/api/words/${wid}/result`, {correct: true}).catch(()=>{});
  } else {
    showToast(`정답: ${answer}`, "error");
    quizState.wrongIds.push(wid);
    jpost(`/api/words/${wid}/result`, {correct: false}).catch(()=>{});
  }
  qScore.textContent = `점수 ${quizState.score}`;
  qNext.disabled = false;
}

function addChoice(label, isCorrect, correctId){
  const div = document.createElement("div");
  div.className = "choice";
  div.textContent = label;
  div.addEventListener("click", async ()=>{
    [...qChoices.children].forEach(el => el.classList.add("disabled"));
    if(isCorrect){
      div.classList.add("correct");
      quizState.score++;
      showFeedback(true);
      jpost(`/api/words/${correctId}/result`, {correct:true}).catch(()=>{});
    } else {
      div.classList.add("wrong");
      quizState.wrongIds.push(correctId);
      showFeedback(false);
      jpost(`/api/words/${correctId}/result`, {correct:false}).catch(()=>{});
    }
    qScore.textContent = `점수 ${quizState.score}`;
    qNext.disabled = false;
  });
  qChoices.appendChild(div);
}

/* ====== 통계 ====== */
btnStats?.addEventListener("click", async ()=>{
  const to = today();
  const from = new Date(Date.now()-29*24*60*60*1000).toISOString().slice(0,10);
  try {
    const rows = await jget(`/api/stats/daily?from=${from}&to=${to}`);
    const totalWords = rows.reduce((a,r)=>a+r.words,0);
    const sumCorrect = rows.reduce((a,r)=>a+(r.correct||0),0);
    const sumWrong = rows.reduce((a,r)=>a+(r.wrong||0),0);
    const attempts = sumCorrect + sumWrong;
    stTotal.textContent = totalWords;
    stAcc.textContent = attempts ? `${Math.round(sumCorrect*100/attempts)}%` : "0%";
    const todayRow = rows.find(r=>r.day===to);
    stToday.textContent = todayRow ? todayRow.words : 0;
    statsModal.classList.remove("hidden");
  } catch(err) {
    showToast("통계를 불러오지 못했습니다.", "error");
  }
});
statsClose?.addEventListener("click", ()=> statsModal.classList.add("hidden"));

/* ====== 최초 로드 ====== */
currentFilterDate = filterDateEl?.value || "";
loadWords({date: currentFilterDate});
