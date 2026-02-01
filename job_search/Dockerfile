# ---------- Base image ----------
FROM python:3.10-slim

# ---------- System deps ----------
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- Workdir ----------
WORKDIR /app

# ---------- Install deps ----------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Copy code ----------
COPY . .

# ---------- Expose ----------
EXPOSE 7860

# ---------- Run ----------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
