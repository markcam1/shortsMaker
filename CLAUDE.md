# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
uv sync

# Install frontend dependencies
cd frontend && npm install
```

Copy `.env.example` to `.env` and fill in both keys before running.

## Running the app

Two processes must run simultaneously. Start from the project root (`storyboard_maker/`):

```bash
# Terminal 1 — backend (auto-reloads on save)
uv run uvicorn backend.main:app --reload

# Terminal 2 — frontend (Vite HMR)
cd frontend && npm run dev
```

Frontend: http://localhost:5173 — proxies `/api/*` to http://localhost:8000.

## Backend commands

```bash
# Add a new dependency
uv add <package>

# Verify imports + config loading
ANTHROPIC_API_KEY=test GOOGLE_API_KEY=test uv run python -c "from backend.config import LLM_MODEL, IMAGE_MODELS, STYLE_CHOICES"
```

## Frontend commands

```bash
cd frontend
npm run build          # tsc + vite build (catches type errors)
npx tsc --noEmit       # type-check only
npm run lint           # eslint
```

## Architecture

### Data flow

User form → `POST /api/projects/{id}/prompt` (Claude) → editable prompt → `POST /api/projects/{id}/images` (Gemini) → candidate PNGs → `POST /api/projects/{id}/scenes` (accept one) → scene added to storyboard.

### Backend (`backend/`)

- `config.py` — reads `.env` + `config.yaml` + `choice.yaml` at import time; exposes `LLM_MODEL`, `IMAGE_MODELS`, `STYLE_CHOICES`, `DATA_ROOT`, and both API keys as module-level constants.
- `models/schemas.py` — single source of truth for all Pydantic models: `Project`, `Scene`, `FormInput`, and all request/response shapes.
- `storage/file_storage.py` — `StorageService` Protocol + `FileStorage` implementation. `FileStorage` lays out data under `data/projects/{project_id}/scenes/{scene_id}/` with `project.json`, `scene.json`, `image.png`, and `candidates/{n}.png`. To add a database backend (Phase 2), implement the `StorageService` Protocol and swap the singleton in `storage/__init__.py`.
- `services/llm_service.py` — wraps Anthropic SDK; `generate_prompt(form)` returns `(llm_prompt_sent, generated_prompt)`.
- `services/image_service.py` — wraps `google-genai` SDK; `generate_images(prompt, model_id, candidates_dir)` writes numbered PNGs and returns their paths. Dispatches to one of two internal helpers based on the `api` field in `config.yaml`: `_via_generate_content` (Gemini Flash — loops `num_images` times, one API call each) or `_via_generate_images` (Imagen — single batched call with `number_of_images`).
- `routers/images.py` — most complex router: handles draft scene creation, regeneration (reuses `scene_id`), candidate image serving, and final acceptance (copies candidate → `image.png`).

### Frontend (`frontend/src/`)

- `context/WorkflowContext.tsx` — central state machine. All workflow state (`step`, `formInput`, `generatedPrompt`, `editedPrompt`, `sceneId`, `candidateUrls`, `scenes`) lives here and is persisted to `localStorage`. The `step` field drives which component renders.
- `api/client.ts` + `api/types.ts` — typed wrappers over `fetch`; all backend calls go through `api.*` functions.
- Components map 1:1 to workflow steps: `ImageCreationForm` (FORM), `PromptReview` (PROMPT_REVIEW), `ImageGallery` (IMAGE_REVIEW), `StoryboardView` (STORYBOARD). The `IMAGE_GENERATION` step shows only a spinner in `App.tsx` while an async call completes.
- `App.tsx` renders the sidebar (scene thumbnails) and routes between components based on `state.step`.

### Config-driven image models

`config.yaml` is the registry for image models. The `image_models` list populates the UI dropdown and drives which model, API path, and `num_images` (candidate count per scene) are used. Add new models or change candidate counts there — no code changes needed.

> **Gotcha:** `WorkflowContext` persists `candidateUrls` to `localStorage`. If you change `num_images`, the browser will still show the old cached candidates until `localStorage` is cleared for `localhost:5173`.

### Cascading style selects

`choice.yaml` defines a 3-level hierarchy used by the form's Style, Lighting/Mood, and Color Palette fields:

```
styles[]
  └─ lighting_moods[]
       └─ color_palettes[]
```

`config.py` loads it at startup and exposes `STYLE_CHOICES`. The endpoint `GET /api/config/styles` (in `routers/projects.py`) serves the full nested structure. The frontend loads it once on form mount via `api.styles.list()` and filters client-side as the user makes selections. Each field also accepts a "Custom…" free-text entry. Stored values are the human-readable `label` strings (not `id`s) so they read naturally in LLM prompts. To add or rearrange styles/moods/palettes, edit `choice.yaml` only — no code changes needed.

### Storage layout on disk

```
data/projects/{uuid}/
  project.json
  scenes/{uuid}/
    scene.json
    image.png          # final accepted image
    candidates/
      0.png, 1.png…    # cleared on each regeneration
```

`FileStorage` methods (`project_dir`, `scene_dir`, `candidates_dir`) always `mkdir -p` on access, so callers never need to pre-create directories.
