#!/usr/bin/env python3
"""
Daily updater for data/legislators.json and data/diplomacy.json.

Two public-news signals for the dashboard:

  1. 立委在外 (data/legislators.json) — which term-11 legislators are currently
     travelling abroad. Roster comes from the LY open API (authoritative); the
     "abroad" set is detected from Google News headlines.

  2. 外賓訪台 / 外交動態 (data/diplomacy.json) — recent high-profile foreign
     delegations visiting Taiwan + major diplomatic events (the Pelosi-style
     tension signal).

Why the rewrite: the previous detector used a single query and **rejected any
headline mentioning more than one legislator** — but delegation trips (e.g.
「韓國瑜率跨黨派立委訪英」) are exactly multi-name headlines, so it almost never
caught anyone and the card sat at a static 113/113. This version runs several
queries, accepts every legislator named in a travel headline, widens the
country dictionary, and always records `lastChecked` so the UI can tell
"checked, nobody abroad" apart from "data is stale".

Run:    python scripts/update_legislators.py
GH Action: .github/workflows/update-legislators.yml (06:00 Asia/Taipei daily)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEG_FILE = ROOT / "data" / "legislators.json"
DIP_FILE = ROOT / "data" / "diplomacy.json"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Travel verbs — a headline must contain one of these to be considered a trip.
TRAVEL_RE = re.compile(r"出訪|出國|訪問|考察|率團|參訪|出席|赴|抵達|抵|訪美|訪日|訪歐")

COUNTRIES = [
    "美國", "日本", "韓國", "法國", "德國", "英國", "捷克", "波蘭",
    "新加坡", "越南", "印度", "加拿大", "澳洲", "紐西蘭", "歐盟", "歐洲",
    "菲律賓", "印尼", "馬來西亞", "泰國", "義大利", "西班牙", "葡萄牙", "荷蘭",
    "瑞典", "挪威", "丹麥", "芬蘭", "奧地利", "比利時", "瑞士", "愛爾蘭",
    "立陶宛", "拉脫維亞", "愛沙尼亞", "斯洛伐克", "斯洛維尼亞", "匈牙利", "希臘",
    "巴拉圭", "貝里斯", "瓜地馬拉", "宏都拉斯", "海地", "聖露西亞", "教廷", "梵蒂岡",
    "史瓦帝尼", "馬紹爾", "帛琉", "吐瓦魯", "諾魯", "巴布亞紐幾內亞",
    "巴西", "阿根廷", "智利", "秘魯", "墨西哥", "南非", "以色列", "土耳其",
    "烏克蘭", "蒙古", "中東", "中南美", "拉美", "東歐", "北歐", "友邦",
]

# Single-char abbreviations: 訪日 / 赴美 / 抵韓 etc.
ABBREV = {
    "日": "日本", "美": "美國", "韓": "韓國", "英": "英國", "法": "法國",
    "德": "德國", "越": "越南", "泰": "泰國", "菲": "菲律賓", "印": "印度",
    "加": "加拿大", "澳": "澳洲", "歐": "歐洲", "捷": "捷克", "波": "波蘭",
}

LEG_QUERIES = [
    "立委 出訪", "立委 出國", "立委 訪問團", "立委 率團",
    "立委 出國考察", "立委 訪問", "立法委員 訪問團", "委員會 考察",
]

DIP_QUERIES = [
    "訪問團 訪台", "美國 國會 訪台", "參議員 訪台", "眾議員 訪台",
    "外賓 訪台", "外交部長 訪台", "友邦 元首 訪台", "議員團 訪台",
]

DEFAULT_DURATION_DAYS = 5
DIP_KEEP = 12
DIP_WINDOW_DAYS = 14


def _get_urllib(url: str, timeout: int) -> str:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def _get_curl(url: str, timeout: int) -> str:
    proc = subprocess.run(
        ["curl", "-s", "--compressed", "-m", str(timeout), "-A", UA, url],
        capture_output=True,
        text=True,
    )
    out = proc.stdout or ""
    if proc.returncode != 0 or not out.strip():
        raise RuntimeError(f"curl rc={proc.returncode}")
    return out


def fetch(url: str, timeout: int = 12) -> str | None:
    """urllib first, curl fallback. Returns None only if both fail."""
    for getter in (_get_urllib, _get_curl):
        try:
            return getter(url, timeout)
        except Exception as e:  # noqa: BLE001
            last = e
    print(f"[fetch] {url[:80]} → {last}", file=sys.stderr)
    return None


def google_news_url(query: str) -> str:
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"


def rss_items(query: str) -> list[dict]:
    """Return [{title, link, date}] for a Google News query."""
    xml = fetch(google_news_url(query))
    if not xml:
        return []
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []
    out: list[dict] = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        if not title:
            continue
        link = (it.findtext("link") or "").strip()
        pub = (it.findtext("pubDate") or "").strip()
        try:
            d = parsedate_to_datetime(pub).date().isoformat()
        except Exception:  # noqa: BLE001
            d = date.today().isoformat()
        out.append({"title": title, "link": link, "date": d})
    return out


def fetch_roster() -> dict[str, str]:
    """Return {name: party} for current-term legislators (term 11)."""
    roster: dict[str, str] = {}
    page = 1
    while True:
        body = fetch(f"https://ly.govapi.tw/legislator?term=11&page={page}&limit=100")
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


_COUNTRY_ALT = "|".join(
    sorted((re.escape(c) for c in COUNTRIES), key=len, reverse=True)
)
_VERB_COUNTRY_RE = re.compile(
    r"(?:出訪|前往|赴|抵達|抵|訪問|參訪|考察|到|訪)\s*(" + _COUNTRY_ALT + r")"
)


def detect_country(clean_title: str) -> str | None:
    # 1. country immediately after a travel verb = the actual destination
    #    (so "美國關稅衝擊…訪問越南" resolves to 越南, not 美國)
    m = _VERB_COUNTRY_RE.search(clean_title)
    if m:
        return m.group(1)
    # 2. single-char abbreviation after a travel verb (訪美 / 赴日 / 抵韓)
    m = re.search(r"[訪赴抵到]\s?([日美韓英法德越泰菲印加澳歐捷波])", clean_title)
    if m:
        return ABBREV.get(m.group(1))
    # 3. any country mentioned anywhere
    return next((c for c in COUNTRIES if c in clean_title), None)


def fetch_abroad_candidates(roster: dict[str, str]) -> list[dict]:
    """Every term-11 legislator named in a *recent* travel headline with a
    destination. Only trips whose [departed, departed+N] window still covers
    today are kept (filters out years-old articles Google News surfaces)."""
    if not roster:
        return []
    today = date.today()
    seen_titles: set[str] = set()
    out: list[dict] = []
    for q in LEG_QUERIES:
        for item in rss_items(q):
            title = item["title"]
            if title in seen_titles:
                continue
            seen_titles.add(title)
            if "立委" not in title and "立法委員" not in title:
                continue
            if not TRAVEL_RE.search(title):
                continue
            hits = [n for n in roster if n in title]
            if not hits:
                continue

            # Strip ALL matched names before detecting the destination, so
            # "韓國瑜" can't leak 韓國 onto everyone else in a delegation headline.
            clean = title
            for n in hits:
                clean = clean.replace(n, "")
            country = detect_country(clean)
            if not country:
                continue

            try:
                art = date.fromisoformat(item["date"])
            except ValueError:
                art = today
            if art > today:
                art = today
            if (today - art).days > DEFAULT_DURATION_DAYS:
                continue  # trip window already closed — stale article
            departed = art.isoformat()
            returns = (art + timedelta(days=DEFAULT_DURATION_DAYS)).isoformat()

            for name in hits:
                out.append(
                    {
                        "name": name,
                        "party": roster[name],
                        "country": country,
                        "purpose": title[:80],
                        "departed": departed,
                        "returns": returns,
                    }
                )
    print(f"[news] {len(out)} abroad candidates across {len(LEG_QUERIES)} queries",
          file=sys.stderr)
    return out


def update_legislators() -> None:
    today = date.today().isoformat()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    existing = json.loads(LEG_FILE.read_text(encoding="utf-8"))

    # Drop expired entries
    kept = [a for a in existing.get("abroad", []) if a.get("returns", "9999") >= today]

    roster = fetch_roster()
    candidates = fetch_abroad_candidates(roster) if roster else []

    # Dedupe by name — keep the first (most-recent-query) sighting per legislator.
    seen_names = {a["name"] for a in kept}
    detected = 0
    for c in candidates:
        if c["name"] in seen_names:
            continue
        kept.append(c)
        seen_names.add(c["name"])
        detected += 1

    existing["abroad"] = kept
    existing["updated"] = today
    existing["lastChecked"] = now
    existing["abroadDetected"] = detected
    if roster:
        existing["totalSeats"] = existing.get("totalSeats", 113)
    LEG_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[legislators] {len(kept)} active abroad (+{detected} new this run)")


def update_diplomacy() -> None:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    today = date.today()
    cutoff = (today - timedelta(days=DIP_WINDOW_DAYS)).isoformat()

    seen: set[str] = set()
    events: list[dict] = []
    for q in DIP_QUERIES:
        for item in rss_items(q):
            title = item["title"]
            if title in seen:
                continue
            if "訪台" not in title and "來台" not in title and "訪問" not in title:
                continue
            seen.add(title)
            # split "headline - source"
            source = ""
            if " - " in title:
                title_clean, source = title.rsplit(" - ", 1)
            else:
                title_clean = title
            events.append(
                {
                    "title": title_clean.strip()[:90],
                    "source": source.strip(),
                    "date": item["date"],
                    "url": item["link"],
                }
            )

    events.sort(key=lambda e: e["date"], reverse=True)
    events = events[:DIP_KEEP]
    count7d = sum(
        1 for e in events if e["date"] >= (today - timedelta(days=7)).isoformat()
    )

    out = {
        "updated": today.isoformat(),
        "lastChecked": now,
        "windowDays": DIP_WINDOW_DAYS,
        "count7d": count7d,
        "events": [e for e in events if e["date"] >= cutoff] or events[:6],
    }
    DIP_FILE.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[diplomacy] {len(out['events'])} events · {count7d} in last 7d")


def main() -> int:
    update_legislators()
    update_diplomacy()
    return 0


if __name__ == "__main__":
    sys.exit(main())
