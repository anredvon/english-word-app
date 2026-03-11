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
const form       = $("wordForm");
const wordEl     = $("word");
const meaningEl  = $("meaning");
const exampleEl  = $("example");
const regDateEl  = $("regDate");

const bulkInput    = $("bulkInput");
const bulkDateEl   = $("bulkDate");
const bulkParseBtn = $("bulkParse");
const bulkApplyBtn = $("bulkApply");
const bulkPreview  = $("bulkPreview");
const bulkStatus   = $("bulkStatus");
const bulkSpinner  = $("bulkSpinner");

const filterDateEl  = $("filterDate");
const loadByDateBtn = $("loadByDate");
const listEl        = $("wordList");
const searchEl      = $("search");
const btnQuiz       = $("btnQuiz");
const quizModeSel   = $("quizMode");
const quizDateEl    = $("quizDate");
const qWrongOnly    = $("qWrongOnly");

const quizArea  = $("quizArea");
const quizClose = $("quizClose");
const qCount    = $("qCount");
const qScore    = $("qScore");
const qWord     = $("qWord");
const qChoices  = $("qChoices");
const qNext     = $("qNext");
const qRestart  = $("qRestart");
const qInputWrap = $("qInputWrap");
const qInput    = $("qInput");
const qSubmit   = $("qSubmit");

const stTotal   = $("stTotal");
const stAcc     = $("stAcc");
const stToday   = $("stToday");
const statsList = $("statsList");
const sidebarToday = $("sidebarToday");

/* ====== 상태 ====== */
let words = [];
let currentFilterDate = "";
let bulkParsed = [];
let quizFullPool = [];
let quizState = { pool:[], idx:0, score:0, wrongIds:[], mode:"en2ko" };

/* ====== 초기값 ====== */
if(regDateEl)    regDateEl.value    = today();
if(bulkDateEl)   bulkDateEl.value   = today();
if(filterDateEl) filterDateEl.value = today();
if(quizDateEl)   quizDateEl.value   = today();

/* ====== 탭 전환 ====== */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.getAttribute("data-tab");
    const pane = $(`tab-${tab}`);
    if(pane) pane.classList.add("active");

    // 통계 탭 진입 시 자동 로드
    if(tab === "stats") loadStats();
    // 단어 카드 탭 진입 시 자동 로드
    if(tab === "cards") loadWords({date: currentFilterDate});
  });
});

/* ====== 토스트 ====== */
function showToast(msg, type="info"){
  let toast = $("toastMsg");
  if(!toast){ toast = document.createElement("div"); toast.id="toastMsg"; document.body.appendChild(toast); }
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> toast.classList.remove("show"), 2200);
}

/* ====== 피드백 오버레이 ====== */
function showFeedback(isCorrect){
  const overlay = $("feedbackOverlay");
  if(!overlay) return;
  overlay.textContent = isCorrect ? "🎉" : "😢";
  overlay.className = `feedback-overlay ${isCorrect?"correct":"wrong"} show`;
  clearTimeout(overlay._timer);
  overlay._timer = setTimeout(()=> overlay.classList.remove("show"), 900);
}

/* ====== 단어 로드 ====== */
async function loadWords({date, q}={}){
  const params = new URLSearchParams();
  if(date) params.set("date", date);
  if(q)    params.set("q", q);
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
  if(!("speechSynthesis" in window)){ showToast("음성합성 미지원 브라우저예요.", "error"); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US"; u.rate = 0.95; u.pitch = 1.2;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* ====== 렌더 ====== */
function render(){
  let arr = [...words];
  const q = (searchEl?.value || "").trim().toLowerCase();
  if(q) arr = arr.filter(it => it.word.toLowerCase().includes(q) || (it.meaning||"").toLowerCase().includes(q));
  arr.sort((a,b)=> (b.id||0)-(a.id||0));

  listEl.innerHTML = "";
  if(arr.length === 0){
    listEl.innerHTML = `<li class="empty-state">📭 단어가 없어요! 단어 등록 탭에서 추가해보세요.</li>`;
    return;
  }
  arr.forEach((it, i) => {
    const total = (it.correct||0)+(it.wrong||0);
    const acc   = total ? Math.round((it.correct||0)*100/total) : 0;
    const li    = document.createElement("li");
    li.className = "word-card";
    li.style.animationDelay = `${i * 0.04}s`;
    li.innerHTML = `
      <h3>${esc(it.word)}</h3>
      <div class="meaning">${esc(it.meaning)}</div>
      ${it.example ? `<div class="example">"${esc(it.example)}"</div>` : ""}
      <div class="meta">
        <span>📅 ${esc(it.registered_on||"")}</span>
        <span>🎯 ${acc}% (${it.correct||0}/${total||0})</span>
      </div>
      <div class="card-actions">
        <button class="btn-ghost sm btn-speak" data-word="${esc(it.word)}">🔊 발음</button>
        <button class="btn-danger btn-del" data-id="${it.id}">🗑️ 삭제</button>
      </div>
    `;
    listEl.appendChild(li);
    li.querySelector(".btn-speak")?.addEventListener("click", e => speakWord(e.currentTarget.getAttribute("data-word")));
    li.querySelector(".btn-del")?.addEventListener("click", async e => {
      if(!confirm("정말 삭제할까요?")) return;
      try {
        await fetch(`/api/words/${e.currentTarget.getAttribute("data-id")}`, {method:"DELETE"});
        await loadWords({date: currentFilterDate});
        showToast("삭제되었습니다.", "info");
      } catch { showToast("삭제에 실패했습니다.", "error"); }
    });
  });
}

/* ====== 단일 등록 ====== */
form?.addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    word:          (wordEl.value||"").trim(),
    meaning:       (meaningEl.value||"").trim(),
    example:       (exampleEl.value||"").trim(),
    level:         1,
    registered_on: regDateEl?.value || today(),
  };
  if(!payload.word || !payload.meaning){ showToast("단어와 뜻을 입력하세요.", "error"); return; }
  try {
    await jpost("/api/words", payload);
    showToast("✅ 등록 완료!", "success");
    form.reset();
    if(regDateEl) regDateEl.value = today();
    updateSidebarToday();
  } catch { showToast("등록에 실패했습니다.", "error"); }
});

/* ====== 날짜 조회 ====== */
loadByDateBtn?.addEventListener("click", async () => {
  currentFilterDate = filterDateEl?.value || "";
  await loadWords({date: currentFilterDate});
});
searchEl?.addEventListener("input", () => render());

/* ====== 대량 등록 ====== */
function parseBulkText(text){
  return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(row=>{
    const [left, example=""] = row.split("|").map(s=>s.trim());
    const m = left.split(/[-:]/);
    if(m.length < 2) return null;
    return {word: m[0].trim(), meaning: m.slice(1).join("-").trim(), example};
  }).filter(Boolean);
}
function renderBulkPreview(list){
  bulkPreview.innerHTML = "";
  list.forEach(it => {
    const li = document.createElement("li");
    li.className = "weak-item";
    li.innerHTML = `<strong>${esc(it.word)}</strong> <span class="badge">${esc(it.meaning)}</span>${it.example?` <span style="color:var(--text-muted);font-size:12px">${esc(it.example)}</span>`:""}`;
    bulkPreview.appendChild(li);
  });
  if(bulkApplyBtn) bulkApplyBtn.disabled = list.length === 0;
}
bulkParseBtn?.addEventListener("click", () => {
  bulkParsed = parseBulkText(bulkInput.value);
  renderBulkPreview(bulkParsed);
  bulkStatus.textContent = bulkParsed.length ? `인식된 항목: ${bulkParsed.length}개` : "항목이 없습니다.";
});
bulkApplyBtn?.addEventListener("click", async () => {
  if(!bulkParsed.length) return;
  const d = bulkDateEl?.value || today();
  bulkApplyBtn.disabled = true;
  bulkSpinner.classList.remove("hidden");
  try {
    const res = await jpost("/api/words/bulk", {items: bulkParsed.map(it=>({...it, registered_on:d}))});
    bulkStatus.textContent = `완료: ${res.inserted}개 등록`;
    showToast(`✅ ${res.inserted}개 등록 완료!`, "success");
    bulkInput.value = ""; bulkParsed = []; renderBulkPreview([]);
    updateSidebarToday();
  } catch {
    showToast("대량 등록에 실패했습니다.", "error");
    bulkApplyBtn.disabled = false;
  } finally {
    bulkSpinner.classList.add("hidden");
  }
});

/* ====== 사이드바 오늘 등록 수 업데이트 ====== */
async function updateSidebarToday(){
  try {
    const rows = await jget(`/api/words?date=${today()}`);
    if(sidebarToday) sidebarToday.textContent = rows.length;
  } catch {}
}

/* ====== 퀴즈 ====== */
btnQuiz?.addEventListener("click", async () => {
  const d = quizDateEl?.value || "";
  try {
    const pool = await jget(`/api/quiz${d ? `?date=${d}` : ""}`);
    if(pool.length < 4){ showToast("퀴즈는 단어 4개 이상 필요해요.", "error"); return; }
    quizFullPool = pool;
    quizState.pool    = shuffle(pool).slice(0, 100);
    quizState.idx     = 0;
    quizState.score   = 0;
    quizState.wrongIds = [];
    quizState.mode    = quizModeSel?.value || "en2ko";
    if(qWrongOnly) qWrongOnly.disabled = true;
    quizArea.classList.remove("hidden");
    quizArea.scrollIntoView({behavior:"smooth", block:"start"});
    nextQuestion();
  } catch { showToast("퀴즈를 불러오지 못했습니다.", "error"); }
});

quizClose?.addEventListener("click", () => {
  quizArea.classList.add("hidden");
});

qWrongOnly?.addEventListener("click", () => {
  if(!quizState.wrongIds.length) return;
  const wrongSet = new Set(quizState.wrongIds);
  quizState.pool     = shuffle(quizFullPool.filter(w => wrongSet.has(w.id)));
  quizState.idx      = 0;
  quizState.score    = 0;
  quizState.wrongIds = [];
  if(qWrongOnly) qWrongOnly.disabled = true;
  nextQuestion();
});

qRestart?.addEventListener("click", () => { quizState.idx = 0; quizState.score = 0; nextQuestion(); });
qNext?.addEventListener("click",    () => { quizState.idx++; nextQuestion(); });

function updateProgressBar(){
  const bar   = $("quizProgressBar");
  if(!bar) return;
  const total = quizState.pool.length;
  bar.style.width = (total ? Math.round(quizState.idx / total * 100) : 0) + "%";
}

function nextQuestion(){
  qChoices.innerHTML = "";
  qNext.disabled     = true;
  qInputWrap.classList.add("hidden");
  if(qInput) qInput.value = "";
  updateProgressBar();

  const total = quizState.pool.length;
  if(quizState.idx >= total){
    qWord.innerHTML = `🏆 완료!<br><span style="font-size:18px;font-weight:700;color:var(--text-muted)">최종 점수 ${quizState.score} / ${total}</span>`;
    qCount.textContent = `${total}/${total}`;
    if(qWrongOnly) qWrongOnly.disabled = quizState.wrongIds.length === 0;
    return;
  }

  const correct = quizState.pool[quizState.idx];
  const mode    = quizState.mode;
  const others  = shuffle(quizState.pool.filter(w => w.id !== correct.id)).slice(0, 3);

  if(mode === "en2ko"){
    qWord.textContent = correct.word;
    shuffle([correct,...others]).forEach(opt => addChoice(opt.meaning, opt.id===correct.id, correct.id));
  } else if(mode === "ko2en"){
    qWord.textContent = correct.meaning;
    shuffle([correct,...others]).forEach(opt => addChoice(opt.word, opt.id===correct.id, correct.id));
  } else if(mode === "cloze"){
    qWord.textContent = (correct.example || `${correct.word} is ...`).replace(new RegExp(correct.word,"ig"),"_____");
    shuffle([correct,...others]).forEach(opt => addChoice(opt.word, opt.id===correct.id, correct.id));
  } else if(mode === "en2ko_input"){
    qWord.textContent = correct.word;
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "한국어 뜻 입력";
    qSubmit.onclick = () => checkInputAnswer(correct.meaning, correct.id);
  } else if(mode === "ko2en_input"){
    qWord.textContent = correct.meaning;
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "영어 단어 입력";
    qSubmit.onclick = () => checkInputAnswer(correct.word, correct.id);
  } else if(mode === "cloze_input"){
    qWord.textContent = (correct.example || `${correct.word} is ...`).replace(new RegExp(correct.word,"ig"),"_____");
    qInputWrap.classList.remove("hidden");
    if(qInput) qInput.placeholder = "빈칸에 들어갈 단어 입력";
    qSubmit.onclick = () => checkInputAnswer(correct.word, correct.id);
  }

  qCount.textContent = `${quizState.idx+1}/${total}`;
  qScore.textContent = `점수 ${quizState.score}`;
}

function checkInputAnswer(answer, wid){
  const user   = (qInput?.value||"").trim().toLowerCase();
  const target = (answer||"").trim().toLowerCase();
  if(qInput) qInput.value = "";
  const isCorrect = user === target;
  showFeedback(isCorrect);
  if(isCorrect){
    quizState.score++;
    jpost(`/api/words/${wid}/result`,{correct:true}).catch(()=>{});
  } else {
    showToast(`정답: ${answer}`, "error");
    quizState.wrongIds.push(wid);
    jpost(`/api/words/${wid}/result`,{correct:false}).catch(()=>{});
  }
  qScore.textContent = `점수 ${quizState.score}`;
  qNext.disabled = false;
}

function addChoice(label, isCorrect, correctId){
  const div = document.createElement("div");
  div.className = "choice";
  div.textContent = label;
  div.addEventListener("click", () => {
    [...qChoices.children].forEach(el => el.classList.add("disabled"));
    if(isCorrect){
      div.classList.add("correct");
      quizState.score++;
      showFeedback(true);
      jpost(`/api/words/${correctId}/result`,{correct:true}).catch(()=>{});
    } else {
      div.classList.add("wrong");
      quizState.wrongIds.push(correctId);
      showFeedback(false);
      jpost(`/api/words/${correctId}/result`,{correct:false}).catch(()=>{});
    }
    qScore.textContent = `점수 ${quizState.score}`;
    qNext.disabled = false;
  });
  qChoices.appendChild(div);
}

/* ====== 통계 ====== */
async function loadStats(){
  const to   = today();
  const from = new Date(Date.now()-29*24*60*60*1000).toISOString().slice(0,10);
  try {
    const rows = await jget(`/api/stats/daily?from=${from}&to=${to}`);
    const totalWords  = rows.reduce((a,r)=>a+r.words,0);
    const sumCorrect  = rows.reduce((a,r)=>a+(r.correct||0),0);
    const sumWrong    = rows.reduce((a,r)=>a+(r.wrong||0),0);
    const attempts    = sumCorrect + sumWrong;
    if(stTotal) stTotal.textContent = totalWords;
    if(stAcc)   stAcc.textContent   = attempts ? `${Math.round(sumCorrect*100/attempts)}%` : "0%";
    const todayRow = rows.find(r=>r.day===to);
    if(stToday) stToday.textContent = todayRow ? todayRow.words : 0;

    // 일별 리스트
    if(statsList){
      const maxWords = Math.max(...rows.map(r=>r.words), 1);
      statsList.innerHTML = "";
      rows.forEach(r => {
        const tot = (r.correct||0)+(r.wrong||0);
        const acc = tot ? Math.round((r.correct||0)*100/tot) : 0;
        const div = document.createElement("div");
        div.className = "stats-row";
        div.innerHTML = `
          <span class="stats-day">${r.day}</span>
          <div class="stats-bar-wrap"><div class="stats-bar-fill" style="width:${Math.round(r.words/maxWords*100)}%"></div></div>
          <span class="stats-nums">${r.words}단어 · ${acc}%</span>
        `;
        statsList.appendChild(div);
      });
      if(!rows.length) statsList.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:24px">데이터가 없어요</div>`;
    }
  } catch { showToast("통계를 불러오지 못했습니다.", "error"); }
}

/* ====== 최초 로드 ====== */
currentFilterDate = filterDateEl?.value || "";
updateSidebarToday();
