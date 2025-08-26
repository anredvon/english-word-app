from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

# 정적 파일 서빙(선택: Replit이 자동처리하지만 명시해둠)
@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

if __name__ == "__main__":
    # Replit에서 포트 환경변수 처리 없이도 잘 뜨도록 기본값 사용
    app.run(host="0.0.0.0", port=3000, debug=True)
