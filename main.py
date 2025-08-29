import os
import random
import pymysql
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)

# =======================
# MySQL 연결 설정 (환경변수에서 비밀번호 불러오기)
# =======================
DB = {
    "host": "anredvon.mysql.pythonanywhere-services.com",
    "user": "anredvon",
    # 👉 환경변수 미사용, 직접 비밀번호 입력 (나중에 보안 위해 환경변수로 옮기는 걸 권장)
    "password": "A601313b!",  
    "database": "anredvon$default",   # 현재 사용하는 DB명
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

def get_conn():
    return pymysql.connect(**DB)

# =======================
# 라우팅
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
@app.post("/api/words")
def api_create_word():
    try:
        data = request.get_json() or {}
        word = (data.get("word") or "").strip()
        meaning = (data.get("meaning") or "").strip()
        example = (data.get("example") or "").strip()
        level = int(data.get("level") or 1)
        reg = (data.get("registered_on") or "").strip()[:10]

        if not word or not meaning:
            return jsonify({"ok": False, "error": "word/meaning required"}), 400

        if not reg:
            import datetime
            reg = datetime.date.today().isoformat()

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO words (word, meaning, example, level, registered_on) VALUES (%s, %s, %s, %s, %s)",
                (word, meaning, example, level, reg),
            )
            conn.commit()
            new_id = cur.lastrowid

        return jsonify({"ok": True, "id": new_id})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post("/api/words/bulk")
def api_create_words_bulk():
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
            rows.append((w, m, ex, 1, reg))

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

@app.get("/api/words")
def api_list_words():
    q_date = request.args.get("date")
    q = (request.args.get("q") or "").strip()

    sql = "SELECT * FROM words"
    conds, params = [], []
    if q_date:
        conds.append("DATE(registered_on) = %s")
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

@app.get("/api/quiz")
def api_quiz_pool():
    q_date = request.args.get("date")
    with get_conn() as conn, conn.cursor() as cur:
        if q_date:
            cur.execute("SELECT * FROM words WHERE DATE(registered_on)=%s ORDER BY id DESC", (q_date,))
        else:
            cur.execute("SELECT * FROM words ORDER BY id DESC")
        rows = cur.fetchall()
    return jsonify(rows)

@app.get("/api/quiz2")
def api_quiz2():
    mode = request.args.get("mode", "en2ko")
    d = request.args.get("date")

    sql = "SELECT id, word, meaning, example FROM words"
    params = []
    if d:
        sql += " WHERE DATE(registered_on)=%s"
        params.append(d)
    sql += " ORDER BY RAND() LIMIT 100"

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return jsonify([])

    out = []
    for item in rows:
        if mode == "en2ko":
            q = {"id": item["id"], "question": item["word"], "answer": item["meaning"], "type": "mc"}
        elif mode == "ko2en":
            q = {"id": item["id"], "question": item["meaning"], "answer": item["word"], "type": "mc"}
        elif mode == "cloze":
            sentence = (item.get("example") or f"{item['word']} is ...").replace(item["word"], "_____")
            q = {"id": item["id"], "question": sentence, "answer": item["word"], "type": "mc"}
        elif mode == "sa_en2ko":
            q = {"id": item["id"], "question": item["word"], "answer": item["meaning"], "type": "sa"}
        elif mode == "sa_ko2en":
            q = {"id": item["id"], "question": item["meaning"], "answer": item["word"], "type": "sa"}
        elif mode == "sa_cloze":
            sentence = (item.get("example") or f"{item['word']} is ...").replace(item["word"], "_____")
            q = {"id": item["id"], "question": sentence, "answer": item["word"], "type": "sa"}
        else:
            q = {"id": item["id"], "question": item["word"], "answer": item["meaning"], "type": "mc"}
        out.append(q)
    return jsonify(out)

@app.post("/api/words/<int:wid>/result")
def api_update_result(wid):
    data = request.get_json() or {}
    is_correct = bool(data.get("correct"))
    with get_conn() as conn, conn.cursor() as cur:
        if is_correct:
            cur.execute("UPDATE words SET correct = correct + 1, last_tested = NOW() WHERE id=%s", (wid,))
        else:
            cur.execute("UPDATE words SET wrong = wrong + 1, last_tested = NOW() WHERE id=%s", (wid,))
        conn.commit()
    return jsonify({"ok": True})

@app.get("/api/stats/daily")
def api_stats_daily():
    d_from = request.args.get("from")
    d_to = request.args.get("to")

    sql = '''
      SELECT DATE(registered_on) AS day,
             COUNT(*)       AS words,
             SUM(correct)   AS correct,
             SUM(wrong)     AS wrong
        FROM words
    '''
    params, conds = [], []
    if d_from:
        conds.append("DATE(registered_on) >= %s")
        params.append(d_from)
    if d_to:
        conds.append("DATE(registered_on) <= %s")
        params.append(d_to)
    if conds:
        sql += " WHERE " + " AND ".join(conds)
    sql += " GROUP BY DATE(registered_on) ORDER BY DATE(registered_on) DESC"

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        tot = (r["correct"] or 0) + (r["wrong"] or 0)
        r["accuracy"] = round((r["correct"] or 0) * 100 / tot, 1) if tot else 0.0

    return jsonify(rows)

@app.delete("/api/words/<int:wid>")
def api_delete_word(wid):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM words WHERE id=%s", (wid,))
            conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# =======================
# 개발 서버 실행
# =======================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
