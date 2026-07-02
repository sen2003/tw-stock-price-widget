"""股票/指數代碼清單，供懸浮小工具的自動補全使用。

不依賴任何券商登入（不同於 `data/symbols.json`，那份只有連上永豐金 Shioaji
才會建立）。基礎資料是隨repo附的 `tw_symbols_static.json`（從證交所/櫃買中心
公開的 ISIN 代碼對照表整理，只保留一般股票與 ETF），保證不管使用者的 Fugle
方案有沒有開通清單功能都能查代號/名稱。若有 FUGLE_API_KEY，會額外嘗試抓
Fugle 自己的 `/intraday/tickers` 來補最新資料，抓不到就單純略過，不影響
靜態清單這個保底來源。
"""

import json
import logging
import threading
import time
from pathlib import Path

from ..config import get_settings

logger = logging.getLogger("fugle_symbols")

CACHE_TTL = 24 * 60 * 60  # 24 小時：股票/指數清單變動很慢，不需要頻繁重抓
STATIC_LIST_PATH = Path(__file__).parent / "tw_symbols_static.json"

# 指數的簡短名稱固定用這份（跟 backend/app/api/widget.py 的 _INDEX_NAMES 一致），
# 不管 Fugle 清單 API 抓到什麼官方全名都不能覆蓋掉，避免小工具/搜尋結果忽長忽短。
_PINNED_NAMES = {"IX0001": "加權指數", "IX0043": "櫃買指數"}

_lock = threading.Lock()
_rows: list[dict[str, str]] = []
_loaded_at = 0.0

# (market, type) 組合逐一嘗試；任一組合失敗只跳過，不影響其他組合。
_QUERIES = [
    {"market": "TSE", "type": "EQUITY"},
    {"market": "OTC", "type": "EQUITY"},
    {"market": "TSE", "type": "INDEX"},
    {"market": "OTC", "type": "INDEX"},
]


def _load_static_rows() -> list[dict[str, str]]:
    try:
        data = json.loads(STATIC_LIST_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        logger.exception("Failed to load static TW symbol list")
        return []
    return [{"code": row["code"], "name": row.get("name", "")} for row in data if isinstance(row, dict) and row.get("code")]


def _extract_rows(raw: object) -> list[dict[str, str]]:
    items = raw.get("data") if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return []
    out: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        code = str(item.get("symbol") or item.get("code") or "").strip()
        name = str(item.get("name") or "").strip()
        if code:
            out.append({"code": code, "name": name})
    return out


def _fetch_from_fugle() -> list[dict[str, str]]:
    from fugle_marketdata import RestClient  # noqa: PLC0415

    settings = get_settings()
    client = RestClient(api_key=settings.fugle_api_key)
    rows: dict[str, dict[str, str]] = {}
    for query in _QUERIES:
        try:
            raw = client.stock.intraday.tickers(**query)
        except Exception as exc:  # noqa: BLE001
            logger.warning("fugle tickers %s 失敗: %s", query, exc)
            continue
        for row in _extract_rows(raw):
            rows.setdefault(row["code"], row)
    return list(rows.values())


def _ensure_loaded() -> None:
    global _rows, _loaded_at
    now = time.monotonic()
    if _rows and now - _loaded_at < CACHE_TTL:
        return

    combined: dict[str, dict[str, str]] = {row["code"]: row for row in _load_static_rows()}

    if get_settings().fugle_api_key:
        for row in _fetch_from_fugle():
            # Fugle 的即時清單較新，名稱有值時可以覆蓋掉靜態清單的舊名稱。
            if row.get("name"):
                combined[row["code"]] = row
            else:
                combined.setdefault(row["code"], row)

    for code, name in _PINNED_NAMES.items():
        combined[code] = {"code": code, "name": name}

    if combined:
        _rows = list(combined.values())
        _loaded_at = now


def search_fugle_symbols(query: str, limit: int = 15) -> list[dict[str, str]]:
    with _lock:
        _ensure_loaded()
        rows = list(_rows)
    q = query.strip().upper()
    if not q:
        return []
    hits = [row for row in rows if row["code"].upper().startswith(q) or q in row["name"].upper() or q in row["code"].upper()]
    hits.sort(
        key=lambda row: (
            row["name"].upper() != q and row["code"].upper() != q,
            not row["code"].upper().startswith(q) and not row["name"].upper().startswith(q),
            row["code"],
        )
    )
    return hits[:limit]
