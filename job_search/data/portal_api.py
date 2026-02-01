from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from datetime import datetime
import uuid
import json
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "jobs.db")

# ---------------- App Init ----------------
app = FastAPI(
    title="Autonomous Job Portal Backend",
    version="1.0.0"
)
@app.get("/")
def root():
    return {"message": "Job Portal Backend is running"}


# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DB Utilities ----------------
def get_connection():
    # ensure db directory exists
    db_dir = os.path.dirname(DB_FILE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")  # concurrency safe
    return conn

def init_db():
    # Always ensure required tables exist (safe to call multiple times)
    conn = get_connection()
    c = conn.cursor()
    # Jobs table
    c.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY,
            title TEXT,
            company TEXT,
            location TEXT,
            type TEXT,
            salary TEXT,
            description TEXT,
            requirements TEXT,
            skills TEXT,
            posted TEXT,
            deadline TEXT,
            remote INTEGER,
            logo TEXT
        )
    """)
    # Applications table (8 columns)
    c.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            application_id TEXT PRIMARY KEY,
            job_id TEXT,
            student_name TEXT,
            resume TEXT,
            bullets TEXT,
            proofs TEXT,
            status TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------------- Schemas ----------------
class JobCreate(BaseModel):
    id: int = None
    title: str
    company: str
    location: str
    type: str = ""
    salary: str = ""
    description: str = ""
    requirements: list[str] = []
    skills: list[str] = []
    posted: str = ""
    deadline: str = ""
    remote: bool = False
    logo: str = ""

class ApplyRequest(BaseModel):
    job_id: str
    student_name: str
    resume: dict
    bullets: list[str]
    proofs: dict

# ---------------- Health ----------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------- Jobs ----------------
@app.get("/jobs")
def get_jobs():
    try:
        conn = get_connection()
        rows = conn.execute("SELECT * FROM jobs").fetchall()
        conn.close()
    except sqlite3.OperationalError:
        # If tables missing, initialize and return empty list
        init_db()
        return []

    return [
        {
            "id": r[0],
            "title": r[1],
            "company": r[2],
            "location": r[3],
            "type": r[4],
            "salary": r[5],
            "description": r[6],
            "requirements": json.loads(r[7]) if r[7] else [],
            "skills": json.loads(r[8]) if r[8] else [],
            "posted": r[9],
            "deadline": r[10],
            "remote": bool(r[11]),
            "logo": r[12],
        }
        for r in rows
    ]

@app.post("/add_job")
def add_job(job: JobCreate):
    try:
        conn = get_connection()
        conn.execute(
            """INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                job.id,
                job.title,
                job.company,
                job.location,
                job.type,
                job.salary,
                job.description,
                json.dumps(job.requirements),
                json.dumps(job.skills),
                job.posted,
                job.deadline,
                int(job.remote),
                job.logo,
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.OperationalError:
        init_db()
        conn = get_connection()
        conn.execute(
            """INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                job.id,
                job.title,
                job.company,
                job.location,
                job.type,
                job.salary,
                job.description,
                json.dumps(job.requirements),
                json.dumps(job.skills),
                job.posted,
                job.deadline,
                int(job.remote),
                job.logo,
            ),
        )
        conn.commit()
        conn.close()
    return {"status": "success", "job_id": job.id}

# ---------------- Applications ----------------
@app.get("/applications")
def get_applications():
    try:
        conn = get_connection()
        rows = conn.execute("SELECT * FROM applications ORDER BY timestamp DESC").fetchall()
        conn.close()
    except sqlite3.OperationalError:
        init_db()
        return []

    return [
        {
            "application_id": r[0],
            "job_id": r[1],
            "student_name": r[2],
            "status": r[6],
            "timestamp": r[7],
        }
        for r in rows
    ]

@app.post("/apply")
def apply_job(req: ApplyRequest):
    application_id = str(uuid.uuid4())
    try:
        conn = get_connection()
        conn.execute(
            "INSERT INTO applications VALUES (?,?,?,?,?,?,?,?)",
            (
                application_id,
                req.job_id,
                req.student_name,
                json.dumps(req.resume),
                json.dumps(req.bullets),
                json.dumps(req.proofs),
                "submitted",
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.OperationalError:
        # Try to create missing tables then retry
        init_db()
        conn = get_connection()
        conn.execute(
            "INSERT INTO applications VALUES (?,?,?,?,?,?,?,?)",
            (
                application_id,
                req.job_id,
                req.student_name,
                json.dumps(req.resume),
                json.dumps(req.bullets),
                json.dumps(req.proofs),
                "submitted",
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        conn.close()
    return {"status": "success", "application_id": application_id}