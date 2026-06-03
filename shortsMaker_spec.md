# shortsMaker — Build Spec

Abstract Financial graph, dark blue, minimalist

A fork of [`storyboard_maker`](https://github.com/markcam1/storyboard_maker) that turns a structured content file (e.g. a glossary) into social posts. The user first picks a **format**:

- **Image Post** — the existing storyboard_maker behavior, now seeded from a parsed file: each item pre-fills `FormInput.subject`, the user edits the rest, then the unchanged Claude→Gemini→accept flow runs.
- **Quote Post** — a text card. The definition is LLM-**summarized** to fit, then rendered as real (programmatic) text over a background that is either **Simple** (solid/gradient, no image model) or **Complex** (AI-generated via the existing Gemini pipeline).

This supersedes the earlier `post_maker` draft and is written as a diff against the **actual repo** (verified against `backend/`, `frontend/src/`, `config.yaml`, `choice.yaml`). Sections are tagged **KEEP / CHANGE / NEW**.

This structure comes straight from the `shortsMaker` flowchart:

```
Start → set content file → start servers → raw file → [choose format]
                                                         ├─ Image Post → parser (no LLM) → FormInput.subject → user form → storyboard flow
                                                         └─ Quote Post → parser + summarizer (LLM) → [choose background]
                                                                                                        ├─ Simple  → card, no image model
                                                                                                        └─ Complex → storyboard flow → composite text
```

---

## 1. The decision everything hangs on (unchanged from the prior draft)

storyboard_maker generates *illustrative images from a prompt* — the image **is** the deliverable. A Quote Post is different: the deliverable is **the text**, which must be correct and legible. Image models reliably garble text, so for Quote Posts we never ask the image model to render the words. The card is two layers:

1. **Background** — Simple (solid/gradient, generated locally, no LLM and no Gemini) **or** Complex (Gemini, exactly as today, text-free with open negative space).
2. **Text** — rendered **programmatically** from the (summarized) term + body by a new `overlay_service`, composited on top.

A "candidate" the user picks is a **fully composited card** (background + text). For Simple posts this is the whole pipeline; for Complex it reuses the existing candidate-selection UX.

**Chosen overlay engine: HTML/CSS → PNG via Playwright (headless Chromium)**, behind a Protocol, with a Pillow fallback documented in §7.4. (Image Posts are unaffected — they remain pure storyboard_maker.)

---

## 2. What the repo actually looks like (grounding)

Verified facts the build must respect (some differ from `CLAUDE.md`):

- Routers are **three files**: `routers/projects.py` (config + project CRUD), `routers/prompts.py` (`POST /api/projects/{id}/prompt`), `routers/images.py` (`/images`, `/scenes/{sid}/candidates/{n}`, `POST /scenes` to accept, `GET /scenes`, `/scenes/{sid}/image`). Mounted in `backend/main.py`.
- `config.py` reads `config.yaml` (`storage.backend`, `llm.model`, `image_models`) + `choice.yaml` (`styles`) at import and exposes `STORAGE_BACKEND`, `LLM_MODEL`, `IMAGE_MODELS`, `STYLE_CHOICES`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `DATA_ROOT`. **`config.yaml` already has `llm.provider: anthropic`, but `config.py` reads only `llm.model`** — the provider field is currently dead. We extend exactly here (§5).
- `llm_service.py` hardwires `anthropic.Anthropic`; `generate_prompt(form) -> (sent, generated)` with a "creative director / text-to-image prompt" system prompt.
- `image_service.py` wraps `google-genai`, dispatches on each model's `api` field (`generate_content` vs `generate_images`), already supports a `reference_image_path`, writes `{i}.png`.
- Schemas: `FormInput{subject, action, background, style, lighting_mood, color, image_model}`, `Scene{id, project_id, order, form_input, llm_prompt_sent, generated_prompt, accepted_prompt, image_filename, created_at}`, `Project{id, name, created_at, scene_ids}`.
- Frontend: `WorkflowStep = FORM | PROMPT_REVIEW | IMAGE_GENERATION | IMAGE_REVIEW | STORYBOARD`; `WorkflowContext` is a `useReducer` machine persisted to `localStorage` key `storyboard_workflow`; components map 1:1 to steps.
- Deps already present: `anthropic==0.40.0`, `google-genai==1.14.0`, `fastapi`, `pydantic`, `pyyaml`. **So Gemini-as-a-text-LLM needs no new package**, and Anthropic is already there. New deps: `playwright` (+ `playwright install chromium`), optional `pillow`, and a small HTTP client for Ollama (`httpx`, already transitively present via `uvicorn[standard]`).

**KEEP wholesale:** the `uv`+FastAPI+Vite/React/TS stack; the `config.py` import-time load pattern; the `StorageService` Protocol + `FileStorage` layout (`mkdir -p` on access, JSON-per-record, `candidates/` cleared on regen); the `WorkflowContext` step-driven machine; config-driven model registry; the 3-level cascading selects.

---

## 3. Content source (NEW, but deliberately thin)

The flowchart says the user "chooses/sets a content file in config," and notes: *"Version 1 system. The code should be extensible so that we can some day bolt a content-source-finding engine on top."* Honor that literally:

```python
class ContentSource(Protocol):
    def load(self) -> tuple[str, str]: ...   # (filename, raw_text)
```

**v1 primary: `UploadSource`** — an in-app picker/upload (decision #1), surfaced as the `SourcePicker` step in the frontend (§10). Ship `ConfiguredFileSource` (reads a path from `config.yaml`) alongside as an equivalent for batch/CI use. A future `DiscoveryEngineSource` (the "finding engine") implements the same Protocol with zero changes elsewhere. v1 does **not** build discovery.

---

## 4. Format branch & parsing (NEW)

`format` is chosen per project: `"image"` or `"quote"`. Parsing is pluggable, keyed by format, mirroring the existing `StorageService` Protocol style:

```python
class Parser(Protocol):
    def parse(self, text: str) -> list[ParsedItem]: ...
```

**`QuotePostParser`** — for the glossary format `**Term (or alias):** body…`. Split on blank-line blocks; match `^\s*\*\*(?P<term>.+?):\*\*\s*(?P<body>.*)` (DOTALL body for multi-line definitions); skip non-matching blocks and report the skipped count. Verified against the sample `Glossary.txt`: yields 3 items (AMT, Bargain Element, Blackout Periods) with multi-line bodies intact. **No LLM at parse time** — summarization is a later, separate step (§7.2).

**`ImagePostParser`** — splits the file into items/beats (one entry → one scene). **No LLM.** Each item's text becomes `FormInput.subject`; per the flowchart note, the user then edits `subject` plus `action`, `background`, `style`, etc. in the existing form.

**Roadmap (Phase 2): `CsvParser`** — per decision #5, the parser layer must be extensible to tabular data; CSV is explicitly a Phase-2 parser, not v1.

---

## 5. LLM provider abstraction (NEW — the headline new requirement)

Requirement: a **global** LLM provider, overridable **per task**, across **Claude (API), Gemini (API), and local Ollama**. Extend the existing (currently half-wired) `llm` block in `config.yaml`. The shape below shows the **dev/initial-testing default** (decision #3): Claude for all LLM tasks, Gemini for image generation, Ollama configured but unused:

```yaml
llm:
  global: anthropic              # dev default — Claude for every LLM task
  providers:
    anthropic:
      model: claude-sonnet-4-6   # key from ANTHROPIC_API_KEY
    gemini:
      model: gemini-2.5-flash    # text mode; reuses google-genai SDK (already a dep)
    ollama:
      model: llama2
      base_url: http://localhost:11434   # local, no key; wired but unused in dev
  tasks:
    summarize:        global     # → anthropic
    prompt_creation:  global     # → anthropic
    # Later overrides, kept as documented examples:
    # summarize: gemini                  # use gemini for text summarization
    # prompt_creation: ollama:llama2     # offload image-prompt drafting to local Ollama
```

**Resolution rules** (implement in `config.py`, expose `resolve_llm(task) -> (provider, model)`):
- `global` → use `llm.global` + that provider's default `model`.
- bare provider name (`anthropic`) → that provider + its default model.
- `provider:model` (`ollama:llama2`) → override both.

The user's earlier example — global=gemini, summarize=global, prompt_creation=ollama:llama2 — is reachable purely by editing `config.yaml`, with no code change.

**Provider layer** — `backend/services/providers/`:

```python
class LLMProvider(Protocol):
    def complete(self, *, system: str, user: str, max_tokens: int) -> str: ...
```

- `AnthropicProvider` — wraps the existing `anthropic.Anthropic` client (lift it out of today's `llm_service`).
- `GeminiProvider` — reuses the already-present `google-genai` client in **text** mode (`generate_content`, no `IMAGE` modality). No new dependency.
- `OllamaProvider` — small `httpx` POST to `{base_url}/api/chat`; no SDK, no key; **degrade gracefully** with a clear error if `base_url` is unreachable so a missing local Ollama doesn't crash a request.

`llm_service.py` (**CHANGE**) becomes task-oriented: `get_provider(task)` via `resolve_llm`, plus `summarize(term, body, max_chars)` and `generate_prompt(...)`. The existing prompt-creation logic is retrofitted onto `get_provider("prompt_creation")` instead of a hardcoded Anthropic client. **Image generation stays separate** — `image_models` remains its own registry in `image_service.py`, and the LLM task router governs only **text** tasks. Per decision #2, **Ollama is never used for image generation**; it is a text-LLM provider only, and Gemini/Imagen remain the only image backends.

---

## 6. Schemas (`backend/models/schemas.py` — CHANGE)

Keep `FormInput` and `Scene` **as-is** (Image Posts reuse them unchanged). Add:

```python
class Project(BaseModel):                 # CHANGE — add three fields
    id: str = Field(default_factory=_new_id)
    name: str
    format: Literal["image", "quote"] = "image"   # NEW
    aspect: Literal["9:16", "16:9"] = "9:16"       # NEW (decision #2: both)
    source_filename: str | None = None             # NEW
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scene_ids: list[str] = Field(default_factory=list)   # image posts (existing)
    quote_ids: list[str] = Field(default_factory=list)   # NEW — quote posts

class QuotePost(BaseModel):               # NEW — parallels Scene
    id: str = Field(default_factory=_new_id)
    project_id: str
    order: int
    term: str                             # parsed
    raw_body: str                         # parsed full definition
    summary: str = ""                     # LLM-summarized; the text rendered on the card
    background_mode: Literal["simple", "complex"] = "simple"
    background_desc: str = ""             # complex only — user's text-box description
    llm_prompt_sent: str = ""             # complex only
    generated_prompt: str = ""            # complex only
    accepted_prompt: str = ""             # complex only
    template_id: str = ""
    color_scheme: str = ""
    font_pairing: str = ""
    image_filename: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Add matching request/response shapes paralleling the existing `GenerateImages*`/`AcceptImage*`.

---

## 7. Backend services

### 7.1 `parse_service.py` (NEW)
`ContentSource` (§3) + `Parser` Protocol with `QuotePostParser` and `ImagePostParser` (§4). `CsvParser` is Phase-2.

### 7.2 `llm_service.py` (CHANGE) + `providers/` (NEW)
Provider abstraction + task routing (§5). `summarize(term, body, max_chars)` condenses a definition to a card-sized `summary` (budget = the chosen template's `max_chars`, §9). This is the **only** LLM call in the Simple quote path. `generate_prompt(...)` (prompt_creation task) serves both Image Posts and Complex quote backgrounds.

### 7.3 `image_service.py` (KEEP, one nuance)
Unchanged dispatch logic. Two nuances: it now also serves **Complex quote backgrounds** (prompt asks for text-free, open negative space), and it must request the project's **aspect** (`9:16` or `16:9`) so backgrounds aren't cropped (Imagen: `aspect_ratio`; Gemini: aspect hint in prompt/config). Surface aspect alongside `output` config so it tracks the project setting. Not used at all by Simple quotes.

### 7.4 `overlay_service.py` (NEW — core of Quote Posts)
```python
class OverlayService(Protocol):
    def render(self, *, background: Path | ColorSpec, content: QuoteContent,
               template: Template, aspect: str, out_path: Path) -> Path: ...
```
`background` is either a Gemini PNG (Complex) or a `ColorSpec` solid/gradient (Simple). **Primary impl `HtmlOverlay` (Playwright):** inject term/body into an HTML template, apply safe-area, fonts, color scheme, auto-shrink font to fit, screenshot at the aspect's pixel size. Bundle fonts locally. **Fallback `PillowOverlay`:** scrim + wrapped text. Engine chosen in `config.yaml` (`overlay.engine`).

### 7.5 Routers
- **`routers/quotes.py` (NEW):** `POST …/quotes/parse` (source → draft QuotePosts); `POST …/quotes/{qid}/summarize` (→ editable summary); `POST …/quotes/{qid}/prompt` *(complex only — prompt_creation)*; `POST …/quotes/{qid}/candidates` (Simple: overlay on color-scheme variants, no Gemini; Complex: Gemini bg + overlay) → composited cards; `GET …/quotes/{qid}/candidates/{n}`; `POST …/quotes/{qid}/accept`; `GET …/quotes/{qid}/image`; `GET …/projects/{id}/export` (zip of accepted cards).
- **`routers/prompts.py` + `routers/images.py` (KEEP):** Image Posts reuse these verbatim. Add only an image-post parse endpoint (`POST …/scenes/parse`) that creates draft `Scene`s with `form_input.subject` pre-filled.
- **`routers/projects.py` (CHANGE):** accept `format`/`aspect`/`source` on create; add `GET /api/config/templates` (quote layout tree) and optionally `GET /api/config/llm` (resolved task→provider map, for display).

---

## 8. Storage layout (`storage/file_storage.py` — CHANGE)

Same Protocol and discipline; add a `quotes/` sibling to `scenes/`:

```
data/projects/{uuid}/
  project.json            # + format, aspect, source_filename, quote_ids
  scenes/{uuid}/          # IMAGE posts — unchanged
    scene.json  image.png  candidates/{n}.png
  quotes/{uuid}/          # QUOTE posts — NEW
    quote.json            # term, raw_body, summary, background_mode, template…
    image.png             # final composited card
    background.png        # complex only: chosen raw Gemini bg (re-overlay after text edits, no re-spend)
    candidates/{n}.png    # composited candidate cards
```

Keeping `background.png` lets a wording edit re-run only the (free, fast) overlay, not the (paid) Gemini call.

---

## 9. Config files

### `config.yaml` (CHANGE)
Add the expanded `llm` block (§5), plus:
```yaml
content_source:
  type: configured_file        # configured_file | upload  (discovery = future)
  path: ./content/Glossary.txt
output:
  aspects:                     # decision #2 — both
    "9:16": [1080, 1920]
    "16:9": [1920, 1080]
  default_aspect: "9:16"
overlay:
  engine: html                 # html (Playwright, v1 default) | pillow
```
Keep the existing `storage` and `image_models` blocks untouched. Re-note the existing gotcha: `WorkflowContext` persists `candidateUrls` to `localStorage`, so changing aspects or `num_images` won't reflect until the cache is cleared for `localhost:5173`.

### `choice.yaml` (CHANGE)
Keep `styles → lighting_moods → color_palettes` (used by Image Posts **and** Complex quote backgrounds). Add a parallel **quote template** tree, same 3-level cascading pattern the frontend already filters client-side:
```
templates[]                 # layout: safe-area %, alignment, font sizes, max_chars
  └─ color_schemes[]        # text + background (solid/gradient) colors — drives Simple bg
       └─ font_pairings[]   # heading/body font ids (files under assets/fonts/)
```
Each `template` carries machine fields the overlay needs (`max_chars` feeds the summarizer in §7.2). For 9:16, keep text clear of the Story/Reel UI zones (~top 13% / bottom 13%); center in the middle ~70%. Store human-readable labels (as today) where they flow into prompts; keep a "Custom…" free-text option; adding templates/schemes/fonts stays a `choice.yaml`-only edit.

---

## 10. Frontend (`frontend/src/` — CHANGE)

Keep the reducer machine + `localStorage` pattern (bump key to `shortsmaker_workflow`). Extend `WorkflowStep` and add a format branch:

| step | component | format |
|---|---|---|
| `SOURCE` | `SourcePicker` | both — set/confirm content file, aspect |
| `FORMAT` | `FormatChooser` | both — Quote Post vs Image Post |
| `ENTRY_REVIEW` | `EntryList` | both — parsed items (+ skipped count), edit/remove |
| `FORM` | `ImageCreationForm` *(existing)* | image — `subject` pre-filled from parser |
| `PROMPT_REVIEW` | `PromptReview` *(existing)* | image + complex quote |
| `IMAGE_GENERATION` | spinner *(existing)* | image + complex quote |
| `IMAGE_REVIEW` | `ImageGallery` *(existing)* | image |
| `STORYBOARD` | `StoryboardView` *(existing)* | image |
| `SUMMARY_REVIEW` | `SummaryReview` | quote — edit LLM summary |
| `BACKGROUND_CHOICE` | `BackgroundChooser` | quote — Simple vs Complex (Complex shows the bg-description text box) |
| `CARD_REVIEW` | `CardGallery` | quote — pick composited card |
| `COLLECTION` | `CollectionView` | quote — grid + "Download all" (export zip) |

Add `format`, `aspect`, and quote fields (`quoteId`, `summary`, `backgroundMode`) to `WorkflowState`. The existing image-post steps (`FORM`→`PROMPT_REVIEW`→`IMAGE_REVIEW`→`STORYBOARD`) are reused unchanged; the only new image-post UI is seeding `subject` from the parser. Follow the `frontend-design` skill for new components.

---

## 11. Phased build plan

**Phase 0 — fork & rename.** Copy repo → `shortsMaker/`; bump `localStorage` key; mount existing routers; app still runs the image flow end-to-end. (Smallest green build.)

**Phase 1 — content source + format branch + Image Post off a file.** `ContentSource`, `format`/`aspect`/`source` on `Project`, `ImagePostParser` seeding `FormInput.subject`, `SourcePicker`/`FormatChooser`/`EntryList`. Image Posts now work from a file with **zero changes** to the Claude→Gemini→accept core.

**Phase 2 — LLM provider abstraction.** `providers/` (anthropic/gemini/ollama) + `resolve_llm(task)` + per-task config; retrofit prompt_creation onto it. Verify the requested config (global=gemini, summarize=global, prompt_creation=ollama:llama2) resolves correctly. **`CsvParser`** added here per decision #5.

**Phase 3 — Quote Post (Simple).** `QuotePostParser` + `summarize` task + `overlay_service` (HTML/Playwright) + template tree in `choice.yaml` + fonts. Render Simple cards (solid/gradient, **no Gemini, no image model**). This is where the new product appears. Confirm long entries (e.g. AMT) summarize to fit `max_chars`.

**Phase 4 — Quote Post (Complex).** Background-description text box → prompt_creation → Gemini bg → composite (reuses `image_service`); persist `background.png` for free re-overlay on edits.

**Phase 5 — collection & export, aspect polish.** `CollectionView`, `GET …/export` zip with term-based filenames, 9:16 ↔ 16:9 layouts.

---

## 12. Roadmap / future enhancements (explicitly out of v1)

1. **Social captions / hashtags** *(decision #4)* — LLM-drafted off-image caption per post. Add as a task in the §5 router when built.
2. **CSV & other tabular parsers** *(decision #5)* — beyond the Phase-2 CSV parser, Q&A / numbered-list / TSV formats via the same `Parser` Protocol.
3. **Content-source-finding engine** *(flowchart note)* — a `DiscoveryEngineSource` implementing the §3 `ContentSource` Protocol (search/scrape/feed → entries), no downstream changes.
4. **Carousels for very long quotes** — split one long definition across multiple slides instead of shrinking the font.

---

## 13. Decisions log

**Resolved (baked in):**
1. **Backgrounds** — both: **Simple** (no LLM/no Gemini) and **Complex** (Gemini), chosen per quote post.
2. **Dimensions** — both **9:16** and **16:9**, selectable per project.
3. **Overlay engine** — HTML/CSS via Playwright; Pillow documented as fallback.
4. **Captions** — **not v1**; moved to roadmap (§12.1).
5. **Input formats** — `**Term:**` parser in v1; **CSV in Phase 2**, parser layer extensible to tabular data.
6. **Long definitions** — once format = Quote Post, **LLM-summarize** to fit the card (§7.2), budget from the template's `max_chars`.
7. **Content source UX** — **in-app picker/upload** (`UploadSource`) is the v1 primary; `ConfiguredFileSource` ships alongside for batch/CI; future `DiscoveryEngineSource` reuses the Protocol (§3).
8. **Ollama scope** — **LLM text tasks only** (summarize, prompt_creation). Never used for image generation; Gemini/Imagen remain the only image backends.
9. **Dev/testing defaults** — **Claude** for all LLM tasks (`global: anthropic`, both tasks `global`), **Gemini** for image generation. Ollama is wired in `config.yaml` but inactive until a task is pointed at it.
