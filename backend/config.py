from pathlib import Path
import yaml
from dotenv import load_dotenv
import os

load_dotenv()

_ROOT = Path(__file__).parent.parent
_config_path = _ROOT / "config.yaml"

with open(_config_path) as f:
    _cfg = yaml.safe_load(f)

STORAGE_BACKEND: str = _cfg["storage"]["backend"]
LLM_CONFIG: dict = _cfg["llm"]
IMAGE_MODELS: list[dict] = _cfg["image_models"]

_content_src = _cfg.get("content_source", {})
CONTENT_SOURCE_TYPE: str = _content_src.get("type", "upload")
CONTENT_SOURCE_PATH: str = _content_src.get("path", "./content/Glossary.txt")

_output = _cfg.get("output", {})
OUTPUT_ASPECTS: dict = _output.get("aspects", {"9:16": [1080, 1920], "16:9": [1920, 1080]})
DEFAULT_ASPECT: str = _output.get("default_aspect", "9:16")

OVERLAY_ENGINE: str = _cfg.get("overlay", {}).get("engine", "html")

_workflow = _cfg.get("workflow", {})
REQUIRE_ALL_MARKED: bool = bool(_workflow.get("require_all_marked", False))

_choice_path = _ROOT / "choice.yaml"
with open(_choice_path) as f:
    _choices = yaml.safe_load(f)
STYLE_CHOICES: list[dict] = _choices["styles"]
TEMPLATE_CHOICES: list[dict] = _choices.get("templates", [])

ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]
GOOGLE_API_KEY: str = os.environ["GOOGLE_API_KEY"]

DATA_ROOT: Path = _ROOT / "data" / "projects"
DATA_ROOT.mkdir(parents=True, exist_ok=True)


def resolve_llm(task: str) -> tuple[str, str]:
    """Returns (provider_name, model) for the given task name."""
    task_val = LLM_CONFIG.get("tasks", {}).get(task, "global")
    if task_val == "global":
        provider_name = LLM_CONFIG["global"]
    elif ":" in task_val:
        provider_name, model = task_val.split(":", 1)
        return provider_name, model
    else:
        provider_name = task_val
    model = LLM_CONFIG["providers"][provider_name]["model"]
    return provider_name, model
