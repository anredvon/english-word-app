/* Playful Dino Refined — learner home dashboard.
   Uses the existing /api/words contract; no synthetic persisted stats. */
(() => {
  const home = document.getElementById('homeView');
  const wordbook = document.getElementById('wordbookView');
  const navItems = [...document.querySelectorAll('.app-nav-item')];
  if (!home || !wordbook) return;

  const isoToday = () => new Date().toISOString().slice(0, 10);
  const num = value => Number(value || 0);

  function setView(view) {
    const showHome = view === 'home';
    home.classList.toggle('hidden', !showHome);
    wordbook.classList.toggle('hidden', showHome);
    navItems.forEach(item => {
      const active = item.dataset.view === view;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (showHome) loadHome();
  }

  async function loadHome() {
    const status = document.getElementById('homeDataStatus');
    try {
      const response = await fetch('/api/words');
      if (!response.ok) throw new Error('words request failed');
      const items = await response.json();
      const today = isoToday();
      const todayWords = items.filter(w => String(w.registered_on || '').slice(0, 10) === today);
      const reviewed = items.filter(w => num(w.correct) + num(w.wrong) > 0);
      const wrong = items
        .filter(w => num(w.wrong) > 0)
        .sort((a, b) => num(b.wrong) - num(a.wrong));
      const totalAttempts = items.reduce((sum, w) => sum + num(w.correct) + num(w.wrong), 0);
      const correct = items.reduce((sum, w) => sum + num(w.correct), 0);
      const accuracy = totalAttempts ? Math.round(correct * 100 / totalAttempts) : 0;
      const studyCount = todayWords.length;
      const reviewCount = wrong.length;

      document.getElementById('homeNewCount').textContent = studyCount;
      document.getElementById('homeReviewCount').textContent = reviewCount;
      document.getElementById('homeAccuracy').textContent = `${accuracy}%`;
      document.getElementById('homeReviewed').textContent = reviewed.length;
      document.getElementById('homeTotal').textContent = items.length;
      document.getElementById('homeProgressText').textContent = studyCount ? `오늘 등록한 ${studyCount}개 단어로 시작해요` : '오늘 등록된 단어는 아직 없어요';
      document.getElementById('homeProgressFill').style.width = studyCount ? '100%' : '0%';
      document.getElementById('homeDinoMessage').textContent = reviewCount
        ? `다시 만나볼 단어가 ${reviewCount}개 있어! 천천히 해보자.`
        : '좋아! 지금까지 틀린 단어가 없네. 오늘 단어를 만나볼까?';

      const weakList = document.getElementById('homeWeakWords');
      weakList.innerHTML = '';
      if (!wrong.length) {
        weakList.innerHTML = '<div class="home-empty">아직 복습할 단어가 없어요 🌱</div>';
      } else {
        wrong.slice(0, 5).forEach(w => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'weak-chip';
          chip.innerHTML = `<strong>${escapeHtml(w.word)}</strong><span>${escapeHtml(w.meaning || '')}</span><small>오답 ${num(w.wrong)}회</small>`;
          chip.addEventListener('click', () => setView('wordbook'));
          weakList.appendChild(chip);
        });
      }
      status.textContent = '실제 단어 데이터 기준';
    } catch (error) {
      status.textContent = '학습 정보를 불러오지 못했어요';
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.getElementById('homeStudyStart')?.addEventListener('click', () => {
    setView('wordbook');
    document.getElementById('btnQuiz')?.focus();
  });

  navItems.forEach(item => item.addEventListener('click', event => {
    const view = item.dataset.view;
    if (view === 'home' || view === 'wordbook') {
      event.preventDefault();
      setView(view);
    } else {
      event.preventDefault();
      document.getElementById('toastMsg').textContent = view === 'wrong' ? '오답노트는 다음 단계에서 연결할게요.' : '학습기록은 다음 단계에서 연결할게요.';
      document.getElementById('toastMsg').className = 'toast toast-info show';
      setTimeout(() => document.getElementById('toastMsg')?.classList.remove('show'), 1800);
    }
  }));

  setView('home');
})();