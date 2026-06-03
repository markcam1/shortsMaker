from __future__ import annotations
import shutil
from pathlib import Path
from typing import Protocol, runtime_checkable

from backend.models.schemas import Project, Scene, QuotePost
from backend.config import DATA_ROOT


@runtime_checkable
class StorageService(Protocol):
    def save_project(self, project: Project) -> None: ...
    def load_project(self, project_id: str) -> Project: ...
    def list_projects(self) -> list[Project]: ...
    def delete_project(self, project_id: str) -> None: ...
    def save_scene(self, scene: Scene) -> None: ...
    def load_scene(self, project_id: str, scene_id: str) -> Scene: ...
    def list_scenes(self, project_id: str) -> list[Scene]: ...
    def project_dir(self, project_id: str) -> Path: ...
    def scene_dir(self, project_id: str, scene_id: str) -> Path: ...
    def candidates_dir(self, project_id: str, scene_id: str) -> Path: ...
    def save_quote(self, quote: QuotePost) -> None: ...
    def load_quote(self, project_id: str, quote_id: str) -> QuotePost: ...
    def list_quotes(self, project_id: str) -> list[QuotePost]: ...
    def quote_dir(self, project_id: str, quote_id: str) -> Path: ...
    def quote_candidates_dir(self, project_id: str, quote_id: str) -> Path: ...


class FileStorage:
    def __init__(self, root: Path = DATA_ROOT):
        self._root = root

    # --- project ---

    def project_dir(self, project_id: str) -> Path:
        p = self._root / project_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def save_project(self, project: Project) -> None:
        path = self.project_dir(project.id) / "project.json"
        path.write_text(project.model_dump_json(indent=2))

    def load_project(self, project_id: str) -> Project:
        path = self.project_dir(project_id) / "project.json"
        return Project.model_validate_json(path.read_text())

    def list_projects(self) -> list[Project]:
        projects = []
        for d in sorted(self._root.iterdir()):
            p = d / "project.json"
            if p.exists():
                projects.append(Project.model_validate_json(p.read_text()))
        return projects

    def delete_project(self, project_id: str) -> None:
        shutil.rmtree(self.project_dir(project_id), ignore_errors=True)

    # --- scenes (image posts) ---

    def scene_dir(self, project_id: str, scene_id: str) -> Path:
        p = self.project_dir(project_id) / "scenes" / scene_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def candidates_dir(self, project_id: str, scene_id: str) -> Path:
        p = self.scene_dir(project_id, scene_id) / "candidates"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def save_scene(self, scene: Scene) -> None:
        path = self.scene_dir(scene.project_id, scene.id) / "scene.json"
        path.write_text(scene.model_dump_json(indent=2))

    def load_scene(self, project_id: str, scene_id: str) -> Scene:
        path = self.scene_dir(project_id, scene_id) / "scene.json"
        return Scene.model_validate_json(path.read_text())

    def list_scenes(self, project_id: str) -> list[Scene]:
        scenes_root = self.project_dir(project_id) / "scenes"
        if not scenes_root.exists():
            return []
        scenes = []
        for d in sorted(scenes_root.iterdir()):
            p = d / "scene.json"
            if p.exists():
                scenes.append(Scene.model_validate_json(p.read_text()))
        return sorted(scenes, key=lambda s: s.order)

    # --- quotes (quote posts) ---

    def quote_dir(self, project_id: str, quote_id: str) -> Path:
        p = self.project_dir(project_id) / "quotes" / quote_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def quote_candidates_dir(self, project_id: str, quote_id: str) -> Path:
        p = self.quote_dir(project_id, quote_id) / "candidates"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def save_quote(self, quote: QuotePost) -> None:
        path = self.quote_dir(quote.project_id, quote.id) / "quote.json"
        path.write_text(quote.model_dump_json(indent=2))

    def load_quote(self, project_id: str, quote_id: str) -> QuotePost:
        path = self.quote_dir(project_id, quote_id) / "quote.json"
        return QuotePost.model_validate_json(path.read_text())

    def list_quotes(self, project_id: str) -> list[QuotePost]:
        quotes_root = self.project_dir(project_id) / "quotes"
        if not quotes_root.exists():
            return []
        quotes = []
        for d in sorted(quotes_root.iterdir()):
            p = d / "quote.json"
            if p.exists():
                quotes.append(QuotePost.model_validate_json(p.read_text()))
        return sorted(quotes, key=lambda q: q.order)
