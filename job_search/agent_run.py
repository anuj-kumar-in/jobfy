import time
import requests
import asyncio
from agents.artifact_agent import ArtifactAgent
from agents.ranking_agent import rank_jobs
from agents.apply_policy import should_apply

PORTAL_API = "https://krishnasimha-portal-backend.hf.space"  # your FastAPI backend
AGENT_INTERVAL = 30  # seconds


def run_agent(student_name: str, preferred_role: str, resume_text: str, together_api_key: str):
    print(f"🤖 Agent started for {student_name}")

    # 1️⃣ Artifact generation
    artifact_agent = ArtifactAgent("888fb84e1b638788f3b6e59865697fa5e52ade7a091e1a1777aa883eb92ddbba")
    artifacts = asyncio.run(artifact_agent.run_async(resume_text))

    student_profile = artifacts["profile"]
    student_profile["preferred_role"] = preferred_role
    bullets = artifacts["bullet_bank"]
    proofs = artifacts["proof_pack"]

    applied_today = 0

    # 2️⃣ Main loop — first GET then immediately POST one job to see apply working
    try:
        jobs = requests.get(f"{PORTAL_API}/jobs", timeout=10).json()
        if jobs:
            # pick first job to test
            job = jobs[0]

            payload = {
                "job_id": job["job_id"],
                "student_name": student_name,
                "resume": student_profile,
                "bullets": [b["bullet"] for b in bullets],
                "proofs": {"links": proofs},  # dict
            }

            res = requests.post(f"{PORTAL_API}/apply", json=payload, timeout=15).json()
            print("✅ Applied test job:", res)
            applied_today += 1

        # continue normal loop
        while True:
            ranked_jobs = rank_jobs(jobs, student_profile)
            for item in ranked_jobs:
                job = item["job"]
                score = item["score"]

                if not should_apply(score, applied_today):
                    continue

                payload = {
                    "job_id": job["job_id"],
                    "student_name": student_name,
                    "resume": student_profile,
                    "bullets": [b["bullet"] for b in bullets],
                    "proofs": {"links": proofs},
                }

                res = requests.post(f"{PORTAL_API}/apply", json=payload, timeout=15).json()
                print("✅ Applied:", res)
                applied_today += 1

            time.sleep(AGENT_INTERVAL)

    except Exception as e:
        print("⚠️ Agent error:", e)

