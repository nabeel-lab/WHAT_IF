from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Ensure root directory is in path for modules
sys.path.append(os.getcwd())

load_dotenv()

from services.api.routes import projects, scans, findings, analysis, whatif, reports, providers

app = FastAPI(title="ECDAT API", description="Cryptographic Migration Decision System API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(scans.router)
app.include_router(findings.router)
app.include_router(analysis.router)
app.include_router(whatif.router)
app.include_router(reports.router)
app.include_router(providers.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
