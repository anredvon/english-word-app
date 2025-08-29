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
const voiceSel = $("voiceSelect");   // 발음 선택

/* ====== 상태 ====== */
let words=[];                 
let currentFilterDate = filterDateEl?.value || today();
let currentQuery="";
let voices=[];

/* ====== 보이스 로드 ====== */
function loadVoices(){ voices = speechSynthesis.getVoices(); }
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

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
  const q = (searchEl?.value || "").trim().toLowerCase();
  if(q) arr = arr.filter(it => it.word.toLowerCase().includes(q) || (it.meaning||"").toLowerCase().includes(q));

  listEl.innerHTML="";
  arr.forEach(it=>{
    const li=document.createElement("li");
    li.className="word-card";
    li.innerHTML=`
      <h3>${esc(it.word)}</h3>
      <p><strong>뜻</strong> ${esc(it.meaning)}</p>
      ${it.example?`<p><strong>예문</strong> ${esc(it.example)}</p>`:""}
      <button class="ghost sm btn-speak" data-word="${esc(it.word)}">🔊 발음</button>
      <button class="ghost sm danger btn-del" data-id="${it.id}">삭제</button>
    `;
    listEl.appendChild(li);

    li.querySelector(".btn-speak")?.addEventListener("click",e=>{
      speakWord(e.currentTarget.getAttribute("data-word"));
    });
    li.querySelector(".btn-del")?.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-id");
      if(!confirm("정말 삭제할까요?")) return;
      await fetch(`/api/words/${id}`, { method: "DELETE" });
      await loadWords({date: currentFilterDate});
    });
  });
}

/* ====== 발음 기능 ====== */
function speakWord(word){
  if(!("speechSynthesis" in window)) { alert("이 브라우저는 음성합성을 지원하지 않아요."); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.95; u.pitch = 1.0;

  const sel = voiceSel?.value || "";
  if(sel==="male"){
    const v = voices.find(v=> v.lang.startsWith("en") && v.name.toLowerCase().includes("male"));
    if(v) u.voice = v;
  } else if(sel==="female"){
    const v = voices.find(v=> v.lang.startsWith("en") && v.name.toLowerCase().includes("female"));
    if(v) u.voice = v;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
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

/* ====== 대량등록 토글 ====== */
toggleBulk?.addEventListener("click", ()=>{
  const isHidden = bulkSection.classList.toggle("hidden");
  toggleBulk.textContent = isHidden ? "열기" : "닫기";
});

/* ====== 날짜 조회 ====== */
loadByDateBtn?.addEventListener("click", async ()=>{
  currentFilterDate = filterDateEl?.value || "";
  if(currentFilterDate && currentFilterDate.includes("T"))
    currentFilterDate = currentFilterDate.split("T")[0];
  await loadWords({date: currentFilterDate});
});

/* ====== 검색 ====== */
btnSearch?.addEventListener("click", async ()=>{
  currentQuery = searchEl?.value || "";
  if(currentQuery.trim() !== ""){
    // 검색 모드 → 날짜 자동 제거
    currentFilterDate = "";
    filterDateEl.value = "";
    await loadWords({q: currentQuery});
  } else {
    // 검색어 없으면 오늘날짜로 복원
    currentFilterDate = today();
    filterDateEl.value = today();
    await loadWords({date: currentFilterDate});
  }
});

searchEl?.addEventListener("input", ()=>{
  currentQuery = searchEl.value;
  if(currentQuery.trim()===""){
    currentFilterDate = today();
    filterDateEl.value = today();
    filterDateEl.disabled = false;
    loadByDateBtn.disabled = false;
  } else {
    currentFilterDate = "";
    filterDateEl.value = "";
    filterDateEl.disabled = true;
    loadByDateBtn.disabled = true;
  }
});

/* ====== 정렬 ====== */
sortEl?.addEventListener("change", ()=> render());

/* ====== 최초 로드 ====== */
if(filterDateEl) filterDateEl.value = today();
loadWords({date: currentFilterDate}).catch(console.error);
