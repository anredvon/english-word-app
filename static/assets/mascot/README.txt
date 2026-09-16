Dino Mascot Assets v1 — Production Candidate

6 individual transparent PNG assets:
- dino_home_book.png
- dino_study.png
- dino_handwriting.png
- dino_success.png
- dino_review_thinking.png
- dino_empty_reading.png

QA performed before packaging:
PASS — all 6 files decode as PNG/RGBA
PASS — true alpha transparency exists (alpha 0..255)
PASS — no asset/effect touches crop edge
PASS — minimum dimensions > 220 px
PASS — six expected roles present
PASS — SHA-256 recorded in QA_REPORT.json

Notes:
The source generation unexpectedly rendered a colored backdrop. It was removed during asset preparation.
These files are therefore derived transparent cutouts, not native transparent renders.
Review QA_CONTACT_SHEET.jpg before Git integration if you want a quick visual check.
