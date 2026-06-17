#!/usr/bin/env python3
"""
Refreshes data/markets.json — the last-good fallback for the prediction-market
"China attacks Taiwan" index rendered by lib/markets.ts.

lib/markets.ts fetches these sources live at request time; this script keeps a
committed snapshot so that when every live source is unreachable from the deploy
region, the app shows a REAL recent value (with its true timestamp) instead of a
hardcoded number.

Sources (curated, verified June 2026):
  Polymarket : china-x-taiwan-military-clash-before-2027  (real money, ~$2M)
  Manifold   : will-china-attempt-to-invade-taiwan        (play money)
  Kalshi     : no liquid Taiwan-invasion market yet → skipped.

Run:    python scripts/update_markets.py
GH Action: .github/workflows/update-markets.yml
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "markets.json"

HEADLINE_Q = "中國 2026–27 對台動武機率"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"

POLY_SLUGS = [
    "china-x-taiwan-military-clash-before-2027",
    "will-china-invade-taiwan-before-2027",
    "will-china-invade-taiwan-by-june-30-2027",
]
MANIFOLD_SLUG = "will-china-attempt-to-invade-taiwan"


def _urllib(url: str, timeout: int) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def _curl(url: str, timeout: int) -> str:
    p = subprocess.run(
        ["curl", "-s", "--compressed", "-m", str(timeout), "-A", UA, url],
        capture_output=True, text=True,
    )
    if p.returncode != 0 or not (p.stdout or "").strip():
        raise RuntimeError(f"curl rc={p.returncode}")
    return p.stdout


def http_get(url: str, timeout: int = 15) -> str | None:
    for getter in (_urllib, _curl):
        try:
            return getter(url, timeout)
        except Exception as e:  # noqa: BLE001
            last = e
    print(f"[fetch] {url[:70]} → {last}", file=sys.stderr)
    return None


def compact_usd(n: float) -> str:
    if not n:
        return "$—"
    if n >= 1e9:
        return f"${n / 1e9:.2f}B"
    if n >= 1e6:
        return f"${n / 1e6:.2f}M"
    if n >= 1e3:
        return f"${n / 1e3:.1f}K"
    return f"${n:.0f}"


def compact_plain(n: float) -> str:
    if not n:
        return "—"
    if n >= 1e6:
        return f"{n / 1e6:.2f}M"
    if n >= 1e3:
        return f"{n / 1e3:.1f}K"
    return f"{n:.0f}"


def fetch_polymarket() -> dict | None:
    for slug in POLY_SLUGS:
        body = http_get(f"https://gamma-api.polymarket.com/markets?slug={slug}")
        if not body:
            continue
        try:
            arr = json.loads(body)
        except json.JSONDecodeError:
            continue
        m = arr[0] if isinstance(arr, list) and arr else None
        if not m or m.get("closed") or m.get("active") is False:
            continue
        try:
            prices = json.loads(m.get("outcomePrices", "[]"))
            yes = float(prices[0])
        except (ValueError, IndexError, TypeError):
            continue
        vol = float(m.get("volume") or 0)
        return {
            "name": "Polymarket", "kind": "real",
            "prob": max(0.0, min(1.0, yes)),
            "volume": vol, "volumeLabel": compact_usd(vol),
            "question": m.get("question", slug),
            "url": f"https://polymarket.com/event/{m.get('slug', slug)}",
            "weight": 1.0,
        }
    return None


def fetch_manifold() -> dict | None:
    body = http_get(f"https://api.manifold.markets/v0/slug/{MANIFOLD_SLUG}")
    if not body:
        return None
    try:
        m = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not m or m.get("isResolved") or not isinstance(m.get("probability"), (int, float)):
        return None
    vol = float(m.get("volume") or 0)
    return {
        "name": "Manifold", "kind": "play",
        "prob": max(0.0, min(1.0, float(m["probability"]))),
        "volume": vol, "volumeLabel": f"{compact_plain(vol)} MANA",
        "question": m.get("question", MANIFOLD_SLUG),
        "url": m.get("url", f"https://manifold.markets/{MANIFOLD_SLUG}"),
        "weight": 0.4,
    }


def main() -> int:
    sources = [s for s in (fetch_polymarket(), fetch_manifold()) if s]
    if not sources:
        print("[markets] all sources failed; keeping previous snapshot", file=sys.stderr)
        return 0  # leave the committed last-good value untouched

    wsum = sum(s["weight"] for s in sources) or 1
    prob = round(sum(s["prob"] * s["weight"] for s in sources) / wsum, 4)
    probs = [s["prob"] for s in sources]

    out = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "question": HEADLINE_Q,
        "prob": prob,
        "spread": {"min": min(probs), "max": max(probs)},
        "sources": sources,
    }
    DATA_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[markets] blended {prob * 100:.1f}% from {len(sources)} sources", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
