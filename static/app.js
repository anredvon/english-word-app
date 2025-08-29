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
const btnSearch = $("btnSearch");
const sortEl = $("sort");
const btnQuiz = $("btnQuiz");
const btnStats = $("btnStats");

const quizModeSel = $("quizMode");
const qWrongOnly = $("qWrongOnly");

/* 퀴즈 모달 */
const quizModal=$("quizModal"), quizClose=$("quizClose"), qCount=$("qCount"), qScore=$("qScore"), qWord=$("qWord"), qChoices=$("qChoices"), qNext=$("qNext"), qRestart=$("qRestart");
/* 통계 모달 */
const statsModal=$("statsModal"), statsClose=$("statsClose"), stTotal=$("stTotal"), stAcc=$("stAcc"), stToday=$("stToday"), weakList=$("weakList"), recentList=$("recentList");

/* ====== 상태 ====== */
let words=[];                 
let currentFilterDate="";     
let currentQuery="";
let currentMode="date";   // "date" 또는 "search"
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
  if(currentMode === "date" && date) params.set("date", date);
  if(currentMode === "search" && q) params.set("q", q);
  const url = "/api/words" + (params.toString()?`?${params.toString()}`:"");
  words = await jget(url);
  render();
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
  currentMode = "date";
  let d = filterDateEl?.value || "";
  if (d && d.includes("T")) d = d.split("T")[0];
  currentFilterDate = d;
  currentQuery = "";

  searchEl.disabled = true;
  btnSearch.disabled = true;
  filterDateEl.disabled = false;
  loadByDateBtn.disabled = false;

  await loadWords({date: currentFilterDate});
});

/* ====== 검색 ====== */
btnSearch?.addEventListener("click", async ()=>{
  currentMode = "search";
  currentQuery = searchEl?.value || "";

  filterDateEl.disabled = true;
  loadByDateBtn.disabled = true;
  searchEl.disabled = false;
  btnSearch.disabled = false;

  await loadWords({q: currentQuery});
});

searchEl?.addEventListener("keypress", async (e)=>{
  if(e.key === "Enter"){
    currentMode = "search";
    currentQuery = searchEl.value;

    filterDateEl.disabled = true;
    loadByDateBtn.disabled = true;
    searchEl.disabled = false;
    btnSearch.disabled = false;

    await loadWords({q: currentQuery});
  }
});

/* ====== 정렬 ====== */
sortEl?.addEventListener("change", ()=> render());

/* ====== 발음 기능 ====== */
function speakWord(word){
  if(!("speechSynthesis" in window)) { alert("이 브라우저는 음성합성을 지원하지 않아요."); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.95;
  u.pitch = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* ====== 최초 로드 ====== */
currentFilterDate = filterDateEl?.value || "";
loadWords({date: currentFilterDate}).catch(err=>{
  console.error(err);
  alert("목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
});
