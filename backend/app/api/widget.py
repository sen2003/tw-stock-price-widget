"""懸浮小工具（Electron）專用端點：純走 Fugle 行情，不需要登入任何券商。"""

from fastapi import APIRouter, Depends, Query

from .auth import require_api_key
from ..brokers.fugle_client import get_fugle
from ..market_data.fugle_symbols import search_fugle_symbols
from ..trading.schemas import WidgetQuote

router = APIRouter(prefix="/api/widget")

# 指數代碼是富果自訂編號，不是證交所/櫃買中心的正式 ISIN 代號，這裡手動列出
# 目前小工具用到的兩個，只做名稱 fallback／固定簡短顯示名稱用。
_INDEX_NAMES = {
    "IX0001": "加權指數",
    "IX0043": "櫃買指數",
}


def _to_widget_quote(symbol: str, quote) -> WidgetQuote:
    if quote is None:
        return WidgetQuote(symbol=symbol, name=_INDEX_NAMES.get(symbol, ""))
    change = None
    change_percent = None
    if quote.deal_price is not None and quote.prev_close:
        change = quote.deal_price - quote.prev_close
        change_percent = (change / quote.prev_close) * 100
    return WidgetQuote(
        symbol=symbol,
        # 指數優先用專案自己的簡短名稱（如「加權指數」），Fugle 對指數回傳的官方
        # 全名（如「發行量加權股價指數」）太長，會把小工具徽章撐爆。
        name=_INDEX_NAMES.get(symbol) or quote.name,
        deal_price=quote.deal_price,
        prev_close=quote.prev_close,
        change=change,
        change_percent=change_percent,
        total_volume=quote.total_volume,
        source=quote.source,
    )


@router.get("/quotes", dependencies=[Depends(require_api_key)])
def widget_quotes(symbols: str = Query(..., min_length=1)) -> dict[str, object]:
    fugle = get_fugle()
    selected = [item.strip().upper() for item in symbols.split(",") if item.strip()]
    if not fugle.enabled:
        return {"fugle_enabled": False, "quotes": []}
    quotes = [_to_widget_quote(symbol, fugle.get_quote(symbol)) for symbol in selected]
    return {
        "fugle_enabled": True,
        "quotes": [quote.model_dump() for quote in quotes],
        "rate_limited": fugle.is_rate_limited
    }


@router.get("/symbols/search")
def widget_symbols_search(q: str = Query(..., min_length=1), limit: int = Query(default=15, le=50)) -> list[dict[str, str]]:
    return search_fugle_symbols(q, limit)
