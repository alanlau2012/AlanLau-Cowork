@echo off
chcp 65001 >nul
title Claude Cowork - 停止服务

echo.
echo ========================================
echo   停止所有服务
echo ========================================
echo.

echo 正在停止 Electron 和 Node 进程...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe 2>nul

if errorlevel 1 (
    echo 没有运行中的服务进程
) else (
    echo 所有服务已停止
)

echo.
pause
