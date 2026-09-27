const test = require('node:test');
const assert = require('node:assert/strict');

const element = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  dataset: {},
  style: {},
  setAttribute() {},
  removeAttribute() {},
  addEventListener() {},
  appendChild() {},
  insertAdjacentElement() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  textContent: '',
  innerHTML: '',
});

test('home does not claim an event-based mission when word statistics are unavailable', async () => {
  const elements = new Map([
    ['homeView', element()],
    ['wordbookView', element()],
    ['homeDataStatus', element()],
    ['homeWeakWords', element()],
  ]);
  global.window = {
    DinoLearning: {
      selectMission(words) {
        return { words, counts: { new: words.length, review: 0, almost: 0 } };
      },
      growth() {
        return { mastered: 0, growing: 0, learned: 0, score: 0, stage: 0, level: 1, stageName: '씨앗' };
      },
    },
    addEventListener() {},
    dispatchEvent() {},
    scrollTo() {},
  };
  global.navigator = {};
  global.CustomEvent = class {};
  global.document = {
    head: { appendChild() {} },
    title: '',
    createElement() { return element(); },
    getElementById(id) {
      if (id === 'homeGrowthCard') return null;
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  global.fetch = async url => {
    if (url === '/api/words') return { ok: true, json: async () => [{ id: 1, word: 'apple', meaning: '사과' }] };
    if (url === '/api/stats/summary') return { ok: true, json: async () => ({ attempts: 0, correct: 0, learned_words: 0 }) };
    if (url === '/api/stats/words') return { ok: false, json: async () => ({ error: 'offline' }) };
    throw new Error(`Unexpected URL: ${url}`);
  };

  delete require.cache[require.resolve('../static/home.js')];
  require('../static/home.js');
  await window.DinoHome.loadHome();

  assert.equal(elements.get('homeDataStatus').textContent, '오늘의 미션을 불러오지 못했어요');
});
