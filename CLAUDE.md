# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`shortsMaker` is a fork of [`storyboard_maker`](https://github.com/markcam1/storyboard_maker). Read `shortsMaker_spec.md` for the design rationale; this file is operational guidance for working in the codebase.

## Setup

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
uv sync

# Install Chromium for the Playwright-based overlay renderer
uv run playwright install chromium

# Install frontend dependencies
cd frontend && npm install
```

Copy `.env.example` to `.env` and fill in `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY` before running. `OLLAMA_BASE_URL` is optional — the Ollama provider degrades gracefully if unreachable. `FRONTEND_PORT` defaults to `5173`; set it if that port conflicts with another app.

## Running the app

Two processes must run simultaneously. Start from the project root (`shortsMaker/`):

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

# Verify imports + config loading (LLM router, image models, style/template choices)
ANTHROPIC_API_KEY=test GOOGLE_API_KEY=test uv run python -c \
  "from backend.config import LLM_CONFIG, IMAGE_MODELS, STYLE_CHOICES, TEMPLATE_CHOICES, resolve_llm; \
   print(resolve_llm('summarize'), resolve_llm('prompt_creation'))"
```

## Frontend commands

```bash
cd frontend
npm run build          # tsc + vite build (catches type errors)
npx tsc --noEmit       # type-check only
npm run lint           # eslint
```

## Architecture

### The big idea

A project picks a **format**: `image` (storyboard_maker behavior, seeded from a parsed file) or `quote` (text card). Quote posts pick a **background mode**: `simple` (solid/gradient, no image model) or `complex` (Gemini-generated background + text overlay). Image generation is Gemini-only; LLM text tasks (summarize, prompt creation) route through a provider abstraction supporting Anthropic, Gemini, and local Ollama, configurable globally and per task.

### Data flow

**Image Post** (reuses storyboard_maker core unchanged):
```
upload file → POST /api/projects (format=image)         → Project + draft Scenes (FormInput.subject pre-filled)
            → user edits FormInput
            → POST /api/projects/{id}/prompt (Claude)   → editable prompt
            → POST /api/projects/{id}/images (Gemini)   → candidate PNGs
            → POST /api/projects/{id}/scenes            → scene accepted
```

**Quote Post**:
```
upload file → POST /api/projects (format=quote)              → Project + draft QuotePosts (term, raw_body)
            → POST /api/projects/{id}/quotes/{qid}/summarize (LLM via task router) → editable summary
            → user picks background mode
              · simple   → POST .../quotes/{qid}/candidates  → overlay on color-scheme variants (no Gemini)
              · complex  → POST .../quotes/{qid}/prompt      → editable text-to-image prompt
                        → POST .../quotes/{qid}/candidates  → Gemini bg + text overlay → composited candidates
            → POST .../quotes/{qid}/accept                   → final card
            → GET  /api/projects/{id}/export                 → zip of all accepted cards
```

### Backend (`backend/`)

- `config.py` — reads `.env` + `config.yaml` + `choice.yaml` at import time. Exposes `LLM_CONFIG`, `IMAGE_MODELS`, `STYLE_CHOICES`, `TEMPLATE_CHOICES`, `OUTPUT_ASPECTS`, `OVERLAY_ENGINE`, `DATA_ROOT`, API keys, and a `resolve_llm(task) -> (provider, model)` helper that implements the `global` / `<provider>` / `<provider>:<model>` resolution rules. **The `llm` block in `config.yaml` is the source of truth for LLM routing — never hardcode a provider in service code.**
- `models/schemas.py` — single source of truth for Pydantic models. `Project` carries `format`, `aspect`, `source_filename`, plus `scene_ids` and `quote_ids`. `Scene` and `FormInput` are unchanged from storyboard_maker (Image Posts reuse them verbatim). `QuotePost` parallels `Scene` with `term`, `raw_body`, `summary`, `background_mode`, `background_desc`, optional prompt fields, and template selections.
- `storage/file_storage.py` — `StorageService` Protocol + `FileStorage` impl. Adds a `quotes/{uuid}/` sibling to `scenes/{uuid}/`. `mkdir -p` on access; `candidates/*.png` cleared on each regeneration. For Complex quotes, `background.png` is persisted separately from `image.png` so wording edits re-overlay without re-spending on Gemini. To add a database backend, implement the Protocol and swap the singleton in `storage/__init__.py`.
- `services/parse_service.py` — `ContentSource` Protocol (`UploadSource` v1 primary; `ConfiguredFileSource` for batch/CI; future `DiscoveryEngineSource`). `Parser` Protocol with `QuotePostParser` (matches `**Term:** body` glossary format) and `ImagePostParser` (file → items → `FormInput.subject`). **Parsing never calls an LLM**; summarization is a separate step in the Quote pipeline.
- `services/providers/` — `LLMProvider` Protocol + three impls: `AnthropicProvider` (uses the existing `anthropic` client), `GeminiProvider` (text mode via the already-present `google-genai` client; no new dep), `OllamaProvider` (`httpx` POST to `{base_url}/api/chat`; no SDK, no key; surfaces a clear error if unreachable). All implement `complete(*, system, user, max_tokens) -> str`.
- `services/llm_service.py` — task-oriented wrapper. `get_provider(task)` calls `resolve_llm` and returns the provider. Public functions: `summarize(term, body, max_chars) -> str` and `generate_prompt(form_or_desc) -> (sent, generated)`. **Never instantiate a provider client directly elsewhere.**
- `services/image_service.py` — unchanged dispatch on each image model's `api` field (`generate_content` vs `generate_images`). Now also serves Complex quote backgrounds (text-free prompt, open negative space). Reads the project's `aspect` and passes it to the Gemini/Imagen call so backgrounds aren't cropped. **Ollama is never used here** — image gen is Gemini/Imagen only.
- `services/overlay_service.py` — `OverlayService` Protocol. Primary impl `HtmlOverlay` (Playwright/Chromium): renders an HTML template with injected `term`/`body`, applies safe-area + fonts + colors from the chosen template, auto-shrinks font to fit, screenshots at the aspect's pixel size. Background is either a Gemini PNG (Complex) or a `ColorSpec` solid/gradient (Simple). Fallback impl `PillowOverlay` (scrim + wrapped text). Engine chosen via `config.yaml` (`overlay.engine`).
- `routers/projects.py` — config endpoints (`/api/config/models`, `/api/config/styles`, `/api/config/templates`, optional `/api/config/llm` for resolved task→provider display) + project CRUD. `POST /api/projects` accepts `format`, `aspect`, and the source upload.
- `routers/prompts.py` — `POST /api/projects/{id}/prompt`. **Unchanged from storyboard_maker.** Used by Image Posts and Complex quote backgrounds; both route through `llm_service.generate_prompt` and therefore through the task router.
- `routers/images.py` — image-post pipeline. **Unchanged from storyboard_maker** except for an added `POST /api/projects/{id}/scenes/parse` that creates draft Scenes with `form_input.subject` pre-filled from the `ImagePostParser`.
- `routers/quotes.py` — quote-post pipeline: `POST .../quotes/parse`, `POST .../quotes/{qid}/summarize`, `POST .../quotes/{qid}/prompt` (Complex only), `POST .../quotes/{qid}/candidates`, `GET .../quotes/{qid}/candidates/{n}`, `POST .../quotes/{qid}/accept`, `GET .../quotes/{qid}/image`, `GET /api/projects/{id}/export` (zip).

### Frontend (`frontend/src/`)

- `context/WorkflowContext.tsx` — central state machine, persisted to `localStorage` under key **`shortsmaker_workflow`** (do not reuse the old `storyboard_workflow` key). State carries `format`, `aspect`, plus quote-specific fields (`quoteId`, `summary`, `backgroundMode`, `backgroundDesc`) alongside the existing image-post fields. `step` drives which component renders.
- `api/client.ts` + `api/types.ts` — typed wrappers over `fetch`; all backend calls go through `api.*` functions.
- Components map 1:1 to workflow steps:
  - `SourcePicker` (SOURCE), `FormatChooser` (FORMAT), `EntryList` (ENTRY_REVIEW) — both branches.
  - `ImageCreationForm` (FORM), `PromptReview` (PROMPT_REVIEW), `ImageGallery` (IMAGE_REVIEW), `StoryboardView` (STORYBOARD) — **image branch, unchanged from storyboard_maker**; the only difference is `subject` arrives pre-filled.
  - `SummaryReview` (SUMMARY_REVIEW), `BackgroundChooser` (BACKGROUND_CHOICE), `CardGallery` (CARD_REVIEW), `CollectionView` (COLLECTION) — quote branch.
- `App.tsx` renders the sidebar (scene/quote thumbnails grouped by format) and routes between components based on `state.step` and `state.project.format`.

### Config-driven LLM routing (`config.yaml`)

```yaml
llm:
  global: anthropic              # dev default; Claude handles all LLM tasks
  providers:
    anthropic: { model: claude-sonnet-4-6 }
    gemini:    { model: gemini-2.5-flash }
    ollama:    { model: llama2, base_url: http://localhost:11434 }
  tasks:
    summarize:       global      # resolves to anthropic
    prompt_creation: global
    # Override examples (uncomment to enable):
    # summarize: gemini
    # prompt_creation: ollama:llama2
```

Resolution (`backend/config.py::resolve_llm`): `global` → `llm.global` + that provider's default model; bare provider name → that provider + its default; `provider:model` → both overridden. Add new providers by adding an entry under `providers:` and an impl in `services/providers/`. **Routing is text-only — image models are governed by the separate `image_models` registry below.**

### Config-driven image models (`config.yaml`)

Unchanged from storyboard_maker. `image_models` is a list of `{id, name, provider, model, api, num_images}`. The list populates the frontend's image-model dropdown (Image Posts + Complex quote backgrounds) and drives `image_service.generate_images`. Add models or change candidate counts there — no code changes needed.

### Quote-post templates (`choice.yaml`)

In addition to the existing `styles → lighting_moods → color_palettes` tree (still used by Image Posts and Complex quote backgrounds), `choice.yaml` defines a parallel cascade for quote cards:

```
templates[]                 # layout: safe-area %, alignment, font sizes, max_chars
  └─ color_schemes[]        # text + background (solid/gradient) colors — drives Simple bg
       └─ font_pairings[]   # heading/body font ids → files under assets/fonts/
```

`config.py` loads it at startup and exposes `TEMPLATE_CHOICES`. `GET /api/config/templates` serves the full nested structure (frontend loads once and filters client-side, same pattern as styles). Each `template` carries `max_chars`, which is passed to the summarizer as its budget so generated text fits the layout. For 9:16, keep text inside the middle ~70% of the canvas (top/bottom ~13% are covered by the Story/Reel UI). Adding templates/schemes/fonts is a `choice.yaml`-only edit.

### Storage layout on disk

```
data/projects/{uuid}/
  project.json              # name, format, aspect, source_filename, scene_ids, quote_ids
  scenes/{uuid}/            # image posts — unchanged from storyboard_maker
    scene.json
    image.png               # final accepted image
    candidates/{n}.png      # cleared on each regeneration
  quotes/{uuid}/            # quote posts
    quote.json              # term, raw_body, summary, background_mode, template…
    image.png               # final composited card
    background.png          # complex only: chosen raw Gemini bg (kept so text edits
                            #   re-run only the overlay, not Gemini)
    candidates/{n}.png      # composited candidate cards
```

`FileStorage` methods (`project_dir`, `scene_dir`, `quote_dir`, `candidates_dir`) `mkdir -p` on access; callers never pre-create directories.

## Gotchas

- **`WorkflowContext` persists state (including `candidateUrls` and `aspect`) to `localStorage`.** Changing `output.aspects`, `image_models[*].num_images`, or template definitions won't reflect in the UI until the cache is cleared for `localhost:5173`. The storage key is `shortsmaker_workflow` — bump it when you ship breaking changes to `WorkflowState`.
- **Playwright requires Chromium.** `uv run playwright install chromium` must be run after `uv sync` on a fresh checkout, or `overlay_service` will fail on first render. The Pillow fallback works without it; switch via `overlay.engine: pillow`.
- **Ollama is optional.** `OllamaProvider` surfaces a clear "Ollama unreachable at {base_url}" error instead of crashing the request. Only a task explicitly pointed at Ollama (via `tasks.<name>: ollama` or `ollama:<model>`) will attempt a call; the dev default config never touches it.
- **Image generation is Gemini/Imagen only.** The LLM task router (Anthropic/Gemini/Ollama) governs text tasks only. Do not extend `image_service` to accept Ollama or other text-LLM providers — image models live in their own registry.
- **`FormInput.subject` is the parser handoff for Image Posts.** Other form fields (`action`, `background`, `style`, …) are user-edited as today; the parser only seeds `subject`. Do not silently overwrite user edits to other fields when re-parsing.
