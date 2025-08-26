// 간단한 로컬 스토리지 모델
const KEY = "ewa_words_v1";

function loadWords() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function saveWords(words) {
  localStorage.setItem(KEY, JSON.stringify(words));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const form = document.getElementById("wordForm");
const wordInput = document.getElementById("word");
const meaningInput = document.getElementById("meaning");
const exampleInput = document.getElementById("example");
const clearBtn = document.getElementById("clearAll");
const listEl = document.getElementById("wordList");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");

let words = loadWords();

function render() {
  const q = (searchEl.value || "").trim().toLowerCase();
  let arr = [...words];

  // 정렬
  const sort = sortEl.value;
  if (sort === "created_desc") {
    arr.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === "alpha_asc") {
    arr.sort((a, b) => a.word.localeCompare(b.word));
  } else if (sort === "alpha_desc") {
    arr.sort((a, b) => b.word.localeCompare(a.word));
  }

  // 검색
  if (q) {
    arr = arr.filter(
      (it) =>
        it.word.toLowerCase().includes(q) ||
        it.meaning.toLowerCase().includes(q)
    );
  }

  listEl.innerHTML = "";
  arr.forEach((it) => {
    const li = document.createElement("li");
    li.className = "word-card";
    li.innerHTML = `
      <h3>${escapeHtml(it.word)}</h3>
      <p><strong>뜻</strong> ${escapeHtml(it.meaning)}</p>
      ${
        it.example
          ? `<p><strong>예문</strong> ${escapeHtml(it.example)}</p>`
          : ""
      }
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const w = wordInput.value.trim();
  const m = meaningInput.value.trim();
  const ex = exampleInput.value.trim();
  if (!w || !m) return;

  words.push({
    id: uid(),
    word: w,
    meaning: m,
    example: ex,
    level: 1,
    createdAt: Date.now(),
  });
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
  if (idx < 0) return;

  if (act === "inc") words[idx].level++;
  if (act === "dec") words[idx].level = Math.max(1, words[idx].level - 1);
  if (act === "del") words.splice(idx, 1);

  saveWords(words);
  render();
});

searchEl.addEventListener("input", render);
sortEl.addEventListener("change", render);

// 초기 렌더
render();
