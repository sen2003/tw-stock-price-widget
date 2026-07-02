#!/bin/bash
# 關閉懸浮股價小工具（Electron）以及它依賴的後端 (127.0.0.1:8000)。
#
# 跟 widget/start.sh 一樣是給 Windows + Git Bash 環境用的（用 taskkill）。
# macOS/Linux 使用者請直接用 npm start / npm run dev 手動啟停（見 README）。
set -uo pipefail

echo "==> 關閉小工具 (electron.exe)..."
taskkill //IM electron.exe //F 2>&1 || true

echo "==> 關閉後端 (127.0.0.1:8000)..."
PIDS=$(netstat -ano | grep ":8000" | grep LISTENING | awk '{print $NF}' | sort -u)
if [ -z "$PIDS" ]; then
  echo "    port 8000 目前沒有程序在跑，略過。"
else
  for PID in $PIDS; do
    echo "    關閉 PID $PID..."
    taskkill //PID "$PID" //F 2>&1 || true
  done
fi

echo "==> 已停止。"
