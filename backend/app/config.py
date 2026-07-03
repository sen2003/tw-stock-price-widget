from functools import lru_cache
from pathlib import Path
import os


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def load_env(path: Path) -> dict[str, str]:
    """解析 .env 成一個字典直接回傳，刻意不寫進 os.environ——避免 API_KEY／
    FUGLE_API_KEY 這種機密出現在這個行程的環境變數區塊裡（Process Explorer
    之類的工具可以直接看到別的行程的環境變數）。"""
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


class Settings:
    def __init__(self) -> None:
        env_values = load_env(PROJECT_ROOT / ".env")
        self.project_root = PROJECT_ROOT
        self.backend_root = BACKEND_ROOT
        self.data_dir = PROJECT_ROOT / "data"
        # 本機 API 存取金鑰：保護 /api/widget/quotes 等端點。未設定時一律拒絕
        # （fail closed），避免誤以為端點已受保護。用
        # `python -c "import secrets;print(secrets.token_urlsafe(32))"` 產生。
        # 優先讀 .env，讀不到才退回真正的環境變數（例如部署時直接 export，
        # 不透過 .env 檔案的情境）。
        self.api_key = env_values.get("API_KEY", os.getenv("API_KEY", "")).strip()
        # 富果 Fugle MarketData 報價金鑰。申請：https://developer.fugle.tw/
        self.fugle_api_key = env_values.get("FUGLE_API_KEY", os.getenv("FUGLE_API_KEY", "")).strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()
