# shortsMaker

An AI-powered local web app for turning structured content files into social media posts. Fork of [storyboard_maker](https://github.com/markcam1/storyboard_maker).

**Choose a format:**
- **Image Post** — each item from your content file pre-fills a form → Claude generates a text-to-image prompt → Gemini creates candidate images → pick one → build your storyboard.
- **Quote Post** — each item is LLM-summarized to fit a card → rendered as real text over a **Simple** (solid/gradient, no image model) or **Complex** (AI-generated Gemini background + text overlay) background.

## Setup

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY and GOOGLE_API_KEY
uv sync                     # install Python dependencies
uv run playwright install chromium   # install Chromium for the overlay renderer
cd frontend && npm install
```

[Install uv](https://docs.astral.sh/uv/getting-started/installation/) if you don't have it. `OLLAMA_BASE_URL` is optional — Ollama degrades gracefully if unreachable. `FRONTEND_PORT` defaults to `5173`.

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

## Workflows

### Image Post
```
upload file → parse → FormInput (subject pre-filled) → user edits form
           → Claude generates prompt → review/edit → Gemini candidates
           → accept image → repeat for each scene
```

### Quote Post
```
upload file → parse → LLM summarize → review summary
           → pick background mode:
             · Simple  → overlay on color/gradient variants (no Gemini)
             · Complex → Claude generates background prompt → Gemini bg → overlay
           → accept card → export zip
```

## Project layout

```
backend/
  routers/          API endpoints (projects, images, quotes, prompts)
  services/         LLM providers, image generation, overlay rendering, parsing
  storage/          File-based JSON storage
  models/           Pydantic schemas
frontend/src/
  api/              Typed API client
  components/       UI screens (one per workflow step)
  context/          WorkflowContext state machine
config.yaml         LLM routing + image model registry
choice.yaml         Style / template / color scheme options
data/               Runtime storage (gitignored)
```

## Configuration

**LLM routing (`config.yaml`)** — set `llm.global` to `anthropic`, `gemini`, or `ollama`. Override per-task under `llm.tasks`. Supports `provider`, `provider:model`, or `global` values.

**Image models (`config.yaml`)** — `image_models` list drives the model dropdown and `image_service`. Adjust `num_images` here; no code changes needed.

**Quote templates (`choice.yaml`)** — `templates → color_schemes → font_pairings` cascade. Each template carries `max_chars` passed to the summarizer so text fits the layout. Adding templates/schemes/fonts is a YAML-only edit.

**Style choices (`choice.yaml`)** — `styles → lighting_moods → color_palettes` cascade for Image Posts and Complex quote backgrounds.

> **Note:** `WorkflowContext` persists to `localStorage` key `shortsmaker_workflow`. After changing `num_images`, output aspects, or template definitions, clear localStorage for `localhost:5173`.

## Overlay engine

The default overlay engine is HTML/CSS → PNG via Playwright (headless Chromium). A Pillow fallback is available; switch via `overlay.engine: pillow` in `config.yaml`.
