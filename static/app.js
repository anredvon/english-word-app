document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("wordForm");
  const wordEl = document.getElementById("word");
  const meaningEl = document.getElementById("meaning");
  const exampleEl = document.getElementById("example");
  const regDateEl = document.getElementById("regDate");

  const toggleBulk = document.getElementById("toggleBulk");
  const bulkSection = document.getElementById("bulkSection");
  const bulkParseBtn = document.getElementById("bulkParse");
  const bulkApplyBtn = document.getElementById("bulkApply");

  const btnQuiz = document.getElementById("btnQuiz");
  const btnStats = document.getElementById("btnStats");

  const voiceSelect = document.getElementById("voiceSelect");

  // ===== 단일 등록 =====
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      word: wordEl.value.trim(),
      meaning: meaningEl.value.trim(),
      example: exampleEl.value.trim(),
      registered_on: regDateEl.value
    };
    if (!payload.word || !payload.meaning) {
      alert("단어와 뜻을 입력하세요.");
      return;
    }
    const r = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      alert("등록되었습니다.");
      form.reset();
    } else {
      alert("등록 실패");
    }
  });

  // ===== 대량 등록 토글 =====
  toggleBulk?.addEventListener("click", () => {
    bulkSection.classList.toggle("hidden");
  });
  bulkParseBtn?.addEventListener("click", () => {
    bulkApplyBtn.disabled = false;
  });

  // ===== 발음 기능 =====
  function speakWord(word) {
    if (!("speechSynthesis" in window)) {
      alert("브라우저에서 음성합성을 지원하지 않습니다.");
      return;
    }
    const u = new SpeechSynthesisUtterance(word);
    if (voiceSelect.value === "male") u.voice = speechSynthesis.getVoices().find(v => /Male|남성/i.test(v.name)) || null;
    if (voiceSelect.value === "female") u.voice = speechSynthesis.getVoices().find(v => /Female|여성/i.test(v.name)) || null;
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ===== 퀴즈 =====
  btnQuiz?.addEventListener("click", () => {
    alert("퀴즈 시작!");
  });

  // ===== 통계 =====
  btnStats?.addEventListener("click", () => {
    alert("통계 호출");
  });
});
