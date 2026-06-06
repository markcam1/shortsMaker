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

```bash
./dev-start.sh   # start backend + frontend in the background
./dev-stop.sh    # stop both servers
```

Open [http://localhost:5173](http://localhost:5173).

<details>
<summary>Manual (two terminals)</summary>

```bash
# Terminal 1 — backend (auto-reloads on save)
uv run uvicorn backend.main:app --reload

# Terminal 2 — frontend (Vite HMR)
cd frontend && npm run dev
```
</details>

## Workflows

### Image Post
```
upload file → parse → review & inline-edit entries (auto-saves on blur)
           → FormInput (subject pre-filled) → user edits form
           → Claude generates prompt → review/edit → Gemini candidates
           → accept image → repeat for each scene
```

### Quote Post
```
upload file → parse → review & inline-edit entries (auto-saves on blur)
           → Review Entries: mark each card "Summarize" or "Choose Background"
           → Next Card →  process one card at a time through BackgroundChooser → pick card
             Continue All → pick settings once → auto-generate & accept all pending cards
           → pick background mode (per card or for all):
             · Simple  → overlay on color/gradient variants (no Gemini)
             · Complex → Claude generates background prompt → Gemini bg → overlay
           → accept card(s) → export zip
```

## Project management

The home page gives you two paths: **New Project** (upload a file and pick a format) or **My Library** (browse all past projects). From the library you can:

- Click any card to resume a project at its last step (tile and list views both support full-card click with a hover overlay indicator)
- **Rename** — inline edit from the library or from the editor header at any step
- **Duplicate** — deep copy with fresh IDs; all accepted images are preserved
- **Delete** — confirmation dialog requires you to type the project name

The uploaded filename is used as the default project name and can be changed at any time via the editable title in the top header.

Browser back/forward buttons work via URL hash routing (`#/project/{id}/{STEP}`).

## Project layout

```
backend/
  routers/          API endpoints (projects, images, quotes, prompts)
  services/         LLM providers, image generation, overlay rendering, parsing
  storage/          File-based JSON storage
  models/           Pydantic schemas
frontend/src/
  api/              Typed API client
  components/       UI screens — HomePage, LibraryPage, plus one per workflow step
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

**Workflow behaviour (`config.yaml`)** — `workflow.require_all_marked: true` (default) requires every pending card in Review Entries to have an action chosen before **Next Card** or **Continue All** become active. Set to `false` to make the buttons available immediately.

> **Note:** `WorkflowContext` persists to `localStorage` key `shortsmaker_workflow`. After changing `num_images`, output aspects, or template definitions, clear localStorage for `localhost:5173`.

## Overlay engine

The default overlay engine is HTML/CSS → PNG via Playwright (headless Chromium). A Pillow fallback is available; switch via `overlay.engine: pillow` in `config.yaml`.
