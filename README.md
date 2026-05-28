# Storyboard Maker

An AI-powered local web app for building visual storyboards scene by scene.

**Workflow:** fill a form → Claude generates a text-to-image prompt → you review/edit it → Gemini creates candidate images → pick the best one → repeat to build your storyboard.

## Setup

```bash
cp .env.example .env   # fill in ANTHROPIC_API_KEY and GOOGLE_API_KEY
uv sync                # install Python dependencies
cd frontend && npm install
```

[Install uv](https://docs.astral.sh/uv/getting-started/installation/) if you don't have it.

## Running

Open two terminals from the project root:

**Terminal 1 — backend:**
```bash
uv run uvicorn backend.main:app --reload
```

**Terminal 2 — frontend:**
```bash
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project layout

```
backend/         FastAPI app (Python)
  routers/       API endpoints
  services/      Claude + Gemini API wrappers
  storage/       File-based JSON storage (Phase 1)
  models/        Pydantic schemas
frontend/        React + TypeScript + Tailwind
  src/
    api/         API client + TypeScript types
    components/  UI screens
    context/     Workflow state machine
config.yaml      Model registry
choice.yaml      Style / lighting / color palette options for the form
data/            Runtime storage (gitignored)
```

## Configuration

**`config.yaml`** — change the LLM model, add image models, adjust `num_images` (candidates generated per scene), or switch to SQLite storage (Phase 2).

**`choice.yaml`** — edit the Style, Lighting/Mood, and Color Palette dropdown options shown in the form. The three levels (`styles → lighting_moods → color_palettes`) cascade in the UI: picking a style filters the mood options, picking a mood filters the palette options. Free-text entry is always available via the "Custom…" option.

> **Note:** if you change `num_images`, clear your browser's `localStorage` for `localhost:5173` so the frontend fetches fresh results instead of showing cached candidates.
