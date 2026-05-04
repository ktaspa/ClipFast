"""
Load .env into os.environ without being blocked by empty placeholder variables.

IDEs often inject ASSEMBLY_AI_API_KEY="" into the process; load_dotenv(override=False)
then refuses to replace them. We only skip a .env value if the current env value is
non-empty after stripping.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values

_MERGED = False


def _merge_file(path: Path) -> None:
    if not path.is_file():
        return
    data = dotenv_values(path)
    for key, raw in data.items():
        if raw is None:
            continue
        val = str(raw).strip()
        if not val:
            continue
        cur = os.environ.get(key)
        if cur is not None and str(cur).strip():
            continue
        os.environ[key] = val


def load_clipfast_dotenv() -> None:
    """Idempotent: merge known .env locations into empty env slots."""
    global _MERGED
    if _MERGED:
        return

    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent

    paths: list[Path] = [
        repo_root / ".env",
        backend_dir / ".env",
        Path.cwd() / ".env",
    ]

    # Walk up from cwd (max depth) for monorepo / odd launch working directories
    cur = Path.cwd().resolve()
    for _ in range(10):
        if (cur / "start.sh").is_file() or (cur / ".env.example").is_file():
            paths.append(cur / ".env")
            break
        parent = cur.parent
        if parent == cur:
            break
        cur = parent

    seen: set[Path] = set()
    for p in paths:
        try:
            rp = p.resolve()
        except OSError:
            continue
        if rp in seen:
            continue
        seen.add(rp)
        _merge_file(rp)

    _MERGED = True
