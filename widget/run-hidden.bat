@echo off
cd /d "%~dp0"
npm start >> ..\logs\widget.log 2>&1
