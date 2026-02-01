# agent_runner.py
import os
import asyncio
import requests
from  artifact_agent import ArtifactAgent
from ranking_agent import rank_jobs
from apply_policy import should_apply

PORTAL_API = "https://krishnasimha-portal-backend.hf.space"

def run_agent_once(
    student_name: str,
    preferred_role: str,
    resume_text: str,
    together_api_key: str,
    max_apply_pct=(0.30, 0.45)
):
    artifact_agent = ArtifactAgent(together_api_key)
    artifacts = asyncio.run(artifact_agent.run_async(resume_text))

    student_profile = artifacts["profile"]
    student_profile["preferred_role"] = preferred_role

    bullets = artifacts["bullet_bank"]
    proofs = artifacts["proof_pack"]

    jobs = requests.get(f"{PORTAL_API}/jobs", timeout=10).json()
    ranked_jobs = rank_jobs(jobs, student_profile)

    total_jobs = len(ranked_jobs)
    max_apply = int(total_jobs * max_apply_pct[1])

    applied = []

    for item in ranked_jobs:
        if len(applied) >= max_apply:
            break

        job = item["job"]
        score = item["score"]

        if not should_apply(score, len(applied)):
            continue

        payload = {
            "job_id": job["job_id"],
            "student_name": student_name,
            "resume": student_profile,
            "bullets": [b["bullet"] for b in bullets],
            "proofs": {"links": proofs},
        }

        res = requests.post(f"{PORTAL_API}/apply", json=payload, timeout=15).json()

        applied.append({
            "job_id": job["job_id"],
            "job_title": job["job_title"],
            "score": score,
            "status": res.get("status", "applied")
        })

    return {
        "applied_jobs": applied,
        "total_jobs_seen": total_jobs
    }

