const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../static/learning-model.js');

const word = (id, overrides = {}) => ({
  id,
  word: `word-${id}`,
  meaning: `meaning-${id}`,
  registered_on: '2026-09-01',
  attempts: 0,
  correct: 0,
  wrong: 0,
  last_studied_at: null,
  ...overrides,
});

test('selectMission mixes four new, four review, and two almost-mastered words', () => {
  const words = [
    ...Array.from({ length: 6 }, (_, index) => word(index + 1, { registered_on: `2026-09-${String(index + 1).padStart(2, '0')}` })),
    ...Array.from({ length: 6 }, (_, index) => word(index + 11, { attempts: 4, correct: 2, wrong: 2, last_studied_at: '2026-09-10T09:00:00' })),
    ...Array.from({ length: 4 }, (_, index) => word(index + 21, { attempts: 4, correct: 3, wrong: 1, last_studied_at: '2026-09-20T09:00:00' })),
    word(31, { attempts: 6, correct: 6, wrong: 0 }),
  ];

  const mission = window.DinoLearning.selectMission(words);

  assert.equal(mission.words.length, 10);
  assert.deepEqual(mission.counts, { new: 4, review: 4, almost: 2 });
  assert.equal(new Set(mission.words.map(item => item.id)).size, 10);
  assert.deepEqual(mission.words.map(item => item.missionType), [
    'new', 'review', 'almost', 'new', 'review', 'almost', 'new', 'review', 'new', 'review',
  ]);
});

test('selectMission backfills unused slots from eligible categories without selecting mastered words', () => {
  const words = [
    ...Array.from({ length: 8 }, (_, index) => word(index + 1)),
    word(20, { attempts: 2, correct: 0, wrong: 2, last_studied_at: '2026-08-01T09:00:00' }),
    word(21, { attempts: 4, correct: 3, wrong: 1, last_studied_at: '2026-08-02T09:00:00' }),
    word(22, { attempts: 5, correct: 5, wrong: 0 }),
  ];

  const mission = window.DinoLearning.selectMission(words);

  assert.equal(mission.words.length, 10);
  assert.deepEqual(mission.counts, { new: 8, review: 1, almost: 1 });
  assert.equal(mission.words.some(item => item.id === 22), false);
});

test('selectMission prioritizes recent new words and the weakest review words', () => {
  const words = [
    word(1, { registered_on: '2026-09-01' }),
    word(2, { registered_on: '2026-09-03' }),
    word(3, { registered_on: '2026-09-02' }),
    word(10, { attempts: 5, correct: 3, wrong: 2, last_studied_at: '2026-09-20T09:00:00' }),
    word(11, { attempts: 5, correct: 1, wrong: 4, last_studied_at: '2026-09-25T09:00:00' }),
    word(12, { attempts: 2, correct: 1, wrong: 1, last_studied_at: '2026-08-01T09:00:00' }),
  ];

  const mission = window.DinoLearning.selectMission(words, 4);

  assert.deepEqual(mission.words.filter(item => item.missionType === 'new').map(item => item.id), [2, 3]);
  assert.deepEqual(mission.words.filter(item => item.missionType === 'review').map(item => item.id), [11, 12]);
});

test('selectMission never exceeds a small requested limit', () => {
  const words = [
    word(1),
    word(2, { attempts: 2, correct: 0, wrong: 2 }),
    word(3, { attempts: 4, correct: 3, wrong: 1 }),
  ];

  const mission = window.DinoLearning.selectMission(words, 1);

  assert.equal(mission.words.length, 1);
  assert.deepEqual(mission.counts, { new: 1, review: 0, almost: 0 });
});

test('selectMission breaks equal review ratios by wrong count, then oldest study date', () => {
  const words = [
    word(10, { attempts: 4, correct: 2, wrong: 2, last_studied_at: '2026-09-20T09:00:00' }),
    word(11, { attempts: 6, correct: 3, wrong: 3, last_studied_at: '2026-09-25T09:00:00' }),
    word(12, { attempts: 4, correct: 2, wrong: 2, last_studied_at: '2026-08-01T09:00:00' }),
  ];

  const mission = window.DinoLearning.selectMission(words, 3);

  assert.deepEqual(mission.words.map(item => item.id), [11, 12, 10]);
});
