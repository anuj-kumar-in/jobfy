# utils/storage.py
from datetime import date

def init_storage(session_state):
    if "applied_jobs" not in session_state:
        session_state.applied_jobs = []

    if "last_apply_date" not in session_state:
        session_state.last_apply_date = date.today()

def reset_daily_count(session_state):
    if session_state.last_apply_date != date.today():
        session_state.applied_jobs = []
        session_state.last_apply_date = date.today()
