# portal.py
import streamlit as st
import sqlite3
from datetime import datetime
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import requests
import uvicorn

DB_FILE = "jobs.db"

# ------------------- BACKEND -------------------
api = FastAPI()

# Allow CORS for Streamlit UI
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

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

# ------------------- API ROUTES -------------------
@api.get("/jobs")
def get_jobs():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM jobs").fetchall()
    conn.close()
    return [
        {"job_id": r[0], "job_title": r[1], "company_name": r[2], "skills": r[3].split(","), "location": r[4]}
        for r in rows
    ]

@api.post("/add_job")
def add_job(payload: dict):
    conn = get_connection()
    conn.execute(
        "INSERT INTO jobs VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), payload["job_title"], payload["company_name"], ",".join(payload["skills"]), payload["location"])
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

@api.get("/applications")
def get_applications():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM applications ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [{"application_id": r[0], "job_id": r[1], "student_name": r[2], "status": r[3], "timestamp": r[4]} for r in rows]

@api.post("/apply")
def apply_job(payload: dict):
    conn = get_connection()
    conn.execute(
        "INSERT INTO applications VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), payload["job_id"], payload["student_name"], "submitted", datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return {"status": "submitted"}

# ------------------- RUN FASTAPI IN BACKGROUND THREAD -------------------
def run_api():
    uvicorn.run(api, host="0.0.0.0", port=7860)

threading.Thread(target=run_api, daemon=True).start()

# ------------------- STREAMLIT UI -------------------
st.set_page_config(page_title="💼 Job Portal", layout="wide")
st.title("💼 Job Portal (UI + Backend)")

tab1, tab2, tab3 = st.tabs(["Jobs", "Applications", "Add Job"])

API_URL = "http://127.0.0.1:7860"

# ------------------- Jobs Tab -------------------
with tab1:
    st.subheader("Available Jobs")
    jobs = requests.get(f"{API_URL}/jobs").json()
    if not jobs:
        st.info("No jobs available.")
    for job in jobs:
        st.markdown(f"### {job['job_title']}")
        st.write(job["company_name"], "-", job["location"])
        st.write("Skills:", ", ".join(job["skills"]))

        name = st.text_input("Your Name", key=f"name_{job['job_id']}")
        if st.button("Apply", key=f"apply_{job['job_id']}"):
            requests.post(f"{API_URL}/apply", json={"job_id": job["job_id"], "student_name": name})
            st.success("Application submitted!")
            st.rerun()
        st.divider()

# ------------------- Applications Tab -------------------
with tab2:
    st.subheader("Applications")
    apps = requests.get(f"{API_URL}/applications").json()
    if not apps:
        st.info("No applications submitted yet.")
    for app in apps:
        st.write(f"{app['student_name']} → Job {app['job_id']} | {app['status']} | {app['timestamp']}")
        st.divider()

# ------------------- Add Job Tab -------------------
with tab3:
    st.subheader("Add New Job")
    title = st.text_input("Job Title", key="add_title")
    company = st.text_input("Company Name", key="add_company")
    skills = st.text_input("Skills (comma-separated)", key="add_skills")
    location = st.selectbox("Location", ["Remote", "Onsite"], key="add_location")
    if st.button("Add Job"):
        requests.post(
            f"{API_URL}/add_job",
            json={
                "job_title": title,
                "company_name": company,
                "skills": [s.strip() for s in skills.split(",")],
                "location": location
            }
        )
        st.success("Job added!")
        st.rerun()
