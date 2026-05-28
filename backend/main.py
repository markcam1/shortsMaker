from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import projects, prompts, images

app = FastAPI(title="Storyboard Maker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(prompts.router)
app.include_router(images.router)


@app.get("/health")
def health():
    return {"status": "ok"}
