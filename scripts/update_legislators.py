#!/usr/bin/env python3
"""
Daily updater for data/legislators.json — collects "currently abroad" entries
from publicly accessible sources and writes them back to the JSON file.

Pipeline:
  1. Pull canonical roster of term-11 legislators from g0v's ly.govapi.tw
     (this is the authoritative name list — names not in this set are rejected).
  2. Pull recent Google News RSS for "立委 出訪/出國/訪問".
  3. For each headline: split into substrings, intersect with the roster.
     Only proceed if exactly one legislator name matches the headline.
  4. Extract destination country from a closed list of country names.
  5. Append candidates that pass — preserving manual entries already in JSON.

Run:    python scripts/update_legislators.py
GH Action: .github/workflows/update-legislators.yml (06:00 Asia/Taipei daily)
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, timedelta
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

COUNTRIES = [
    "美國", "日本", "韓國", "法國", "德國", "英國", "捷克", "波蘭",
    "新加坡", "越南", "印度", "加拿大", "澳洲", "歐盟",
    "菲律賓", "印尼", "馬來西亞", "泰國", "義大利", "西班牙", "荷蘭",
    "瑞典", "丹麥", "芬蘭", "比利時", "瑞士", "巴拉圭", "梵蒂岡",
    "立陶宛", "拉脫維亞", "愛沙尼亞", "斯洛伐克", "匈牙利",
    "巴西", "阿根廷", "智利", "秘魯", "南非", "以色列", "土耳其",
]

# Single-char abbreviations: 訪日 / 赴美 / 抵韓 etc.
ABBREV = {
    "日": "日本", "美": "美國", "韓": "韓國", "英": "英國", "法": "法國",
    "德": "德國", "越": "越南", "泰": "泰國", "菲": "菲律賓", "印": "印度",
    "加": "加拿大", "澳": "澳洲", "歐": "歐盟",
}

DEFAULT_DURATION_DAYS = 5


def fetch(url: str, timeout: int = 12) -> str | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"[fetch] {url[:80]} → {e}", file=sys.stderr)
        return None


def fetch_roster() -> dict[str, str]:
    """Return {name: party} for current-term legislators (term 11)."""
    roster: dict[str, str] = {}
    page = 1
    while True:
        body = fetch(
            f"https://ly.govapi.tw/legislator?term=11&page={page}&limit=100"
        )
        if not body:
            break
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            break
        for leg in data.get("legislators", []):
            name = leg.get("name", "").strip()
            party = leg.get("party") or leg.get("partyGroup") or "未知"
            if name:
                roster[name] = party
        if page >= data.get("total_page", 1):
            break
        page += 1
    print(f"[roster] {len(roster)} term-11 legislators loaded", file=sys.stderr)
    return roster


def fetch_news_candidates(roster: dict[str, str]) -> list[dict]:
    """Pull Google News, return only entries whose title contains a legislator name."""
    if not roster:
        return []
    q = urllib.parse.quote("立委 出訪 OR 立委 出國 OR 立委 訪問 OR 立委 抵達")
    url = (
        f"https://news.google.com/rss/search?q={q}"
        "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    )
    xml = fetch(url)
    if not xml:
        return []
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []

    today = date.today().isoformat()
    returns_default = (date.today() + timedelta(days=DEFAULT_DURATION_DAYS)).isoformat()
    out: list[dict] = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        if "立委" not in title and "立法委員" not in title:
            continue

        # Find legislator names — must match exactly one for safety
        hits = [n for n in roster if n in title]
        if len(hits) != 1:
            continue
        name = hits[0]

        # Detect destination AFTER stripping the legislator name
        # (avoids "韓國瑜" → 韓國 false positive)
        clean = title.replace(name, "")
        country = next((c for c in COUNTRIES if c in clean), None)
        if not country:
            abbrev_match = re.search(r"[訪赴抵旅遊到] ?([日美韓英法德越泰菲印加澳歐])", clean)
            if abbrev_match:
                country = ABBREV.get(abbrev_match.group(1))
        if not country:
            continue

        out.append(
            {
                "name": name,
                "party": roster[name],
                "country": country,
                "purpose": title[:80],
                "departed": today,
                "returns": returns_default,
            }
        )
    print(f"[news] {len(out)} valid candidates from Google News", file=sys.stderr)
    return out


def main() -> int:
    today = date.today().isoformat()
    existing = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    # Drop expired entries
    kept = [a for a in existing.get("abroad", []) if a.get("returns", "9999") >= today]

    roster = fetch_roster()
    candidates = fetch_news_candidates(roster) if roster else []

    # Dedupe by name — if a legislator already has an active trip in the file,
    # don't auto-add another one (avoids accumulating headlines about the same person).
    seen_names = {a["name"] for a in kept}
    added = 0
    for c in candidates:
        if c["name"] in seen_names:
            continue
        kept.append(c)
        seen_names.add(c["name"])
        added += 1

    existing["abroad"] = kept
    existing["updated"] = today
    DATA_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[update] {len(kept)} active entries (+{added} new)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
