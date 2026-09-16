# English Word App — UI Redesign Baseline

Branch: `ui-redesign-playful-dino`
Canonical direction: **Playful Dino Refined**

## Goal

Redesign the app from a management-first vocabulary tool into a learner-first daily study experience without breaking the existing backend/data contract.

## Regression contract — must keep working

### Platform / routing
- `GET /` renders the app.
- `GET /healthz` returns HTTP 200 and `ok`.
- Existing PWA assets (`manifest.json`, icons, service worker) remain available.

### Vocabulary management
- Create one word with English word, Korean meaning, optional example, and registration date.
- Bulk-create valid words from parsed input.
- List all words.
- Filter words by `registered_on` date.
- Search by English word or Korean meaning.
- Delete a word.
- Browser speech synthesis can pronounce a word.

### Quiz
The current six modes are preserved as capabilities even if the redesigned UI stops exposing them as a manual dropdown:
1. English → Korean multiple choice (`en2ko`)
2. Korean → English multiple choice (`ko2en`)
3. Cloze multiple choice (`cloze`)
4. English → Korean typed answer (`en2ko_input`)
5. Korean → English typed answer (`ko2en_input`)
6. Cloze typed answer (`cloze_input`)

Also preserve:
- Quiz pool loading, optionally by registration date.
- Minimum pool guard for multiple-choice quiz.
- Progress and score tracking.
- Correct/wrong feedback.
- Per-word result persistence through `POST /api/words/<id>/result`.
- Wrong-answer IDs during a session.
- Wrong-only retry flow.
- Restart flow.

### Statistics
- Daily statistics endpoint remains compatible.
- Total words can be derived from existing word data.
- Accuracy remains based on accumulated `correct` and `wrong` counts.
- Today/date-based registered word count remains available.

## Existing backend API contract

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Health check |
| POST | `/api/words` | Create one word |
| POST | `/api/words/bulk` | Bulk create words |
| GET | `/api/words` | List/search/date-filter words |
| GET | `/api/quiz` | Load quiz pool |
| POST | `/api/words/<id>/result` | Persist correct/wrong result |
| GET | `/api/stats/daily` | Daily aggregated statistics |
| DELETE | `/api/words/<id>` | Delete word |

## Data fields relied on by current UI

- `id`
- `word`
- `meaning`
- `example`
- `level`
- `registered_on`
- `correct`
- `wrong`
- `last_tested`

No database migration is required for the first UI redesign pass.

## Redesign information architecture

Primary navigation:
1. Home
2. Wordbook
3. Wrong answers
4. Learning history

Word creation and bulk import move under **Wordbook** instead of occupying the home screen.

The learner-facing primary flow becomes:

`Home → Today's Study → Learn → Quiz → Wrong-word Review → Result`

The six legacy quiz modes remain available internally and can later be orchestrated automatically by the Today's Study flow.

## Canonical visual rules — Playful Dino Refined

- Nature/dinosaur identity, but not a heavy game/RPG interface.
- Light sky/nature atmosphere with restrained decorative scenery.
- White learning cards with generous spacing.
- Green primary CTA and progress accents.
- Blue as a secondary informational accent.
- Warm orange/coral for review and mistakes.
- Rounded cards, approximately 18–24px radius.
- Minimal shadows; avoid the old heavy glassmorphism/orb treatment.
- Dino mascot is an encouraging study companion, not decoration on every control.
- Large touch targets suitable for iPad.
- Portrait iPad is the canonical layout; responsive behavior must remain usable on phones and wider screens.

## First implementation boundary

The first implementation pass should change presentation and navigation only where possible. Keep `main.py` and the database/API contract stable unless a later learner feature genuinely requires backend changes.

Implementation order:
1. Baseline/regression contract — this document.
2. Design tokens + app shell/navigation.
3. Home dashboard.
4. Today's Study experience.
5. Wordbook + add/bulk management.
6. Wrong-answer notebook.
7. Learning history.
8. Responsive/PWA/accessibility quality pass.
9. Regression verification against this contract.

## Known future enhancements — not required for first UI pass

- Persistent mastery levels.
- Spaced repetition scheduling.
- Persistent daily study sessions/streaks.
- Dedicated mascot asset states.
- More sophisticated TTS controls.

These must not be faked in the UI as persisted data until their supporting model/API exists.
