#!/bin/bash
# 關閉懸浮股價小工具（只關 Electron，不會動到後端/前端，因為後端也給主要的
# 交易介面用）。要連後端一起關，另外用 taskkill 處理 uvicorn 的 PID。
set -uo pipefail

echo "==> 關閉小工具 (electron.exe)..."
taskkill //IM electron.exe //F 2>&1 || true

echo "==> 已停止。"
