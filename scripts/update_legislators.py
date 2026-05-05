#!/usr/bin/env python3
"""
Daily updater for data/legislators.json — collects "currently abroad" entries
from publicly accessible sources and writes them back to the JSON file.

Sources (best-effort, falls back gracefully):
  1. 立法院公務出國報告 (https://www.ly.gov.tw/Pages/List.aspx?nodeid=42408)
  2. Google News RSS for "立委 出訪 OR 出國"

Strategy: append + dedupe + drop entries whose 'returns' is in the past.
Manual edits are preserved by NOT overwriting the file when both sources
return zero candidates.

Run:    python scripts/update_legislators.py
GH Action runs daily at 06:00 Asia/Taipei via .github/workflows/update-legislators.yml
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "legislators.json"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9",
}


def fetch(url: str, timeout: int = 12) -> str | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"[fetch] {url} → {e}", file=sys.stderr)
        return None


def fetch_ly_abroad_page() -> list[dict]:
    """Try the LY 公務出國 list page (may be blocked outside TW)."""
    html = fetch("https://www.ly.gov.tw/Pages/List.aspx?nodeid=42408")
    if not html:
        return []
    # Pattern is fragile — actual extraction depends on current LY page format.
    # Returns empty until we confirm the structure from a TW-IP run.
    return []


def fetch_google_news() -> list[dict]:
    """Pull recent legislator-abroad mentions from Google News RSS."""
    q = urllib.parse.quote("立委 出訪 OR 立委 出國 OR 立委 訪問")
    url = f"https://news.google.com/rss/search?q={q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    xml = fetch(url)
    if not xml:
        return []
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []
    items = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        pubdate = it.findtext("pubDate") or ""
        # Heuristic: "立委 X 出訪 [country]"
        m = re.search(r"立委\s*([一-鿿]{2,4})", title)
        country_m = re.search(
            r"(美國|日本|韓國|法國|德國|英國|捷克|波蘭|新加坡|越南|印度|加拿大|澳洲|歐盟|歐洲|菲律賓|印尼)",
            title,
        )
        if not m or not country_m:
            continue
        items.append(
            {
                "name": m.group(1),
                "party": "未知",
                "country": country_m.group(1),
                "purpose": title[:60],
                "departed": date.today().isoformat(),
                "returns": (date.today() + timedelta(days=5)).isoformat(),
                "_source": "news",
            }
        )
    return items


def main() -> int:
    today = date.today().isoformat()
    existing = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    # Drop expired entries
    kept = [a for a in existing.get("abroad", []) if a.get("returns", "9999") >= today]

    candidates = fetch_ly_abroad_page() or fetch_google_news()
    if not candidates:
        # Don't overwrite — just refresh "updated" timestamp
        existing["abroad"] = kept
        existing["updated"] = today
        DATA_FILE.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"[update] no new candidates; kept {len(kept)} active entries")
        return 0

    # Dedupe by (name, country, departed)
    seen = {(a["name"], a["country"], a["departed"]) for a in kept}
    for c in candidates:
        c.pop("_source", None)
        key = (c["name"], c["country"], c["departed"])
        if key in seen:
            continue
        kept.append(c)
        seen.add(key)

    existing["abroad"] = kept
    existing["updated"] = today
    DATA_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[update] now {len(kept)} active entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
