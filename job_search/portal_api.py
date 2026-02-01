# portal_backend.py
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import uuid

DB_FILE = "jobs.db"

# ---------------- DB UTILS ----------------
def get_connection():
    return sqlite3.connect(DB_FILE, check_same_thread=False)

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            job_title TEXT,
            company_name TEXT,
            skills TEXT,
            location TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            application_id TEXT PRIMARY KEY,
            job_id TEXT,
            student_name TEXT,
            status TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------------- FASTAPI ----------------
app = FastAPI(title="Job Portal API")

# Allow CORS for your Streamlit frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for Hugging Face
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MODELS ----------------
class Application(BaseModel):
    job_id: str
    student_name: str

# ---------------- ENDPOINTS ----------------
@app.get("/jobs")
def get_jobs():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM jobs").fetchall()
    conn.close()
    return [
        {
            "job_id": r[0],
            "job_title": r[1],
            "company_name": r[2],
            "skills": r[3].split(","),
            "location": r[4]
        } for r in rows
    ]

@app.get("/applications")
def get_applications():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM applications ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [
        {
            "application_id": r[0],
            "job_id": r[1],
            "student_name": r[2],
            "status": r[3],
            "timestamp": r[4]
        } for r in rows
    ]

@app.post("/apply")
def apply_job(app: Application):
    application_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    conn = get_connection()
    conn.execute(
        "INSERT INTO applications VALUES (?,?,?,?,?)",
        (application_id, app.job_id, app.student_name, "submitted", timestamp)
    )
    conn.commit()
    conn.close()
    return {"status": "submitted", "application_id": application_id, "timestamp": timestamp}

@app.post("/add_job")
def add_job(job_title: str, company_name: str, skills: list[str], location: str):
    conn = get_connection()
    conn.execute(
        "INSERT INTO jobs VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), job_title, company_name, ",".join(skills), location)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}
