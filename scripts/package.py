#!/usr/bin/env python3
"""Build a Chrome-ready zip of the extension (manifest at the zip root)."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INCLUDE = (
    "manifest.json",
    "background.js",
    "content",
    "popup",
    "icons",
)


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    out_dir = ROOT / "dist"
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / "dark-theme-for-olx.zip"
    versioned = out_dir / f"dark-theme-for-olx-{version}.zip"

    files: list[Path] = []
    for name in INCLUDE:
        path = ROOT / name
        if path.is_file():
            files.append(path)
        else:
            files.extend(p for p in path.rglob("*") if p.is_file())

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(files):
            zf.write(path, path.relative_to(ROOT).as_posix())

    versioned.write_bytes(zip_path.read_bytes())
    print(f"Wrote {zip_path.relative_to(ROOT)} ({zip_path.stat().st_size} bytes)")
    print(f"Wrote {versioned.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
