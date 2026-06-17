#!/usr/bin/env python3
"""
Daily updater for data/cn_defense.json — pulls A-share defense tickers and
persists ~70 trading days of OHLCV **plus 主力資金 (main-force) net inflow**.

Why not Sina: money.finance.sina.com.cn geo-throttles non-CN IPs, so the
GitHub Actions runner (US) silently fails and the data goes stale.

Sources (verified reachable from non-CN IPs):
  OHLCV (primary)   : Tencent web.ifzq.gtimg.cn  (urllib-friendly, very reliable)
  OHLCV (fallback)  : Eastmoney push2his kline    (gives 成交額; curl only)
  主力資金 net inflow : Eastmoney push2his fflow/daykline (curl only, best-effort)

Note: Eastmoney TLS-fingerprint-blocks Python's urllib, so we shell out to
`curl` (present on macOS + GitHub ubuntu-latest). Flow is best-effort: if
Eastmoney is unreachable/rate-limited, previous flow is preserved and the
主力評分 degrades gracefully to its technical components.

Run:    python scripts/update_cn_defense.py
GH Action: .github/workflows/update-cn-defense.yml (workday, post-close Asia/Shanghai)
"""
from __future__ import annotations

import json
import subprocess
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


def secid(market: str, code: str) -> str:
    """Eastmoney secid: 1.<code> for Shanghai, 0.<code> for Shenzhen."""
    return f"{'1' if market == 'sh' else '0'}.{code}"


def _get_urllib(url: str, referer: str, timeout: int) -> str:
    head = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": referer,
    }
    req = urllib.request.Request(url, headers=head)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace").strip()


def _get_curl(url: str, referer: str, timeout: int) -> str:
    """Eastmoney TLS-fingerprint-blocks urllib but accepts curl."""
    proc = subprocess.run(
        ["curl", "-s", "--compressed", "-m", str(timeout), "-A", UA, "-e", referer, url],
        capture_output=True,
        text=True,
    )
    out = (proc.stdout or "").strip()
    if proc.returncode != 0 or not out:
        raise RuntimeError(f"curl rc={proc.returncode} bytes={len(out)}")
    return out


def http_get(url: str, referer: str, retries: int = 3, timeout: int = 20) -> str:
    """Try urllib first (fast, works for Tencent); fall back to curl (Eastmoney)."""
    last_err: Exception | None = None
    for attempt in range(retries):
        for getter in (_get_urllib, _get_curl):
            try:
                body = getter(url, referer, timeout)
                if body:
                    return body
            except Exception as e:  # noqa: BLE001 - best-effort scraper
                last_err = e
        time.sleep(1.5 * (attempt + 1))
    raise last_err if last_err else RuntimeError("unknown http error")


def fetch_bars_eastmoney(market: str, code: str, days: int = 70) -> list[dict]:
    """
    Eastmoney daily K-line. klt=101 daily, fqt=1 前復權 (matches Tencent qfq).
    klines rows: "date,open,close,high,low,volume(手),amount(元),..."
    """
    url = (
        "https://push2his.eastmoney.com/api/qt/stock/kline/get"
        f"?secid={secid(market, code)}"
        "&fields1=f1,f2,f3,f4,f5,f6"
        "&fields2=f51,f52,f53,f54,f55,f56,f57"
        f"&klt=101&fqt=1&end=20500101&lmt={days}"
    )
    body = http_get(url, referer="https://quote.eastmoney.com/")
    obj = json.loads(body)
    klines = (obj.get("data") or {}).get("klines") or []
    bars: list[dict] = []
    for row in klines:
        p = row.split(",")
        if len(p) < 7:
            continue
        try:
            bars.append(
                {
                    "date": p[0],
                    "open": round(float(p[1]), 4),
                    "close": round(float(p[2]), 4),
                    "high": round(float(p[3]), 4),
                    "low": round(float(p[4]), 4),
                    "volume": int(float(p[5])),
                    "amount": round(float(p[6]), 2),
                }
            )
        except (ValueError, TypeError):
            continue
    return bars[-days:]


def fetch_bars_tencent(market: str, code: str, days: int = 70) -> list[dict]:
    """
    Tencent fallback K-line (no 成交額; amount left 0 → lib proxies via vol*close).
    data[symbol].qfqday rows: [date, open, close, high, low, volume(手)]
    """
    symbol = f"{market}{code}"
    url = (
        "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
        f"?param={symbol},day,,,{days},qfq"
    )
    body = http_get(url, referer="https://gu.qq.com/")
    obj = json.loads(body)
    node = (obj.get("data") or {}).get(symbol) or {}
    rows = node.get("qfqday") or node.get("day") or []
    bars: list[dict] = []
    for row in rows:
        if len(row) < 6:
            continue
        try:
            bars.append(
                {
                    "date": row[0],
                    "open": round(float(row[1]), 4),
                    "close": round(float(row[2]), 4),
                    "high": round(float(row[3]), 4),
                    "low": round(float(row[4]), 4),
                    "volume": int(float(row[5])),
                    "amount": 0.0,
                }
            )
        except (ValueError, TypeError):
            continue
    return bars[-days:]


def fetch_flow_eastmoney(market: str, code: str, days: int = 70) -> list[dict]:
    """
    Eastmoney 主力資金 daily net inflow.
    klines rows: "date, 主力净流入(元), 小单, 中单, 大单, 超大单, 主力净占比%, ..."
      → field[1] = mainNet (元), field[6] = mainPct (%)
    """
    url = (
        "https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get"
        f"?secid={secid(market, code)}"
        "&fields1=f1,f2,f3,f7"
        "&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65"
        f"&klt=101&lmt={days}"
    )
    body = http_get(url, referer="https://data.eastmoney.com/")
    obj = json.loads(body)
    klines = (obj.get("data") or {}).get("klines") or []
    flow: list[dict] = []
    for row in klines:
        p = row.split(",")
        if len(p) < 7:
            continue
        try:
            flow.append(
                {
                    "date": p[0],
                    "mainNet": round(float(p[1]), 2),  # 元
                    "mainPct": round(float(p[6]), 2),  # %
                }
            )
        except (ValueError, TypeError):
            continue
    return flow[-days:]


def fetch_bars(market: str, code: str, days: int = 70) -> list[dict]:
    """Tencent primary (reliable via urllib); Eastmoney fallback (adds 成交額)."""
    try:
        bars = fetch_bars_tencent(market, code, days)
        if bars:
            return bars
        raise RuntimeError("tencent returned 0 bars")
    except Exception as e:  # noqa: BLE001
        print(f"    [tencent bars fail → eastmoney] {e}", file=sys.stderr)
        return fetch_bars_eastmoney(market, code, days)


def main() -> int:
    out = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tickers": {},
    }
    prev_data: dict = {}
    if DATA_FILE.exists():
        try:
            prev_data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            prev_data = {}
    prev_tickers = prev_data.get("tickers", {})

    failures = 0
    for t in TICKERS:
        try:
            bars = fetch_bars(t["market"], t["code"])
            try:
                flow = fetch_flow_eastmoney(t["market"], t["code"])
            except Exception as fe:  # noqa: BLE001 - flow is best-effort
                print(f"    [flow fail] {t['code']}: {fe}", file=sys.stderr)
                flow = prev_tickers.get(t["code"], {}).get("flow", [])
            print(
                f"  {t['code']:6s} {t['name']:7s} "
                f"{len(bars):3d} bars · {len(flow):3d} flow · "
                f"last={bars[-1]['date'] if bars else 'NONE'} "
                f"={bars[-1]['close'] if bars else '?'}",
                file=sys.stderr,
            )
            out["tickers"][t["code"]] = {**t, "bars": bars, "flow": flow}
        except Exception as e:  # noqa: BLE001
            print(f"  {t['code']:6s} {t['name']:7s} FAIL: {e}", file=sys.stderr)
            failures += 1
            # preserve previous data if available
            if t["code"] in prev_tickers:
                out["tickers"][t["code"]] = prev_tickers[t["code"]]
        time.sleep(1.2)  # gentle rate-limit hedge

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
