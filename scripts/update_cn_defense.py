#!/usr/bin/env python3
"""
Daily updater for data/cn_defense.json — pulls A-share defense tickers from
Sina Finance K-line endpoint (公開 endpoint, 直連可用) and persists ~70
trading days of OHLCV.

Run:    python scripts/update_cn_defense.py
GH Action: .github/workflows/update-cn-defense.yml (workday, post-close Asia/Shanghai)
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "cn_defense.json"

TICKERS = [
    # ETFs
    {"code": "512660", "market": "sh", "name": "軍工ETF",  "sector": "綜合軍工 · 國泰",     "group": "etfs"},
    {"code": "512670", "market": "sh", "name": "國防ETF",  "sector": "中證國防 · 鵬華",     "group": "etfs"},
    # Stocks (market: 'sh' = Shanghai, 'sz' = Shenzhen)
    {"code": "600760", "market": "sh", "name": "中航沈飛", "sector": "殲擊機 · J-15/16/35", "group": "stocks"},
    {"code": "000768", "market": "sz", "name": "中航西飛", "sector": "運輸機 · Y-20 / H-6", "group": "stocks"},
    {"code": "600150", "market": "sh", "name": "中國船舶", "sector": "海軍造船",            "group": "stocks"},
    {"code": "600893", "market": "sh", "name": "航發動力", "sector": "航空發動機",          "group": "stocks"},
    {"code": "600879", "market": "sh", "name": "航天電子", "sector": "航天電子",            "group": "stocks"},
    {"code": "002179", "market": "sz", "name": "中航光電", "sector": "連接器",              "group": "stocks"},
    {"code": "600038", "market": "sh", "name": "中直股份", "sector": "直升機",              "group": "stocks"},
    {"code": "000519", "market": "sz", "name": "中兵紅箭", "sector": "兵器 · 反坦克彈",     "group": "stocks"},
]

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
HEAD = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": "https://finance.sina.com.cn/",
    "Connection": "close",
}


def fetch_bars(code: str, market: str, days: int = 70, retries: int = 3) -> list[dict]:
    """
    Sina Finance K-line endpoint.
      symbol: 'sh600760' / 'sz000768'
      scale=240 → daily bar (240-min interval); datalen=N requests last N bars
      Response: JSON array of {day, open, high, low, close, volume}
    """
    symbol = f"{market}{code}"
    url = (
        "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
        f"CN_MarketData.getKLineData?symbol={symbol}&scale=240&ma=no&datalen={days}"
    )
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEAD)
            with urllib.request.urlopen(req, timeout=20) as r:
                body = r.read().decode("utf-8", errors="replace").strip()
            if not body.startswith("["):
                raise RuntimeError(f"unexpected body head: {body[:80]}")
            data = json.loads(body)
            break
        except Exception as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    else:
        raise last_err if last_err else RuntimeError("unknown")

    bars: list[dict] = []
    for row in data:
        try:
            bars.append(
                {
                    "date": row["day"],
                    "open": round(float(row["open"]), 4),
                    "close": round(float(row["close"]), 4),
                    "high": round(float(row["high"]), 4),
                    "low": round(float(row["low"]), 4),
                    "volume": int(row["volume"]),
                }
            )
        except (KeyError, ValueError, TypeError):
            continue
    return bars[-days:]


def main() -> int:
    out = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tickers": {},
    }
    failures = 0
    for t in TICKERS:
        try:
            bars = fetch_bars(t["code"], t["market"])
            print(
                f"  {t['code']:6s} {t['name']:7s} "
                f"{len(bars):3d} bars · last={bars[-1]['date'] if bars else 'NONE'} "
                f"={bars[-1]['close'] if bars else '?'}",
                file=sys.stderr,
            )
            out["tickers"][t["code"]] = {**t, "bars": bars}
        except Exception as e:
            print(f"  {t['code']:6s} {t['name']:7s} FAIL: {e}", file=sys.stderr)
            failures += 1
            # preserve previous data if available
            if DATA_FILE.exists():
                try:
                    prev = json.loads(DATA_FILE.read_text(encoding="utf-8"))
                    if t["code"] in prev.get("tickers", {}):
                        out["tickers"][t["code"]] = prev["tickers"][t["code"]]
                except Exception:
                    pass
        time.sleep(1.8)  # rate-limit hedge — Eastmoney TCP-RSTs aggressive callers

    if not out["tickers"]:
        print("[error] all fetches failed; refusing to overwrite", file=sys.stderr)
        return 1

    DATA_FILE.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"[update] wrote {len(out['tickers'])} tickers, {failures} failures",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
