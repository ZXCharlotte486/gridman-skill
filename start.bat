@echo off
chcp 65001 >nul
title Gridman Console
echo.
echo   Gridman Console - Starting...
echo.

:: 找到 manifest.json 所在目录作为服务根
:: 优先用同目录，其次用 user-data
if exist "%~dp0manifest.json" (
    set "ROOT=%~dp0"
) else if exist "%~dp0..\user-data\manifest.json" (
    set "ROOT=%~dp0..\user-data\"
) else (
    set "ROOT=%~dp0"
)

:: 确保 console.html 在服务根目录
if not exist "%ROOT%console.html" (
    if exist "%~dp0console.html" (
        copy "%~dp0console.html" "%ROOT%console.html" >nul
    )
)

echo   Root: %ROOT%
echo   URL:  http://localhost:3721/console.html
echo.
echo   Press Ctrl+C to stop.
echo.

:: 启动浏览器
start "" "http://localhost:3721/console.html"

:: 启动轻量 HTTP 服务器（用 Node.js 单文件，不依赖 python）
node "%~dp0bin\serve.js" "%ROOT%"
