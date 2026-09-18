# 지훈이의 영어단어

개인용 영어 단어 학습 PWA. iPhone/iPad Safari와 홈 화면 설치를 기준으로 운영합니다.

## Production learning flow
발음 듣기 → 뜻 확인/퀴즈 → 키보드·Apple Pencil 입력 → 직접 필기 → 학습 이벤트 저장 → 단어 숙련도 → Dino 정원 성장

## Mastery source of truth
숙련도, 복습 필요 여부, 정원 성장 규칙은 `static/learning-model.js`의 `DinoLearning`을 공통 사용합니다. 학습 결과 집계는 `study_events` 기반 API를 사용합니다.

## Pre-deploy checklist
1. PythonAnywhere에서 `main` 최신 커밋 pull
2. Web app reload
3. iPad/iPhone에서 앱 완전 종료 후 다시 실행
4. 홈 → 오늘 학습 → 발음 → 퀴즈 → 입력 → Pencil 필기 → 완료 화면 확인
5. 단어장 숙련도와 복습 필요 필터 확인
6. 오답노트 재학습 후 저장/집계 확인
7. 학습기록의 완전 암기·성장 중·복습 필요 수치 확인
8. 홈 Dino 정원 단계가 기록 화면과 일치하는지 확인

Current PWA cache baseline: **v56**
