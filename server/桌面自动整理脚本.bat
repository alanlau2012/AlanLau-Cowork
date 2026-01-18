@echo off
chcp 65001 >nul
echo ==========================================
echo          桌面文件夹自动整理脚本
echo ==========================================
echo.

REM 设置桌面路径
set "DESKTOP=%USERPROFILE%\Desktop"

echo 正在创建目录结构...
REM 创建主要目录
mkdir "%DESKTOP%\01_AI研究与学习" 2>nul
mkdir "%DESKTOP%\01_AI研究与学习\AI-Native" 2>nul
mkdir "%DESKTOP%\01_AI研究与学习\AI工具" 2>nul
mkdir "%DESKTOP%\01_AI研究与学习\AI学习" 2>nul

mkdir "%DESKTOP%\02_Claude技术" 2>nul
mkdir "%DESKTOP%\02_Claude技术\Claude开发" 2>nul
mkdir "%DESKTOP%\02_Claude技术\Claude日志" 2>nul
mkdir "%DESKTOP%\02_Claude技术\Claude文档" 2>nul

mkdir "%DESKTOP%\03_个人项目" 2>nul
mkdir "%DESKTOP%\03_个人项目\前端项目" 2>nul
mkdir "%DESKTOP%\03_个人项目\实验项目" 2>nul

mkdir "%DESKTOP%\04_学习资料" 2>nul
mkdir "%DESKTOP%\04_学习资料\技术文档" 2>nul
mkdir "%DESKTOP%\04_学习资料\视频资料" 2>nul
mkdir "%DESKTOP%\04_学习资料\图片资料" 2>nul

mkdir "%DESKTOP%\05_工作与规划" 2>nul

mkdir "%DESKTOP%\06_应用程序" 2>nul

mkdir "%DESKTOP%\07_临时存储" 2>nul

echo 目录创建完成！
echo.

echo 开始整理文件...
echo.

REM 移动快捷方式
echo [1/10] 移动快捷方式文件...
move /Y "%DESKTOP%\*.lnk" "%DESKTOP%\06_应用程序\" 2>nul
echo   ✓ 完成

REM 清理重复的.mhtml文件
echo [2/10] 清理重复的.mhtml文件...
for %%f in ("%DESKTOP%\*.mhtml") do (
    set "filename=%%~nf"
    set "filename=!filename:.mhtml=!"
    if exist "%DESKTOP%\!filename!.md" (
        echo   发现重复文件: %%f → 已删除
        del "%%f" 2>nul
    )
)
echo   ✓ 完成

REM 移动AI相关文档
echo [3/10] 移动AI相关文档...
move /Y "%DESKTOP%\AI*.md" "%DESKTOP%\01_AI研究与学习\AI学习\" 2>nul
move /Y "%DESKTOP%\AI*.mhtml" "%DESKTOP%\01_AI研究与学习\AI学习\" 2>nul
move /Y "%DESKTOP%\ai-native*.html" "%DESKTOP%\01_AI研究与学习\AI-Native\" 2>nul
echo   ✓ 完成

REM 移动Claude相关文档
echo [4/10] 移动Claude相关文档...
move /Y "%DESKTOP%\claude*.md" "%DESKTOP%\02_Claude技术\Claude文档\" 2>nul
move /Y "%DESKTOP%\cursor*.md" "%DESKTOP%\02_Claude技术\Claude文档\" 2>nul
move /Y "%DESKTOP%\cursor*.png" "%DESKTOP%\02_Claude技术\Claude文档\" 2>nul
move /Y "%DESKTOP%\js执行*.png" "%DESKTOP%\02_Claude技术\Claude文档\" 2>nul
move /Y "%DESKTOP%\prompt*.html" "%DESKTOP%\02_Claude技术\Claude文档\" 2>nul
echo   ✓ 完成

REM 移动视频文件
echo [5/10] 移动视频文件...
move /Y "%DESKTOP%\*.mp4" "%DESKTOP%\04_学习资料\视频资料\" 2>nul
echo   ✓ 完成

REM 移动图片文件
echo [6/10] 移动图片文件...
move /Y "%DESKTOP%\*.png" "%DESKTOP%\04_学习资料\图片资料\" 2>nul
move /Y "%DESKTOP%\*.jpg" "%DESKTOP%\04_学习资料\图片资料\" 2>nul
echo   ✓ 完成

REM 移动项目文件夹
echo [7/10] 移动项目文件夹...
move /Y "%DESKTOP%\AI-Native流程" "%DESKTOP%\01_AI研究与学习\AI-Native\" 2>nul
move /Y "%DESKTOP%\AIskill" "%DESKTOP%\01_AI研究与学习\AI工具\" 2>nul
move /Y "%DESKTOP%\aiskills-minmax" "%DESKTOP%\01_AI研究与学习\AI工具\" 2>nul
move /Y "%DESKTOP%\AI工程学习APP" "%DESKTOP%\01_AI研究与学习\AI学习\" 2>nul
move /Y "%DESKTOP%\AI学习与考试" "%DESKTOP%\01_AI研究与学习\AI学习\" 2>nul

move /Y "%DESKTOP%\Claude logs" "%DESKTOP%\02_Claude技术\Claude日志\" 2>nul
move /Y "%DESKTOP%\claudeAgents" "%DESKTOP%\02_Claude技术\Claude开发\" 2>nul
move /Y "%DESKTOP%\claude-agent-sdk-python" "%DESKTOP%\02_Claude技术\Claude开发\" 2>nul
move /Y "%DESKTOP%\claudedoc" "%DESKTOP%\02_Claude技术\Claude开发\" 2>nul
move /Y "%DESKTOP%\claude-proxy" "%DESKTOP%\02_Claude技术\Claude开发\" 2>nul
move /Y "%DESKTOP%\codeagent" "%DESKTOP%\02_Claude技术\Claude开发\" 2>nul
move /Y "%DESKTOP%\chatbox" "%DESKTOP%\02_Claude技术\Claude日志\" 2>nul

move /Y "%DESKTOP%\electron" "%DESKTOP%\03_个人项目\前端项目\" 2>nul
move /Y "%DESKTOP%\ningning's-art-gallery" "%DESKTOP%\03_个人项目\前端项目\" 2>nul
move /Y "%DESKTOP%\刘佳宁的画廊" "%DESKTOP%\03_个人项目\前端项目\" 2>nul
move /Y "%DESKTOP%\刘佳宁识字" "%DESKTOP%\03_个人项目\前端项目\" 2>nul
move /Y "%DESKTOP%\christmas-tree" "%DESKTOP%\03_个人项目\前端项目\" 2>nul
move /Y "%DESKTOP%\chrismas-tree-AR-main" "%DESKTOP%\03_个人项目\实验项目\" 2>nul

move /Y "%DESKTOP%\gemini3test" "%DESKTOP%\03_个人项目\实验项目\" 2>nul
move /Y "%DESKTOP%\yinli" "%DESKTOP%\03_个人项目\实验项目\" 2>nul
move /Y "%DESKTOP%\playwright" "%DESKTOP%\03_个人项目\实验项目\" 2>nul
move /Y "%DESKTOP%\web2md" "%DESKTOP%\03_个人项目\实验项目\" 2>nul

move /Y "%DESKTOP%\deep research" "%DESKTOP%\04_学习资料\" 2>nul
move /Y "%DESKTOP%\llm.html" "%DESKTOP%\04_学习资料\技术文档\" 2>nul

echo   ✓ 完成

REM 移动工作文件
echo [8/10] 移动工作与规划文件...
move /Y "%DESKTOP%\HW-PPT" "%DESKTOP%\05_工作与规划\" 2>nul
move /Y "%DESKTOP%\cowork" "%DESKTOP%\05_工作与规划\" 2>nul
move /Y "%DESKTOP%\cowork.txt" "%DESKTOP%\05_工作与规划\" 2>nul
move /Y "%DESKTOP%\职业生涯规划" "%DESKTOP%\05_工作与规划\" 2>nul
echo   ✓ 完成

REM 移动临时文件
echo [9/10] 移动临时文件...
move /Y "%DESKTOP%\短期冲刺*" "%DESKTOP%\07_临时存储\" 2>nul
move /Y "%DESKTOP%\心得.txt" "%DESKTOP%\07_临时存储\" 2>nul
move /Y "%DESKTOP%\*.txt" "%DESKTOP%\07_临时存储\" 2>nul 2>&1
move /Y "%DESKTOP%\简单版*.md" "%DESKTOP%\04_学习资料\技术文档\" 2>nul
move /Y "%DESKTOP%\简单版*.pdf" "%DESKTOP%\04_学习资料\技术文档\" 2>nul
move /Y "%DESKTOP%\开源*.md" "%DESKTOP%\04_学习资料\技术文档\" 2>nul
move /Y "%DESKTOP%\开源*.pdf" "%DESKTOP%\04_学习资料\技术文档\" 2>nul
move /Y "%DESKTOP%\*.bat" "%DESKTOP%\07_临时存储\" 2>nul
move /Y "%DESKTOP%\*.pptx" "%DESKTOP%\05_工作与规划\" 2>nul
move /Y "%DESKTOP%\fatoumat7423*" "%DESKTOP%\07_临时存储\" 2>nul
echo   ✓ 完成

REM 移动其他剩余文件
echo [10/10] 移动其他文件...
move /Y "%DESKTOP%\桌面*.md" "%DESKTOP%\07_临时存储\" 2>nul
move /Y "%DESKTOP%\手动清理指南.md" "%DESKTOP%\07_临时存储\" 2>nul
move /Y "%DESKTOP%\AI原生组织和AI原生产品的研究：.md" "%DESKTOP%\01_AI研究与学习\AI学习\" 2>nul
echo   ✓ 完成

echo.
echo ==========================================
echo            整理完成！
echo ==========================================
echo.
echo 整理摘要：
echo   • 所有文件已按类型分类存放
echo   • 快捷方式 → 06_应用程序
echo   • AI相关 → 01_AI研究与学习
echo   • Claude相关 → 02_Claude技术
echo   • 个人项目 → 03_个人项目
echo   • 学习资料 → 04_学习资料
echo   • 工作文件 → 05_工作与规划
echo   • 临时文件 → 07_临时存储
echo.
echo 建议：
echo   1. 检查04_学习资料\视频资料中的屏幕录制文件，删除不需要的
echo   2. 定期清理07_临时存储中的文件
echo   3. 将重要文件备份到云盘
echo.
pause
