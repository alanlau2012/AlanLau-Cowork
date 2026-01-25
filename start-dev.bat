@echo off
chcp 65001 >nul
title Claude Cowork - 开发模式启动

echo.
echo ========================================
echo   Claude Cowork - 开发模式
echo ========================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/3] 首次启动，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo 安装依赖失败！
        pause
        exit /b 1
    )
    echo.
)

REM 检查后端依赖
if not exist "server\node_modules" (
    echo [2/3] 正在安装后端依赖...
    cd server
    call npm install
    if errorlevel 1 (
        echo 安装后端依赖失败！
        pause
        exit /b 1
    )
    cd ..
    echo.
)

echo [3/3] 正在启动开发模式（带热重载）...
echo.
echo 后端服务器: http://localhost:3001
echo 按 Ctrl+C 停止所有服务
echo.

REM 启动开发模式
start "Backend Server" cmd /k "cd server && npm start"
timeout /t 2 /nobreak >nul
start "Electron App (Dev)" cmd /k "npm run dev"

echo.
echo 开发模式已启动！
echo.
