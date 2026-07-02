#!/bin/bash
# 關閉懸浮股價小工具（只關 Electron，不會動到後端）。要連後端一起關，
# 另外查 8000 埠的 PID 用 taskkill 處理。
#
# 跟 widget/start.sh 一樣是給 Windows + Git Bash 環境用的（用 taskkill）。
# macOS/Linux 使用者請直接用 npm start / npm run dev 手動啟停（見 README）。
set -uo pipefail

echo "==> 關閉小工具 (electron.exe)..."
taskkill //IM electron.exe //F 2>&1 || true

echo "==> 已停止。"
