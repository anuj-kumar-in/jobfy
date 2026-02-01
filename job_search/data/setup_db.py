import json
import sqlite3
import os

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "jobs.db")
JSON_PATH = os.path.join(SCRIPT_DIR, "jobs.json")



# -------------------- Initialize DB --------------------
def init_db():
    # Delete old database if it exists
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("🗑️ Old database removed")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create jobs table
    cursor.execute("""
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
    
    # Create applications table (required for /apply endpoint)
    cursor.execute("""
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
    print("✅ Database initialized successfully (jobs + applications tables)")

# -------------------- Insert Jobs --------------------
def insert_jobs(jobs_list: list):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    inserted = 0

    for job in jobs_list:
        # Skip if job is not a dict (e.g., if iterating over dict keys by mistake)
        if not isinstance(job, dict):
            print(f"⚠️ Skipping non-dict item: {job}")
            continue
            
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO jobs (
                    id, title, company, location, type, salary,
                    description, requirements, skills,
                    posted, deadline, remote, logo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job.get("id"),
                job.get("title"),
                job.get("company"),
                job.get("location"),
                job.get("type"),
                job.get("salary"),
                job.get("description"),
                json.dumps(job.get("requirements", [])),
                json.dumps(job.get("skills", [])),
                job.get("posted"),
                job.get("deadline"),
                job.get("remote"),
                job.get("logo")
            ))
            inserted += 1
        except Exception as e:
            print(f"❌ Failed to insert job {job.get('id')}: {e}")

    conn.commit()
    conn.close()
    print(f"📦 Jobs inserted: {inserted}")
    print(f"📁 DB location: {DB_PATH}")


# -------------------- Main --------------------
if __name__ == "__main__":
    print(f"📂 Loading jobs from: {JSON_PATH}")
    
    init_db()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_json = json.load(f)

    # Handle both array format and object with "jobs" key
    if isinstance(raw_json, list):
        jobs_list = raw_json
    elif isinstance(raw_json, dict):
        jobs_list = raw_json.get("jobs", [])
    else:
        print("❌ Invalid JSON format")
        jobs_list = []

    insert_jobs(jobs_list)






