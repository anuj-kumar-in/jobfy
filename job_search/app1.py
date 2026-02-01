import time
import requests
import asyncio
from agents.artifact_agent import ArtifactAgent
from agents.ranking_agent import rank_jobs
from agents.apply_policy import should_apply

PORTAL_API = "https://krishnasimha-portal-backend.hf.space"  # your FastAPI backend
AGENT_INTERVAL = 30


def run_agent(
    student_name: str,
    preferred_role: str,
    resume_text: str,
    together_api_key: str,
):
    """
    Autonomous agent loop
    """

    print(f"🤖 Agent started for {student_name}")

    # ---------------- Artifact Generation ----------------
    key = together_api_key or os.getenv("TOGETHER_API_KEY")
    if not key:
        raise RuntimeError("TOGETHER_API_KEY is not provided via parameter or environment")

    artifact_agent = ArtifactAgent(key)
    artifacts = asyncio.run(artifact_agent.run_async(resume_text))

    student_profile = artifacts["profile"]
    student_profile["preferred_role"] = preferred_role

    bullets = artifacts["bullet_bank"]
    proofs = artifacts["proof_pack"]

    applied_today = 0

    # ---------------- Main Loop ----------------
    while True:
        try:
            jobs = requests.get(f"{PORTAL_API}/jobs", timeout=10).json()
            ranked_jobs = rank_jobs(jobs, student_profile)

            for item in ranked_jobs:
                job = item["job"]
                score = item["score"]

                if not should_apply(score, applied_today):
                    continue

                payload = {
                    "job_id": job["job_id"],
                    "student_name": student_name,
                    "resume": student_profile,           # dict ✔
                    "bullets": [b["bullet"] for b in bullets],  # list[str] ✔
                    "proofs": proofs,                    # list ✔
                }

                res = requests.post(
                    f"{PORTAL_API}/apply",
                    json=payload,
                    timeout=15,
                ).json()

                print("✅ Applied:", res)

                applied_today += 1

        except Exception as e:
            print("⚠️ Agent error:", e)

        time.sleep(AGENT_INTERVAL)
