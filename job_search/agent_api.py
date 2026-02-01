# agent_api.py - FastAPI wrapper for the job search agent
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests

# Import agent modules
import sys
sys.path.insert(0, os.path.dirname(__file__))
from agents.artifact_agent import ArtifactAgent
from agents.ranking_agent import rank_jobs
from agents.apply_policy import should_apply

# Configuration
PORTAL_API = os.getenv("PORTAL_API", "https://krishnasimha-portal-backend.hf.space")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "888fb84e1b638788f3b6e59865697fa5e52ade7a091e1a1777aa883eb92ddbba")

app = FastAPI(
    title="JobFy AI Agent API",
    description="AI-powered job ranking and application agent",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== MODELS ====================

class UserProfile(BaseModel):
    fullName: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    headline: Optional[str] = ""
    summary: Optional[str] = ""
    skills: List[str] = []
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""
    preferences: Optional[Dict[str, Any]] = {}


class RankJobsRequest(BaseModel):
    profile: UserProfile
    preferred_role: Optional[str] = ""


class ApplyJobsRequest(BaseModel):
    profile: UserProfile
    preferred_role: Optional[str] = ""
    job_ids: Optional[List[str]] = None  # If None, apply to all ranked jobs
    max_applications: int = 10


class ResumeParseRequest(BaseModel):
    resume_text: str


# ==================== HELPER FUNCTIONS ====================

def convert_frontend_profile_to_agent_profile(profile: UserProfile) -> dict:
    """Convert frontend profile format to agent's expected format"""
    return {
        "name": profile.fullName,
        "email": profile.email,
        "phone": profile.phone,
        "location": profile.location,
        "headline": profile.headline,
        "summary": profile.summary,
        "skills": profile.skills,
        "education": [
            {
                "degree": edu.get("degree", ""),
                "institution": edu.get("institution", ""),
                "year": edu.get("endDate", "")[:4] if edu.get("endDate") else None
            }
            for edu in profile.education
        ],
        "projects": [
            {
                "name": proj.get("name", ""),
                "description": proj.get("description", ""),
                "tools": proj.get("technologies", "").split(",") if proj.get("technologies") else []
            }
            for proj in profile.projects
        ],
        "internships": [
            {
                "company": exp.get("company", ""),
                "role": exp.get("title", ""),
                "description": exp.get("description", "")
            }
            for exp in profile.experience
        ],
        "links": [
            link for link in [profile.linkedin, profile.github, profile.portfolio] if link
        ],
        "preferred_role": profile.preferences.get("jobTypes", [""])[0] if profile.preferences.get("jobTypes") else ""
    }


def generate_match_explanation(job: dict, profile: dict, score: float) -> dict:
    """Generate detailed explanation for job-profile match"""
    student_skills = set(map(str.lower, profile.get("skills", [])))
    job_skills = set(map(str.lower, job.get("skills", [])))
    
    matching_skills = list(student_skills & job_skills)
    missing_skills = list(job_skills - student_skills)
    
    # Calculate sub-scores
    skill_overlap = len(matching_skills) / max(len(job_skills), 1) * 100
    
    role = profile.get("preferred_role", "").lower()
    job_title = job.get("job_title", job.get("title", "")).lower()
    role_match = role in job_title if role else False
    
    # Location match
    user_location = profile.get("location", "").lower()
    job_location = job.get("location", "").lower()
    location_match = any(loc in job_location for loc in user_location.split(",")) if user_location else True
    
    # Remote preference
    remote_pref = profile.get("preferences", {}).get("remotePreference", "any")
    job_remote = job.get("remote", False)
    remote_match = remote_pref == "any" or (remote_pref == "remote" and job_remote) or (remote_pref == "onsite" and not job_remote)
    
    return {
        "overall_score": round(score * 100, 1),
        "skill_overlap": round(skill_overlap, 1),
        "matching_skills": matching_skills[:5],
        "missing_skills": missing_skills[:3],
        "role_match": role_match,
        "location_match": location_match,
        "remote_match": remote_match,
        "recommendation": "Strong Match" if score >= 0.75 else "Good Match" if score >= 0.6 else "Potential Match" if score >= 0.4 else "Low Match",
        "reasoning": generate_reasoning(score, matching_skills, missing_skills, role_match, location_match)
    }


def generate_reasoning(score: float, matching_skills: list, missing_skills: list, role_match: bool, location_match: bool) -> str:
    """Generate human-readable reasoning for the match"""
    reasons = []
    
    if matching_skills:
        reasons.append(f"You have {len(matching_skills)} matching skills: {', '.join(matching_skills[:3])}")
    
    if role_match:
        reasons.append("The role aligns with your preferred job type")
    
    if location_match:
        reasons.append("Location is compatible with your preferences")
    
    if missing_skills and len(missing_skills) <= 2:
        reasons.append(f"Minor skill gaps: {', '.join(missing_skills)}")
    elif missing_skills:
        reasons.append(f"Consider developing: {', '.join(missing_skills[:2])}")
    
    if not reasons:
        if score >= 0.5:
            reasons.append("Good general fit based on your profile")
        else:
            reasons.append("Limited match with your current skills")
    
    return "; ".join(reasons)


# ==================== ENDPOINTS ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "JobFy AI Agent"}


@app.get("/jobs")
async def get_jobs():
    """Fetch all available jobs from portal"""
    try:
        response = requests.get(f"{PORTAL_API}/jobs", timeout=10)
        jobs = response.json()
        
        # Normalize job format
        normalized_jobs = []
        for job in jobs:
            normalized_jobs.append({
                "id": job.get("job_id", job.get("id")),
                "job_id": job.get("job_id", job.get("id")),
                "title": job.get("job_title", job.get("title", "")),
                "company": job.get("company_name", job.get("company", "")),
                "location": job.get("location", ""),
                "skills": job.get("skills", []),
                "type": job.get("type", "Full-time"),
                "remote": job.get("remote", job.get("location", "").lower() == "remote"),
                "salary": job.get("salary", "Competitive"),
                "description": job.get("description", ""),
                "requirements": job.get("requirements", []),
                "posted": job.get("posted", "Recently"),
                "deadline": job.get("deadline", ""),
                "source": "agent"
            })
        
        return normalized_jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {str(e)}")


@app.post("/rank")
async def rank_jobs_endpoint(request: RankJobsRequest):
    """
    Rank jobs based on user profile and return prioritized queue with explanations.
    This is the main AI Pickup endpoint.
    """
    try:
        # Convert frontend profile to agent format
        agent_profile = convert_frontend_profile_to_agent_profile(request.profile)
        
        if request.preferred_role:
            agent_profile["preferred_role"] = request.preferred_role
        
        # Fetch jobs from portal
        jobs_response = requests.get(f"{PORTAL_API}/jobs", timeout=10)
        jobs = jobs_response.json()
        
        if not jobs:
            return {
                "ranked_jobs": [],
                "total_jobs": 0,
                "message": "No jobs available"
            }
        
        # Use the ranking agent to rank jobs
        ranked = rank_jobs(jobs, agent_profile)
        
        # Build response with explanations
        ranked_with_explanations = []
        for item in ranked:
            job = item["job"]
            score = item["score"]
            
            # Normalize job format
            normalized_job = {
                "id": job.get("job_id", job.get("id")),
                "job_id": job.get("job_id", job.get("id")),
                "title": job.get("job_title", job.get("title", "")),
                "company": job.get("company_name", job.get("company", "")),
                "location": job.get("location", ""),
                "skills": job.get("skills", []),
                "type": job.get("type", "Full-time"),
                "remote": job.get("remote", job.get("location", "").lower() == "remote"),
                "salary": job.get("salary", "Competitive"),
                "description": job.get("description", ""),
                "source": "agent"
            }
            
            # Generate match explanation
            explanation = generate_match_explanation(job, agent_profile, score)
            
            ranked_with_explanations.append({
                "job": normalized_job,
                "score": score,
                "match_percentage": round(score * 100, 1),
                "should_apply": should_apply(score, 0),
                "explanation": explanation
            })
        
        return {
            "ranked_jobs": ranked_with_explanations,
            "total_jobs": len(ranked_with_explanations),
            "profile_summary": {
                "name": agent_profile.get("name"),
                "skills_count": len(agent_profile.get("skills", [])),
                "preferred_role": agent_profile.get("preferred_role", "Not specified")
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")


@app.post("/apply-queue")
async def apply_to_queue(request: ApplyJobsRequest):
    """
    Apply to ranked jobs automatically.
    Returns list of applied jobs with status.
    """
    try:
        agent_profile = convert_frontend_profile_to_agent_profile(request.profile)
        
        if request.preferred_role:
            agent_profile["preferred_role"] = request.preferred_role
        
        # Fetch and rank jobs
        jobs_response = requests.get(f"{PORTAL_API}/jobs", timeout=10)
        jobs = jobs_response.json()
        
        ranked = rank_jobs(jobs, agent_profile)
        
        # Prepare bullets and proofs from profile
        bullets = []
        for exp in request.profile.experience:
            if exp.get("description"):
                bullets.append(exp["description"])
            bullets.append(f"{exp.get('title', '')} at {exp.get('company', '')}")
        
        for proj in request.profile.projects:
            if proj.get("name") and proj.get("description"):
                bullets.append(f"{proj['name']}: {proj['description']}")
        
        if request.profile.skills:
            bullets.append(f"Proficient in: {', '.join(request.profile.skills)}")
        
        proofs = {
            "links": [
                link for link in [
                    request.profile.linkedin,
                    request.profile.github,
                    request.profile.portfolio
                ] if link
            ]
        }
        
        # Apply to jobs
        applied_jobs = []
        skipped_jobs = []
        
        for item in ranked:
            if len(applied_jobs) >= request.max_applications:
                break
            
            job = item["job"]
            score = item["score"]
            
            # Filter by job_ids if specified
            job_id = job.get("job_id", job.get("id"))
            if request.job_ids and job_id not in request.job_ids:
                continue
            
            if not should_apply(score, len(applied_jobs)):
                skipped_jobs.append({
                    "job_id": job_id,
                    "title": job.get("job_title", job.get("title", "")),
                    "company": job.get("company_name", job.get("company", "")),
                    "score": score,
                    "reason": f"Score too low ({round(score * 100)}%)"
                })
                continue
            
            # Submit application
            payload = {
                "job_id": job_id,
                "student_name": request.profile.fullName,
                "resume": agent_profile,
                "bullets": bullets,
                "proofs": proofs
            }
            
            try:
                res = requests.post(f"{PORTAL_API}/apply", json=payload, timeout=15)
                result = res.json()
                
                explanation = generate_match_explanation(job, agent_profile, score)
                
                applied_jobs.append({
                    "job_id": job_id,
                    "title": job.get("job_title", job.get("title", "")),
                    "company": job.get("company_name", job.get("company", "")),
                    "location": job.get("location", ""),
                    "score": score,
                    "match_percentage": round(score * 100, 1),
                    "status": result.get("status", "submitted"),
                    "application_id": result.get("application_id"),
                    "applied_at": result.get("timestamp"),
                    "explanation": explanation
                })
            except Exception as e:
                skipped_jobs.append({
                    "job_id": job_id,
                    "title": job.get("job_title", job.get("title", "")),
                    "reason": f"Application failed: {str(e)}"
                })
        
        return {
            "success": True,
            "applied_jobs": applied_jobs,
            "skipped_jobs": skipped_jobs,
            "total_applied": len(applied_jobs),
            "total_skipped": len(skipped_jobs)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apply queue failed: {str(e)}")


@app.post("/parse-resume")
async def parse_resume(request: ResumeParseRequest):
    """
    Parse resume text using AI and extract structured profile data.
    Uses Together AI via ArtifactAgent.
    """
    try:
        if not request.resume_text.strip():
            raise HTTPException(status_code=400, detail="Resume text is empty")
        
        agent = ArtifactAgent(TOGETHER_API_KEY)
        artifacts = await agent.run_async(request.resume_text)
        
        profile = artifacts.get("profile", {})
        
        # Convert to frontend format
        frontend_profile = {
            "fullName": profile.get("name", ""),
            "skills": profile.get("skills", []),
            "education": [
                {
                    "id": i,
                    "institution": edu.get("institution", ""),
                    "degree": edu.get("degree", ""),
                    "field": "",
                    "startDate": "",
                    "endDate": str(edu.get("year", "")) if edu.get("year") else "",
                    "gpa": ""
                }
                for i, edu in enumerate(profile.get("education", []))
            ],
            "experience": [
                {
                    "id": i,
                    "company": intern.get("company", ""),
                    "title": intern.get("role", ""),
                    "location": "",
                    "startDate": "",
                    "endDate": "",
                    "current": False,
                    "description": intern.get("description", "")
                }
                for i, intern in enumerate(profile.get("internships", []))
            ],
            "projects": [
                {
                    "id": i,
                    "name": proj.get("name", ""),
                    "description": proj.get("description", ""),
                    "technologies": ", ".join(proj.get("tools", [])) if proj.get("tools") else "",
                    "link": ""
                }
                for i, proj in enumerate(profile.get("projects", []))
            ],
            "linkedin": "",
            "github": "",
            "portfolio": ""
        }
        
        # Extract links
        for link in profile.get("links", []):
            link_lower = link.lower() if link else ""
            if "linkedin" in link_lower:
                frontend_profile["linkedin"] = link
            elif "github" in link_lower:
                frontend_profile["github"] = link
            else:
                frontend_profile["portfolio"] = link
        
        return {
            "success": True,
            "extracted_profile": frontend_profile,
            "bullet_bank": artifacts.get("bullet_bank", []),
            "proof_pack": artifacts.get("proof_pack", [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


@app.get("/applications")
async def get_applications():
    """Get all applications from the portal"""
    try:
        response = requests.get(f"{PORTAL_API}/applications", timeout=10)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
