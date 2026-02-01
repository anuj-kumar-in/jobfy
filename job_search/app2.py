import streamlit as st
import threading
import requests
from agent_run import run_agent

st.set_page_config(page_title="Autonomous Job Agent", layout="wide")

st.title("🤖 Autonomous Job Application Agent")

# ---------------- USER INPUT ----------------
st.subheader("👤 Student Information")

student_name = st.text_input("Full Name")
preferred_role = st.text_input("Preferred Role")
resume_text = st.text_area("Paste Resume (facts only)", height=300)

# ---------------- AGENT CONTROL ----------------
if "agent_thread" not in st.session_state:
    st.session_state.agent_thread = None
    st.session_state.agent_running = False

if not st.session_state.agent_running:
    if st.button("🚀 Start Agent"):
        if not (student_name and preferred_role and resume_text):
            st.warning("Please fill all fields.")
        else:
            thread = threading.Thread(
                target=run_agent,
                args=(
                    student_name,
                    preferred_role,
                    resume_text,
                    st.secrets["TOGETHER_API_KEY"],
                ),
                daemon=True,
            )
            thread.start()

            st.session_state.agent_thread = thread
            st.session_state.agent_running = True
            st.success("Agent started successfully 🚀")
else:
    st.success("Agent is running autonomously 🤖")
    if st.button("⏹ Stop Agent"):
        st.warning("Restart app to stop agent (MVP limitation)")


BACKEND_URL = "https://krishnasimha-portal-backend.hf.space"

st.divider()
st.subheader("📨 Applications Submitted")

if st.button("🔄 Refresh Applications"):
    apps = requests.get(f"{BACKEND_URL}/applications").json()
    if apps:
        st.table(apps)
    else:
        st.info("No applications yet.")
