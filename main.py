import os
import pymysql
import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)

# =======================
# MySQL 연결 설정
# =======================
DB_PASS = os.environ.get("DB_PASS")
if not DB_PASS:
    raise RuntimeError("환경변수 DB_PASS가 설정되지 않았습니다. PythonAnywhere Web탭 → Environment Variables에 등록하세요.")

DB = {
    "host": "anredvon.mysql.pythonanywhere-services.com",
    "user": "anredvon",
    "password": DB_PASS,
    "database": "anredvon$default",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

def get_conn():
    return pymysql.connect(**DB)

# =======================
# 간단한 API Key 인증
# =======================
API_KEY = os.environ.get("API_KEY", "")

def check_auth():
    """API_KEY 환경변수가 설정된 경우에만 인증 검사"""
    if not API_KEY:
        return True  # API_KEY 미설정 시 인증 생략 (개발 환경)
    key = request.headers.get("X-API-Key") or request.args.get("api_key")
    return key == API_KEY

# =======================
# UI 라우팅
# =======================
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

@app.get("/healthz")
def healthz():
    return "ok", 200

# =======================
# API
# =======================

# 1) 단어 등록
@app.post("/api/words")
def api_create_word():
    if not check_auth():
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    data = request.get_json() or {}
    word = (data.get("word") or "").strip()
    meaning = (data.get("meaning") or "").strip()
    example = (data.get("example") or "").strip()
    reg = (data.get("registered_on") or "").strip()[:10]

    if not word or not meaning:
        return jsonify({"ok": False, "error": "word/meaning required"}), 400
    if not reg:
        reg = datetime.date.today().isoformat()

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO words (word, meaning, example, level, registered_on) VALUES (%s,%s,%s,%s,%s)",
                (word, meaning, example, 1, reg),
            )
            conn.commit()
            new_id = cur.lastrowid
        return jsonify({"ok": True, "id": new_id})
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 2) 단어 대량 등록
@app.post("/api/words/bulk")
def api_create_words_bulk():
    if not check_auth():
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    data = request.get_json() or {}
    items = data.get("items") or []
    if not items:
        return jsonify({"ok": False, "error": "items required"}), 400

    today_str = datetime.date.today().isoformat()
    rows = []
    for it in items:
        w = (it.get("word") or "").strip()
        m = (it.get("meaning") or "").strip()
        ex = (it.get("example") or "").strip()
        reg = (it.get("registered_on") or "").strip()[:10] or today_str
        if not w or not m:
            continue
        rows.append((w, m, ex, 1, reg))

    if not rows:
        return jsonify({"ok": False, "error": "no valid rows"}), 400

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO words (word, meaning, example, level, registered_on) VALUES (%s,%s,%s,%s,%s)",
                rows
            )
            conn.commit()
        return jsonify({"ok": True, "inserted": len(rows)})
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 3) 단어 목록
@app.get("/api/words")
def api_list_words():
    q_date = request.args.get("date")
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

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 4) 퀴즈 풀
@app.get("/api/quiz")
def api_quiz_pool():
    q_date = request.args.get("date")
    try:
        with get_conn() as conn, conn.cursor() as cur:
            if q_date:
                cur.execute("SELECT * FROM words WHERE registered_on=%s ORDER BY id DESC", (q_date,))
            else:
                cur.execute("SELECT * FROM words ORDER BY id DESC")
            rows = cur.fetchall()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 5) 정답/오답 반영
@app.post("/api/words/<int:wid>/result")
def api_update_result(wid):
    data = request.get_json() or {}
    is_correct = bool(data.get("correct"))
    try:
        with get_conn() as conn, conn.cursor() as cur:
            if is_correct:
                cur.execute("UPDATE words SET correct=correct+1, last_tested=NOW() WHERE id=%s", (wid,))
            else:
                cur.execute("UPDATE words SET wrong=wrong+1, last_tested=NOW() WHERE id=%s", (wid,))
            conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 6) 일자별 통계
@app.get("/api/stats/daily")
def api_stats_daily():
    d_from = request.args.get("from")
    d_to = request.args.get("to")
    sql = """
      SELECT registered_on AS day,
             COUNT(*) AS words,
             SUM(correct) AS correct,
             SUM(wrong) AS wrong
        FROM words
    """
    conds, params = [], []
    if d_from:
        conds.append("registered_on >= %s")
        params.append(d_from)
    if d_to:
        conds.append("registered_on <= %s")
        params.append(d_to)
    if conds:
        sql += " WHERE " + " AND ".join(conds)
    sql += " GROUP BY registered_on ORDER BY registered_on DESC"

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        for r in rows:
            tot = (r["correct"] or 0) + (r["wrong"] or 0)
            r["accuracy"] = round((r["correct"] or 0) * 100 / tot, 1) if tot else 0
        return jsonify(rows)
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# 7) 단어 삭제
@app.delete("/api/words/<int:wid>")
def api_delete_word(wid):
    if not check_auth():
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM words WHERE id=%s", (wid,))
            conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": "DB 오류가 발생했습니다."}), 500

# =======================
if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=3000, debug=debug_mode)
