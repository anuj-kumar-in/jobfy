import time
import requests

from agents.artifact_agent import ArtifactAgent
from agents.ranking_agent import rank_jobs
from agents.apply_policy import should_apply

PORTAL_API = "https://krishnasimha-portal-backend.hf.space"
AGENT_INTERVAL = 30


def run_agent(student_payload: dict, together_api_key: str):
    student_name = student_payload["student_name"]
    preferred_role = student_payload["preferred_role"]
    resume_text = student_payload["resume_text"]

    print("🤖 Agent booting for:", student_name)

    # -------- Artifact Generation --------
    agent = ArtifactAgent("888fb84e1b638788f3b6e59865697fa5e52ade7a091e1a1777aa883eb92ddbba")
    artifacts = agent.run(resume_text)

    student_profile = artifacts["profile"]
    student_profile["preferred_role"] = preferred_role

    bullets = artifacts["bullet_bank"]
    proofs = artifacts["proof_pack"]

    applied_today = 0

    # -------- Agent Loop --------
    while True:
        jobs = requests.get(f"{PORTAL_API}/jobs").json()
        ranked = rank_jobs(jobs, student_profile)

        for item in ranked:
            job = item["job"]
            score = item["score"]

            if not should_apply(score, applied_today):
                continue

            payload = {
                "job_id": job["job_id"],
                "student_name": student_name,
                "resume": student_profile,
                "bullets": [b["bullet"] for b in bullets],
                "proofs": proofs,
            }

            res = requests.post(
                f"{PORTAL_API}/apply",
                json=payload,
                timeout=15
            ).json()

            applied_today += 1
            print("✅ Applied:", res)

        time.sleep(AGENT_INTERVAL)















