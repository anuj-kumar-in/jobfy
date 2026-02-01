import sqlite3
import json
import os
from datetime import datetime

# ---------------- CONFIG ----------------
DB_FILE = "data/jobs.db"
JSON_FILE = r"C:\Users\Krishna\Desktop\job_search\data\jobs.json"

# Ensure DB folder exists
os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)

# ---------------- LOAD JSON ----------------
with open(JSON_FILE, "r", encoding="utf-8") as f:
    jobs_data = json.load(f)

# ---------------- CONNECT DB ----------------
conn = sqlite3.connect(DB_FILE)
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS jobs")
# ---------------- CREATE TABLES ----------------
c.execute("""
CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    job_title TEXT,
    company_name TEXT,
    skills TEXT,
    location TEXT,
    job_type TEXT,
    salary TEXT,
    remote INTEGER,
    source TEXT,
    created_at TEXT
)
""")

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

# ---------------- NORMALIZATION HELPERS ----------------
def normalize_job(job):
    """
    Converts mixed job formats into a unified schema
    """

    job_id = job.get("job_id") or f"EXT_{job.get('id')}"
    job_title = job.get("job_title") or job.get("title", "Unknown Role")
    company_name = job.get("company_name") or job.get("company", "Unknown Company")

    skills = job.get("skills", [])
    skills_str = ",".join(skills)

    location = job.get("location", "Remote")

    job_type = job.get("type", "Internship")

    salary = job.get("salary", "Not disclosed")

    remote = job.get("remote")
    if remote is None:
        remote = 1 if location.lower() == "remote" else 0
    else:
        remote = int(bool(remote))

    source = "demo" if "job_id" in job else "external"

    created_at = datetime.utcnow().isoformat()

    return (
        job_id,
        job_title,
        company_name,
        skills_str,
        location,
        job_type,
        salary,
        remote,
        source,
        created_at
    )

# ---------------- INSERT JOBS ----------------
inserted = 0

for job in jobs_data:
    try:
        normalized_job = normalize_job(job)

        c.execute("""
            INSERT OR REPLACE INTO jobs (
                job_id,
                job_title,
                company_name,
                skills,
                location,
                job_type,
                salary,
                remote,
                source,
                created_at
            )
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, normalized_job)

        inserted += 1

    except Exception as e:
        print(f"❌ Failed to insert job: {job}")
        print("Error:", e)

conn.commit()
conn.close()

print(f"✅ Database initialized successfully")
print(f"📦 Jobs inserted: {inserted}")
print(f"📁 DB location: {DB_FILE}")



