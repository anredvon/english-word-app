import os
import pymysql
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)

# =======================
# MySQL 연결 설정
# =======================
DB = {
    "host": "anredvon.mysql.pythonanywhere-services.com",
    "user": "anredvon",
    "password": os.environ.get("DB_PASS", ""),   # Web 탭 → Environment variables 에 DB_PASS 등록 권장
    "database": "anredvon$default",              # 현재 사용하는 DB명
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}
def get_conn():
    return pymysql.connect(**DB)

# =======================
# 라우팅 (UI/정적)
# =======================
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

# 헬스체크 (간단 확인용)
@app.get("/healthz")
def healthz():
    return "ok", 200

# =======================
# API: 단어 등록/조회/퀴즈/정오답/통계
# =======================

# 1) 단어 등록 (단건)
@app.post("/api/words")
def api_create_word():
    try:
        data = request.get_json() or {}
        word = (data.get("word") or "").strip()
        meaning = (data.get("meaning") or "").strip()
        example = (data.get("example") or "").strip()
        level = int(data.get("level") or 1)
        reg = (data.get("registered_on") or "").strip()[:10]  # YYYY-MM-DD

        if not word or not meaning:
            return jsonify({"ok": False, "error": "word/meaning required"}), 400

        if not reg:
            import datetime
            reg = datetime.date.today().isoformat()

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO words (word, meaning, example, level, registered_on)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (word, meaning, example, level, reg),
            )
            conn.commit()
            new_id = cur.lastrowid

        return jsonify({"ok": True, "id": new_id})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# 2) 단어 대량 등록 (Bulk)
@app.post("/api/words/bulk")
def api_create_words_bulk():
    """
    요청:
    {
      "items": [
        {"word":"apple","meaning":"사과","example":"I like an apple.","registered_on":"2025-08-27"},
        ...
      ]
    }
    응답: {"ok": true, "inserted": N}
    """
    try:
        data = request.get_json() or {}
        items = data.get("items") or []
        if not isinstance(items, list) or not items:
            return jsonify({"ok": False, "error": "items required"}), 400

        rows = []
        import datetime
        today_str = datetime.date.today().isoformat()

        for it in items:
            w  = (it.get("word") or "").strip()
            m  = (it.get("meaning") or "").strip()
            ex = (it.get("example") or "").strip()
            reg = (it.get("registered_on") or "").strip()[:10] or today_str
            if not w or not m:
                continue
            rows.append((w, m, ex, 1, reg))  # level=1 기본

        if not rows:
            return jsonify({"ok": False, "error": "no valid rows"}), 400

        with get_conn() as conn, conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO words (word, meaning, example, level, registered_on) VALUES (%s,%s,%s,%s,%s)",
                rows
            )
            conn.commit()

        return jsonify({"ok": True, "inserted": len(rows)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# 3) 단어 목록 (검색/일자 필터)
@app.get("/api/words")
def api_list_words():
    q_date = request.args.get("date")  # YYYY-MM-DD
    q = (request.args.get("q") or "").strip()

    sql = "SELECT * FROM words"
    conds, params = [], []
    if q_date:
        conds.append("registered_on = %s")
        params.append(q_date)
    if q:
        conds.append("(word LIKE %s OR meaning LIKE %s)")
        params.extend([f"%{q}%", f"%{q}%"])
    if conds:
        sql += " WHERE " + " AND ".join(conds)
    sql += " ORDER BY id DESC"

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return jsonify(rows)

# 4) 퀴즈 풀 (일자 필터)
@app.get("/api/quiz")
def api_quiz_pool():
    q_date = request.args.get("date")
    with get_conn() as conn, conn.cursor() as cur:
        if q_date:
            cur.execute("SELECT * FROM words WHERE registered_on=%s ORDER BY id DESC", (q_date,))
        else:
            cur.execute("SELECT * FROM words ORDER BY id DESC")
        rows = cur.fetchall()
    return jsonify(rows)

# 5) 정답/오답 결과 반영
@app.post("/api/words/<int:wid>/result")
def api_update_result(wid):
    data = request.get_json() or {}
    is_correct = bool(data.get("correct"))

    with get_conn() as conn, conn.cursor() as cur:
        if is_correct:
            cur.execute(
                "UPDATE words SET correct = correct + 1, last_tested = NOW() WHERE id=%s",
                (wid,),
            )
        else:
            cur.execute(
                "UPDATE words SET wrong = wrong + 1, last_tested = NOW() WHERE id=%s",
                (wid,),
            )
        conn.commit()
    return jsonify({"ok": True})

# 6) 일자별 통계
@app.get("/api/stats/daily")
def api_stats_daily():
    d_from = request.args.get("from")
    d_to = request.args.get("to")

    sql = """
      SELECT registered_on AS day,
             COUNT(*)       AS words,
             SUM(correct)   AS correct,
             SUM(wrong)     AS wrong
        FROM words
    """
    params, conds = [], []
    if d_from:
        conds.append("registered_on >= %s")
        params.append(d_from)
    if d_to:
        conds.append("registered_on <= %s")
        params.append(d_to)
    if conds:
        sql += " WHERE " + " AND ".join(conds)
    sql += " GROUP BY registered_on ORDER BY registered_on DESC"

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        tot = (r["correct"] or 0) + (r["wrong"] or 0)
        r["accuracy"] = round((r["correct"] or 0) * 100 / tot, 1) if tot else 0.0

    return jsonify(rows)

# =======================
# 개발 서버 실행
# =======================
if __name__ == "__main__":
    # 로컬/개발 실행용 (PythonAnywhere는 WSGI가 app을 직접 로드)
    app.run(host="0.0.0.0", port=3000, debug=True)


# 단어 삭제
@app.delete("/api/words/<int:wid>")
def api_delete_word(wid):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM words WHERE id=%s", (wid,))
            conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

