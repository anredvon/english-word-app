import os
import pymysql
import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)

DB_PASS = os.environ.get("DB_PASS")
if not DB_PASS:
    raise RuntimeError("환경변수 DB_PASS가 설정되지 않았습니다. PythonAnywhere Web탭 → Environment Variables에 등록하세요.")

DB = {
    "host": "anredvon.mysql.pythonanywhere-services.com",
    "user": "anredvon",
    "password": DB_PASS,
   