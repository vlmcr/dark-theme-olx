#!/usr/bin/env python3
"""Generate dark theme for olx PNG icons without third-party deps."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "icons"


def write_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))  # type: ignore[return-value]


def draw_icon(size: int) -> bytes:
    bg = (11, 28, 30)
    accent = (35, 229, 219)
    pixels = bytearray(size * size * 4)
    cx = cy = (size - 1) / 2
    radius = size * 0.42
    moon_r = size * 0.22
    moon_cx = cx + size * 0.05
    moon_cy = cy - size * 0.04
    cut_cx = moon_cx + size * 0.1
    cut_cy = moon_cy - size * 0.02
    cut_r = moon_r * 0.88
    corner = size * 0.28

    def set_px(x: int, y: int, color: tuple[int, int, int], alpha: int = 255) -> None:
        i = (y * size + x) * 4
        pixels[i : i + 4] = bytes((color[0], color[1], color[2], alpha))

    for y in range(size):
        for x in range(size):
            # rounded-rect coverage
            dx = min(x, size - 1 - x)
            dy = min(y, size - 1 - y)
            if dx < corner and dy < corner:
                dist = math.hypot(corner - dx, corner - dy)
                edge = max(0.0, min(1.0, corner - dist + 0.5))
            else:
                edge = 1.0

            if edge <= 0:
                set_px(x, y, (0, 0, 0), 0)
                continue

            color = bg
            # subtle inner glow
            glow = max(0.0, 1 - math.hypot(x - cx, y - cy) / radius)
            color = mix(color, (18, 48, 50), glow * 0.35)

            moon = max(0.0, min(1.0, moon_r - math.hypot(x - moon_cx, y - moon_cy) + 0.6))
            cut = max(0.0, min(1.0, cut_r - math.hypot(x - cut_cx, y - cut_cy) + 0.6))
            crescent = max(0.0, moon - cut)
            if crescent > 0:
                color = mix(color, accent, crescent)

            alpha = int(255 * edge)
            set_px(x, y, color, alpha)

    return bytes(pixels)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(ROOT / f"icon{size}.png", size, size, draw_icon(size))


if __name__ == "__main__":
    main()
