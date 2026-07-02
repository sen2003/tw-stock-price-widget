#!/bin/bash
# 啟動懸浮股價小工具（Electron）。需要後端 (127.0.0.1:8000) 一起跑才有報價可看，
# 若偵測到後端還沒啟動會一併幫忙啟動。
#
# 注意：這支腳本是給 Windows + Git Bash 環境用的（用 taskkill/netstat），
# 跟專案原本 scripts/dev.sh、scripts/stop.sh（給 macOS/Linux、用 lsof）是分開的一組。
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIDGET="$ROOT/widget"
mkdir -p "$ROOT/logs"

echo "==> 檢查後端 (127.0.0.1:8000)..."
if curl -s -o /dev/null -w "" "http://127.0.0.1:8000/api/health" 2>/dev/null; then
  echo "    後端已在跑，略過。"
else
  echo "    後端沒在跑，啟動中 -> logs/uvicorn.log"
  cd "$ROOT"
  nohup "$ROOT/.venv/Scripts/python.exe" -m uvicorn backend.app.main:app \
    --host 127.0.0.1 --port 8000 \
    >> "$ROOT/logs/uvicorn.log" 2>&1 &
  disown
  sleep 3
fi

echo "==> 清除舊的 electron.exe 程序（避免開出重複視窗）..."
taskkill //IM electron.exe //F >/dev/null 2>&1 || true
sleep 1

echo "==> 啟動小工具 -> logs/widget.log"
# 用 PowerShell Start-Process 開一個完全獨立的行程，不透過 bash 的 nohup/disown。
# 原因：這支腳本本身是被工具呼叫執行的子行程，直接用 nohup 背景執行的話，
# npm/electron 還是掛在這次工具呼叫的行程樹底下，呼叫一結束整棵樹會被一起清掉；
# Start-Process 開出來的行程則完全獨立於呼叫者，才能撐過腳本執行完畢之後。
WIDGET_WIN="$(cd "$WIDGET" && pwd -W)"
powershell.exe -NoProfile -Command "Start-Process -FilePath '$WIDGET_WIN\\run-hidden.bat' -WindowStyle Hidden" >/dev/null 2>&1

echo "==> 完成。小工具應該會出現在螢幕右上角（等個幾秒讓 Electron 啟動）。"
