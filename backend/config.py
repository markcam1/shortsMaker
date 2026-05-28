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
LLM_MODEL: str = _cfg["llm"]["model"]
IMAGE_MODELS: list[dict] = _cfg["image_models"]

_choice_path = _ROOT / "choice.yaml"
with open(_choice_path) as f:
    _choices = yaml.safe_load(f)
STYLE_CHOICES: list[dict] = _choices["styles"]

ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]
GOOGLE_API_KEY: str = os.environ["GOOGLE_API_KEY"]

DATA_ROOT: Path = _ROOT / "data" / "projects"
DATA_ROOT.mkdir(parents=True, exist_ok=True)
