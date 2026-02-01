import json
import asyncio
import re
from together import Together


def safe_json_loads(text: str) -> dict:
    """
    Robust JSON loader for LLM output
    """
    if not text or not text.strip():
        raise ValueError("LLM returned empty response")

    # remove ```json ``` wrappers
    text = re.sub(r"```json|```", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # fallback: extract first JSON object
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        raise


class ArtifactAgent:
    def __init__(self, together_api_key: str):
        self.client = Together(api_key=together_api_key)

    # ---------- 1. FACT EXTRACTION ----------
    def _extract_student_profile(self, resume_text: str) -> dict:
        prompt = f"""
You are a STRICT information extraction system.

Rules:
- Extract ONLY information explicitly present
- Do NOT infer, guess, or invent
- If something is missing, use null
- Return VALID JSON ONLY

Schema:
{{
  "education": [
    {{"degree": null, "institution": null, "year": null}}
  ],
  "projects": [
    {{"name": null, "description": null, "tools": []}}
  ],
  "internships": [
    {{"company": null, "role": null, "description": null}}
  ],
  "skills": [],
  "links": []
}}

Resume:
{resume_text}
"""

        response = self.client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=700
        )

        content = response.choices[0].message.content
        return safe_json_loads(content)

    async def extract_student_profile_async(self, resume_text: str) -> dict:
        return await asyncio.to_thread(self._extract_student_profile, resume_text)

    # ---------- 2. BULLET BANK ----------
    def _generate_bullet_bank(self, student_profile: dict) -> list:
        prompt = f"""
You are converting structured facts into resume bullets.

Rules:
- Use ONLY provided data
- No invented metrics, impact, or tools
- Each bullet must reference its source
- Return JSON ONLY

Schema:
{{"bullets":[{{"source":"project or internship name","bullet":"grounded achievement statement"}}]}}

Student Profile:
{json.dumps(student_profile, indent=2)}
"""

        response = self.client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=700
        )

        content = response.choices[0].message.content
        data = safe_json_loads(content)
        if isinstance(data, list):
            return [{"bullet": b} for b in data]

    # Case 2: Proper dict response
        if isinstance(data, dict):
            bullets = data.get("bullets", [])
            return [{"bullet": b} for b in bullets]

    # Fallback
        return []

    async def generate_bullet_bank_async(self, student_profile: dict) -> list:
        return await asyncio.to_thread(self._generate_bullet_bank, student_profile)

    # ---------- 3. PROOF PACK ----------
    def _generate_proof_pack(self, student_profile: dict) -> list:
        proofs = []

        for link in student_profile.get("links", []):
            proofs.append(link)

        for project in student_profile.get("projects", []):
            desc = (project.get("description") or "").lower()
            if "github" in desc:
                proofs.append(project.get("description"))

        return proofs[:8]

    async def generate_proof_pack_async(self, student_profile: dict) -> list:
        return await asyncio.to_thread(self._generate_proof_pack, student_profile)

    # ---------- MASTER PIPELINE ----------
    async def run_async(self, resume_text: str) -> dict:
        profile = await self.extract_student_profile_async(resume_text)
        bullets = await self.generate_bullet_bank_async(profile)
        proofs = await self.generate_proof_pack_async(profile)

        return {
            "profile": profile,
            "bullet_bank": bullets,
            "proof_pack": proofs
        }

