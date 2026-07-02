from pydantic import BaseModel


class QuoteResponse(BaseModel):
    market: str
    symbol: str
    name: str = ""
    deal_price: float | None = None
    prev_close: float | None = None
    bid_price: float | None = None
    ask_price: float | None = None
    open_price: float | None = None
    high_price: float | None = None
    low_price: float | None = None
    total_volume: int | None = None
    bid_volume: int | None = None
    ask_volume: int | None = None
    up_limit: float | None = None
    down_limit: float | None = None
    source: str


class TickRecord(BaseModel):
    symbol: str
    serial: int = 0
    time: str
    bid_price: float | None = None
    ask_price: float | None = None
    deal_price: float | None = None
    volume: int = 0
    in_out: str = ""


class KLinePoint(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class WidgetQuote(BaseModel):
    symbol: str
    name: str = ""
    deal_price: float | None = None
    prev_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    total_volume: int | None = None
    source: str = ""
