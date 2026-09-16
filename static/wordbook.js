/* Learner-friendly Wordbook controls layered on top of legacy CRUD behavior. */
(() => {
  const view = document.getElementById('wordbookView');
  if (!view) return;
  const panel = document.getElementById('wordManagePanel');
  const addButton = document.getElementById('wordbookAdd');
  const closeButton = document.getElementById('wordManageClose');
  const singleTab = document.getElementById('manageSingleTab');
  const bulkTab = document.getElementById('manageBulkTab');
  const single = document.getElementById('singleManage');
  const bulk = document.getElementById('bulkManage');

  function openPanel(mode='single') {
    panel?.classList.remove('hidden');
    panel?.setAttribute('aria-hidden','false');
    setMode(mode);
    setTimeout(() => document.getElementById(mode === 'single' ? 'word' : 'bulkInput')?.focus(), 0);
  }
  function closePanel() { panel?.classList.add('hidden'); panel?.setAttribute('aria-hidden','true'); }
  function setMode(mode) {
    const isSingle = mode === 'single';
    single?.classList.toggle('hidden', !isSingle);
    bulk?.classList.toggle('hidden', isSingle);
    singleTab?.classList.toggle('is-active', isSingle);
    bulkTab?.classList.toggle('is-active', !isSingle);
  }
  addButton?.addEventListener('click', () => openPanel('single'));
  closeButton?.addEventListener('click', closePanel);
  panel?.querySelector('.manage-backdrop')?.addEventListener('click', closePanel);
  singleTab?.addEventListener('click', () => setMode('single'));
  bulkTab?.addEventListener('click', () => setMode('bulk'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel && !panel.classList.contains('hidden')) closePanel(); });

  const filterButtons = [...document.querySelectorAll('[data-word-filter]')];
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('is-active'));
    button.classList.add('is-active');
    const mode = button.dataset.wordFilter;
    const date = document.getElementById('filterDate');
    if (mode === 'today') {
      date.value = new Date().toISOString().slice(0,10);
      document.getElementById('loadByDate')?.click();
    } else if (mode === 'all') {
      date.value = '';
      document.getElementById('loadByDate')?.click();
    } else if (mode === 'difficult') {
      date.value = '';
      document.getElementById('loadByDate')?.click();
      setTimeout(() => {
        document.querySelectorAll('#wordList .word-card').forEach(card => {
          const meta = card.textContent || '';
          const match = meta.match(/🎯\s*(\d+)%/);
          card.classList.toggle('hidden', !match || Number(match[1]) >= 70);
        });
      }, 350);
    }
  }));

  // Legacy bulk section was collapsible. In the new sheet it should be immediately usable.
  document.getElementById('bulkSection')?.classList.remove('hidden');
})();