from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from .database import init_db
from .routes import jobs, clips


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("media", exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="ClipFast API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(jobs.router, prefix="/api")
app.include_router(clips.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ClipFast API"}
