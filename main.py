import os
import pymysql
import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)
DB_PASS = os.environ.get("DB_PASS")
if not DB_PASS: raise RuntimeError("환경변수 DB_PASS가 설정되지 않았습니다. PythonAnywhere Web탭 → Environment Variables에 등록하세요.")
DB={"host":"anredvon.mysql.pythonanywhere-services.com","user":"anredvon","password":DB_PASS,"database":"anredvon$default","charset":"utf8mb4","cursorclass":pymysql.cursors.DictCursor}
def get_conn(): return pymysql.connect(**DB)
def ensure_study_events(cur):
    cur.execute("""CREATE TABLE IF NOT EXISTS study_events (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,word_id INT NOT NULL,is_correct TINYINT(1) NOT NULL,mode VARCHAR(24) NOT NULL DEFAULT 'study',studied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_study_events_date(studied_at),KEY idx_study_events_word(word_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
API_KEY=os.environ.get("API_KEY","")
def check_auth():
    if not API_KEY:return True
    return (request.headers.get("X-API-Key") or request.args.get("api_key"))==API_KEY
@app.route("/")
def home():return render_template("index.html")
@app.route("/static/<path:filename>")
def static_files(filename):return send_from_directory("static",filename)
@app.get("/healthz")
def healthz():return "ok",200
@app.post("/api/words")
def api_create_word():
    if not check_auth():return jsonify({"ok":False,"error":"Unauthorized"}),401
    d=request.get_json() or {};word=(d.get("word") or "").strip();meaning=(d.get("meaning") or "").strip();example=(d.get("example") or "").strip();reg=(d.get("registered_on") or "").strip()[:10] or datetime.date.today().isoformat()
    if not word or not meaning:return jsonify({"ok":False,"error":"word/meaning required"}),400
    try:
        with get_conn() as conn,conn.cursor() as cur:cur.execute("INSERT INTO words (word,meaning,example,level,registered_on) VALUES (%s,%s,%s,%s,%s)",(word,meaning,example,1,reg));conn.commit();new_id=cur.lastrowid
        return jsonify({"ok":True,"id":new_id})
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.post("/api/words/bulk")
def api_create_words_bulk():
    if not check_auth():return jsonify({"ok":False,"error":"Unauthorized"}),401
    d=request.get_json() or {};items=d.get("items") or [];today=datetime.date.today().isoformat();rows=[]
    for it in items:
        w=(it.get("word") or "").strip();m=(it.get("meaning") or "").strip();ex=(it.get("example") or "").strip();reg=(it.get("registered_on") or "").strip()[:10] or today
        if w and m:rows.append((w,m,ex,1,reg))
    if not rows:return jsonify({"ok":False,"error":"no valid rows"}),400
    try:
        with get_conn() as conn,conn.cursor() as cur:cur.executemany("INSERT INTO words (word,meaning,example,level,registered_on) VALUES (%s,%s,%s,%s,%s)",rows);conn.commit()
        return jsonify({"ok":True,"inserted":len(rows)})
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.get("/api/words")
def api_list_words():
    q_date=request.args.get("date");q=(request.args.get("q") or "").strip();sql="SELECT * FROM words";conds=[];params=[]
    if q_date:conds.append("registered_on=%s");params.append(q_date)
    if q:conds.append("(word LIKE %s OR meaning LIKE %s)");params.extend([f"%{q}%",f"%{q}%"])
    if conds:sql+=" WHERE "+" AND ".join(conds)
    sql+=" ORDER BY id DESC"
    try:
        with get_conn() as conn,conn.cursor() as cur:cur.execute(sql,params);rows=cur.fetchall()
        return jsonify(rows)
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.get("/api/quiz")
def api_quiz_pool():
    q_date=request.args.get("date")
    try:
        with get_conn() as conn,conn.cursor() as cur:
            cur.execute("SELECT * FROM words WHERE registered_on=%s ORDER BY id DESC" if q_date else "SELECT * FROM words ORDER BY id DESC",(q_date,) if q_date else ())
            rows=cur.fetchall()
        return jsonify(rows)
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.post("/api/words/<int:wid>/result")
def api_update_result(wid):
    d=request.get_json() or {};ok=bool(d.get("correct"));mode=(d.get("mode") or "study").strip().lower()[:24]
    if not (mode in {"study","new","review","typing","handwriting"} or mode.startswith("quiz")):mode="study"
    try:
        with get_conn() as conn,conn.cursor() as cur:
            ensure_study_events(cur);cur.execute("UPDATE words SET correct=correct+1,last_tested=NOW() WHERE id=%s" if ok else "UPDATE words SET wrong=wrong+1,last_tested=NOW() WHERE id=%s",(wid,))
            if cur.rowcount==0:conn.rollback();return jsonify({"ok":False,"error":"word not found"}),404
            cur.execute("INSERT INTO study_events (word_id,is_correct,mode,studied_at) VALUES (%s,%s,%s,NOW())",(wid,1 if ok else 0,mode));conn.commit()
        return jsonify({"ok":True})
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500

def _event_filters():
    d_from=request.args.get("from");d_to=request.args.get("to");conds=[];params=[]
    if d_from:conds.append("DATE(studied_at)>=%s");params.append(d_from)
    if d_to:conds.append("DATE(studied_at)<=%s");params.append(d_to)
    return conds,params
@app.get("/api/stats/daily")
def api_stats_daily():
    conds,params=_event_filters();sql="SELECT DATE(studied_at) day,COUNT(DISTINCT word_id) words,SUM(is_correct=1) correct,SUM(is_correct=0) wrong,COUNT(*) attempts FROM study_events"+(" WHERE "+" AND ".join(conds) if conds else "")+" GROUP BY DATE(studied_at) ORDER BY day DESC"
    try:
        with get_conn() as conn,conn.cursor() as cur:ensure_study_events(cur);cur.execute(sql,params);rows=cur.fetchall();conn.commit()
        for r in rows:r["accuracy"]=round(int(r.get("correct") or 0)*100/int(r.get("attempts") or 1),1)
        return jsonify(rows)
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.get("/api/history")
def api_history():
    conds,params=_event_filters();sql="SELECT DATE(studied_at) day,COUNT(DISTINCT word_id) words,COUNT(*) attempts,SUM(is_correct=1) correct,SUM(is_correct=0) wrong,SUM(mode LIKE 'review%') review_attempts,SUM(mode LIKE 'quiz%') quiz_attempts FROM study_events"+(" WHERE "+" AND ".join(conds) if conds else "")+" GROUP BY DATE(studied_at) ORDER BY day DESC"
    try:
        with get_conn() as conn,conn.cursor() as cur:ensure_study_events(cur);cur.execute(sql,params);rows=cur.fetchall();conn.commit()
        return jsonify(rows)
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.get("/api/stats/summary")
def api_stats_summary():
    try:
        with get_conn() as conn,conn.cursor() as cur:ensure_study_events(cur);cur.execute("SELECT COUNT(*) attempts,COUNT(DISTINCT word_id) learned_words,SUM(is_correct=1) correct,SUM(is_correct=0) wrong,MIN(studied_at) first_studied_at,MAX(studied_at) last_studied_at FROM study_events");row=cur.fetchone() or {};conn.commit()
        attempts=int(row.get("attempts") or 0);row["accuracy"]=round(int(row.get("correct") or 0)*100/attempts,1) if attempts else None;return jsonify(row)
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
@app.delete("/api/words/<int:wid>")
def api_delete_word(wid):
    if not check_auth():return jsonify({"ok":False,"error":"Unauthorized"}),401
    try:
        with get_conn() as conn,conn.cursor() as cur:ensure_study_events(cur);cur.execute("DELETE FROM study_events WHERE word_id=%s",(wid,));cur.execute("DELETE FROM words WHERE id=%s",(wid,));conn.commit()
        return jsonify({"ok":True})
    except Exception:return jsonify({"ok":False,"error":"DB 오류가 발생했습니다."}),500
if __name__=="__main__":app.run(host="0.0.0.0",port=3000,debug=os.environ.get("FLASK_DEBUG","false").lower()=="true")