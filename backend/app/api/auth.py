"""敏感端點的 API 金鑰驗證。

威脅模型：後端綁定 127.0.0.1，主要防的是「同機其他程序」。要求自訂標頭
X-API-Key 會強制瀏覽器走 CORS preflight（本專案沒開 CORS，本來就不接受瀏覽器
跨來源請求），同機程序則須先取得金鑰才能呼叫。

未設定 API_KEY 時一律拒絕（fail closed），避免誤以為端點已受保護。
"""

import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from ..config import get_settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(provided: str | None = Security(_api_key_header)) -> None:
    expected = get_settings().api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="伺服器尚未設定存取金鑰（API_KEY），敏感端點已停用。請在 .env 設定 API_KEY 後重新啟動程式。",
        )
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="存取金鑰不正確或未提供。",
        )
