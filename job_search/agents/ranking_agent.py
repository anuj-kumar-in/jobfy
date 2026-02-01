# agents/ranking_agent.py

def rank_jobs(jobs, student_profile):
    """
    Rank jobs based on multiple factors:
    - Skills match (40%)
    - Role match (20%)
    - Location match (20%)
    - Remote preference match (20%)
    """
    student_skills = set(map(str.lower, student_profile.get("skills", [])))
    role = student_profile.get("preferred_role", "").lower()
    preferred_location = (student_profile.get("preferred_location") or "").lower()
    remote_preference = student_profile.get("remote_preference", True)

    ranked = []

    for job in jobs:
        # Get job details with safe defaults
        job_skills = set(map(str.lower, job.get("skills", [])))
        job_title = job.get("title", job.get("job_title", "")).lower()
        job_location = job.get("location", "").lower()
        job_remote = job.get("remote", False)

        # 1. Skill score (40%) - intersection of skills
        skill_score = len(student_skills & job_skills) / max(len(job_skills), 1)

        # 2. Role score (20%) - preferred role in job title
        role_score = 1.0 if role and role in job_title else 0.0

        # 3. Location score (20%) - location match
        location_score = 0.0
        if preferred_location:
            if preferred_location in job_location or job_location in preferred_location:
                location_score = 1.0
            elif "remote" in preferred_location.lower() and job_remote:
                location_score = 1.0

        # 4. Remote score (20%) - remote preference match
        remote_score = 0.0
        if remote_preference and job_remote:
            remote_score = 1.0
        elif not remote_preference and not job_remote:
            remote_score = 1.0
        elif remote_preference is None:  # Flexible
            remote_score = 0.5

        # Calculate weighted score
        score = (0.4 * skill_score + 
                 0.2 * role_score + 
                 0.2 * location_score + 
                 0.2 * remote_score)

        ranked.append({
            "job": job,
            "score": round(score, 3)
        })

    return sorted(ranked, key=lambda x: x["score"], reverse=True)
