@echo off
chcp 65001 >nul
title Claude Cowork - 重装依赖

echo.
echo ========================================
echo   重装所有依赖
echo ========================================
echo.

echo 正在停止所有进程...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [1/3] 清理旧依赖...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json
if exist server\node_modules rmdir /s /q server\node_modules
if exist server\package-lock.json del /q server\package-lock.json

echo.
echo [2/3] 安装主应用依赖...
call npm install
if errorlevel 1 (
    echo 安装失败！
    pause
    exit /b 1
)

echo.
echo [3/3] 安装后端依赖...
cd server
call npm install
if errorlevel 1 (
    echo 安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   依赖安装完成！
echo ========================================
echo.
echo 现在可以运行 start.bat 启动服务
echo.
pause
