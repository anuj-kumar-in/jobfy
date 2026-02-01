# agents/ranking_agent.py

def rank_jobs(jobs, student_profile):
    student_skills = set(map(str.lower, student_profile.get("skills", [])))
    role = student_profile.get("preferred_role", "").lower()

    ranked = []

    for job in jobs:
        job_skills = set(map(str.lower, job["skills"]))

        skill_score = len(student_skills & job_skills) / max(len(job_skills), 1)
        role_score = 1.0 if role in job["job_title"].lower() else 0.0

        score = 0.7 * skill_score + 0.3 * role_score

        ranked.append({
            "job": job,
            "score": round(score, 3)
        })

    return sorted(ranked, key=lambda x: x["score"], reverse=True)
