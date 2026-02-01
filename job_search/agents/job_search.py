# agents/job_search_agent.py
import sqlite3

def fetch_new_jobs(student_skills, student_location="Remote"):
    conn = sqlite3.connect("data/data/jobs.db")
    c = conn.cursor()
    
    c.execute("SELECT * FROM jobs")
    jobs = []
    for row in c.fetchall():
        job_id, title, company, skills_csv, location, apply_url = row
        skills = skills_csv.split(",")
        if set(student_skills) & set(skills) and (location == student_location or location=="Remote"):
            jobs.append({
                "job_id": job_id,
                "job_title": title,
                "company_name": company,
                "skills": skills,
                "location": location,
                "apply_url": apply_url
            })
    conn.close()
    return jobs



