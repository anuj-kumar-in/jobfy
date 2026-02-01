# main.py
import os
from fastapi import FastAPI
from pydantic import BaseModel
from agent_runner import run_agent_once

app = FastAPI()

class SearchRequest(BaseModel):
    student_name: str
    preferred_role: str
    resume_text: str

@app.post("/search-with-ai")
def search_with_ai(req: SearchRequest):
    return run_agent_once(
        student_name=req.student_name,
        preferred_role=req.preferred_role,
        resume_text=req.resume_text,
        together_api_key=os.environ["TOGETHER_API_KEY"]
    )
