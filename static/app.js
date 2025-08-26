// ===== 기본 스토리지 =====
const KEY = "ewa_words_v1";
function loadWords() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function saveWords(words) { localStorage.setItem(KEY, JSON.stringify(words)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function escapeHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ===== 엘리먼트 =====
const form = document.getElementById("wordForm");
const wordInput = document.getElementById("word");
const meaningInput = document.getElementById("meaning");
const exampleInput = document.getElementById("example");
const clearBtn = document.getElementById("clearAll");
const listEl = document.getElementById("wordList");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const btnExport = document.getElementById("btnExport");
const fileImport = document.getElementById("fileImport");
const btnQuiz = document.getElementById("btnQuiz");

// Quiz modal
const quizModal = document.getElementById("quizModal");
const quizClose = document.getElementById("quizClose");
const qCount = document.getElementById("qCount");
const qScore = document.getElementById("qScore");
const qWord = document.getElementById("qWord");
const qChoices = document.getElementById("qChoices");
const qNext = document.getElementById("qNext");
const qRestart = document.getElementById("qRestart");

// ===== 상태 =====
let words = loadWords();

// ===== 렌더 =====
function render() {
  const q = (searchEl.value || "").trim().toLowerCase();
  let arr = [...words];

  // 정렬
  const sort = sortEl.value;
  if (sort === "created_desc") arr.sort((a,b)=>b.createdAt - a.createdAt);
  if (sort === "alpha_asc")   arr.sort((a,b)=>a.word.localeCompare(b.word));
  if (sort === "alpha_desc")  arr.sort((a,b)=>b.word.localeCompare(a.word));

  // 검색
  if (q) arr = arr.filter(it =>
    it.word.toLowerCase().includes(q) ||
    it.meaning.toLowerCase().includes(q)
  );

  listEl.innerHTML = "";
  arr.forEach((it) => {
    const li = document.createElement("li");
    li.className = "word-card";
    li.innerHTML = `
      <h3>
        ${escapeHtml(it.word)}
        <button class="speak sm" data-id="${it.id}" data-act="speak">발음</button>
      </h3>
      <p><strong>뜻</strong> ${escapeHtml(it.meaning)}</p>
      ${it.example ? `<p><strong>예문</strong> ${escapeHtml(it.example)}</p>` : ""}
      <div class="meta">
        <span>${new Date(it.createdAt).toLocaleString()}</span>
        <span>레벨 ${it.level}</span>
      </div>
      <div class="actions">
        <button data-id="${it.id}" data-act="inc">레벨↑</button>
        <button data-id="${it.id}" data-act="dec">레벨↓</button>
        <button data-id="${it.id}" data-act="del" class="ghost">삭제</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

// ===== 이벤트: 입력/삭제/정렬/검색 =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const w = wordInput.value.trim();
  const m = meaningInput.value.trim();
  const ex = exampleInput.value.trim();
  if (!w || !m) return;
  words.push({ id: uid(), word: w, meaning: m, example: ex, level: 1, createdAt: Date.now() });
  saveWords(words);
  form.reset();
  render();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("전체 삭제할까요?")) return;
  words = [];
  saveWords(words);
  render();
});

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  const idx = words.findIndex((w) => w.id === id);
  if (act === "speak") {
    const target = words.find(w => w.id === id);
    if (target) speak(`${target.word}. ${target.example || ""}`);
    return;
  }
  if (idx < 0) return;
  if (act === "inc") words[idx].level++;
  if (act === "dec") words[idx].level = Math.max(1, words[idx].level - 1);
  if (act === "del") words.splice(idx, 1);
  saveWords(words);
  render();
});

searchEl.addEventListener("input", render);
sortEl.addEventListener("change", render);

// ===== 발음(TTS) =====
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";                // 단어/예문 영어 발음
    u.rate = 0.95;
    speechSynthesis.cancel();        // 이전 발음 중지
    speechSynthesis.speak(u);
  } catch (e) {
    alert("이 기기에서 TTS를 사용할 수 없어요.");
  }
}

// ===== 백업/복원 =====
btnExport.addEventListener("click", () => {
  const data = JSON.stringify(words, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `ewa-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

fileImport.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error("형식 오류");
    // 간단한 스키마 보정
    const sanitized = arr.map(x => ({
      id: x.id || uid(),
      word: String(x.word || "").trim(),
      meaning: String(x.meaning || "").trim(),
      example: String(x.example || ""),
      level: Number.isFinite(x.level) ? x.level : 1,
      createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now()
    })).filter(x => x.word && x.meaning);
    words = sanitized;
    saveWords(words);
    render();
    alert("복원 완료!");
  } catch {
    alert("JSON 형식이 올바르지 않습니다.");
  } finally {
    e.target.value = "";
  }
});

// ===== 퀴즈 =====
let quizState = { pool: [], idx: 0, score: 0 };

function openQuiz() {
  if (words.length < 4) { alert("퀴즈는 단어가 최소 4개 이상 필요해요."); return; }
  quizState.pool = shuffle([...words]); // 무작위 출제
  quizState.idx = 0;
  quizState.score = 0;
  quizModal.classList.remove("hidden");
  nextQuestion();
}

function closeQuiz() {
  quizModal.classList.add("hidden");
  // 진행 중 발음 중지
  try { speechSynthesis.cancel(); } catch {}
}

function nextQuestion() {
  qChoices.innerHTML = "";
  qNext.disabled = true;

  const total = Math.min(quizState.pool.length, 20); // 20문제 제한
  if (quizState.idx >= total) {
    qWord.textContent = `완료! 최종 점수: ${quizState.score} / ${total}`;
    qCount.textContent = `${total}/${total}`;
    return;
  }

  const correct = quizState.pool[quizState.idx];
  qWord.textContent = correct.word;
  qCount.textContent = `${quizState.idx + 1}/${total}`;
  qScore.textContent = `점수 ${quizState.score}`;

  // 보기 4개(정답 + 오답 3개)
  const others = shuffle(words.filter(w => w.id !== correct.id)).slice(0, 3);
  const options = shuffle([correct, ...others]);

  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "choice";
    div.textContent = opt.meaning;
    div.dataset.id = opt.id;
    div.addEventListener("click", () => {
      // 선택 후 정답/오답 표시
      Array.from(qChoices.children).forEach(el => el.classList.add("disabled"));
      if (opt.id === correct.id) {
        div.classList.add("correct");
        quizState.score++;
        qScore.textContent = `점수 ${quizState.score}`;
      } else {
        div.classList.add("wrong");
        // 정답표시
        const c = Array.from(qChoices.children).find(el => el.dataset.id === correct.id);
        c?.classList.add("correct");
      }
      qNext.disabled = false;
      // 정답 발음 (단어 & 예문)
      speak(`${correct.word}. ${correct.example || ""}`);
    });
    qChoices.appendChild(div);
  });
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

btnQuiz.addEventListener("click", openQuiz);
quizClose.addEventListener("click", closeQuiz);
qRestart.addEventListener("click", () => { quizState.idx = 0; quizState.score = 0; nextQuestion(); });
qNext.addEventListener("click", () => { quizState.idx++; nextQuestion(); });

// ===== 초기 렌더 =====
render();
