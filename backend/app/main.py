from fastapi import FastAPI

from .api.widget import router as widget_router
from .config import get_settings

# 本機自用程式：關閉 /docs、/redoc、/openapi.json，不對外暴露端點地圖。
app = FastAPI(title="TW Stock Price Widget API", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/health")
def health() -> dict[str, object]:
    settings = get_settings()
    return {"status": "ok", "fugle_enabled": bool(settings.fugle_api_key)}


app.include_router(widget_router)
