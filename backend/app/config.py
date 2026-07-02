from functools import lru_cache
from pathlib import Path
import os


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]


def load_env(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


class Settings:
    def __init__(self) -> None:
        load_env(PROJECT_ROOT / ".env")
        self.project_root = PROJECT_ROOT
        self.backend_root = BACKEND_ROOT
        self.data_dir = PROJECT_ROOT / "data"
        # 本機 API 存取金鑰：保護 /api/widget/quotes 等端點。未設定時一律拒絕
        # （fail closed），避免誤以為端點已受保護。用
        # `python -c "import secrets;print(secrets.token_urlsafe(32))"` 產生。
        self.api_key = os.getenv("API_KEY", "").strip()
        # 富果 Fugle MarketData 報價金鑰。申請：https://developer.fugle.tw/
        self.fugle_api_key = os.getenv("FUGLE_API_KEY", "").strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()
