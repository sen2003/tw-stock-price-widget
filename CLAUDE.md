# CLAUDE.md

這是一個台股即時報價的懸浮桌面小工具，資料來源是 Fugle MarketData。**不含任何下單、券商連線或真實金錢風險**——純粹是一個唯讀的報價顯示工具，這點跟一般交易系統的專案不同，協助時不需要對「下單」相關的鐵則特別小心，但仍要遵守下列基本原則：

1. **絕不**印出或 commit 任何機密（`.env`、`API_KEY`、`FUGLE_API_KEY`）。`.env` 已在 `.gitignore` 排除，只有 `.env.example` 範本進版本控制。
2. **本機安全**：後端只綁 `127.0.0.1`，不要改成 `0.0.0.0` 或以任何方式對外暴露。
3. 富果（Fugle）的免費方案有請求額度限制（常見 60 次/分鐘），修改報價更新頻率或監看檔數上限時，要提醒使用者注意額度。

## 架構

```
widget/     Electron + React + TypeScript 桌面應用程式
  electron/   主行程（main.ts 建視窗、控制滑鼠穿透/watchdog；preload.ts 曝露 IPC；env.ts 讀 API_KEY；state.ts 讀寫本機設定檔）
  src/        Renderer（React），App.tsx 是主要邏輯（hover 偵測、輪詢報價、狀態管理）

backend/    FastAPI 後端，只做兩件事：
  app/api/widget.py              GET /api/widget/quotes、GET /api/widget/symbols/search
  app/brokers/fugle_client.py    Fugle MarketData REST/WebSocket 轉接層
  app/market_data/fugle_symbols.py + tw_symbols_static.json   代號/名稱搜尋（本地靜態清單 + Fugle 清單 API 補充，兩者擇優）
```

後端**刻意**不含任何券商 SDK 或下單邏輯——`/api/widget/quotes` 直接呼叫 `get_fugle().get_quote()`，不經過任何登入/連線檢查。

## 已知的技術細節（踩過的坑）

- **Electron 點擊穿透**：`setIgnoreMouseEvents(true, {forward:true})` 搭配 renderer 端用 `mousemove` 座標做 hit-test（不是 `mouseenter`/`mouseleave`，那個在 forwarded 事件下不可靠）。但游標往視窗左上角外移動時完全收不到事件（因為已經離開視窗矩形），所以 `electron/main.ts` 額外有一個主行程輪詢 `screen.getCursorScreenPoint()` 的 watchdog 當保險。
- **Fugle 清單 API（`intraday/tickers`）行為因帳號方案而異**：免費方案常回空陣列或 403。自動補全因此有 `tw_symbols_static.json`（從證交所/櫃買中心公開 ISIN 資料整理，UTF-8）當保底來源，不完全依賴 Fugle 帳號權限。
- **指數名稱固定簡短版**：`IX0001`/`IX0043` 的顯示名稱在 `backend/app/api/widget.py` 跟 `fugle_symbols.py` 都各自寫死一份（`加權指數`/`櫃買指數`），故意不用 Fugle 回傳的官方全名（太長會撐爆版面）。改名稱時兩處要一起改。
- **API_KEY 讀取**：Electron 主行程（`electron/env.ts`）直接讀根目錄 `.env` 的 `API_KEY`，跟後端 `backend/app/config.py` 讀同一個值，沒有中間層或自動產生機制——這點跟原始的完整交易系統專案不同（那邊有 `frontend/.env` 同步機制，這個獨立小工具沒有對應的前端，故簡化掉了）。

## 開發

```bash
cd widget && npm run dev   # renderer 熱重載 + electron
```

改完 TypeScript 記得跑 `npx tsc -b`（renderer）跟 `npx tsc -p tsconfig.electron.json`（主行程/preload）確認型別正確，再 `npx vite build`。

Python 端沒有測試套件，手動用 `curl` 打 `/api/health`、`/api/widget/quotes`、`/api/widget/symbols/search` 驗證即可。
