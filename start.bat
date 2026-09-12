@echo off
title 广州政务服务AI便民中枢 (Spring Boot 8080)

echo ================================================================
echo           广州政务服务 AI 便民中枢 - 快速启动向导
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/3] 检查运行环境...
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo 【错误】未检测到 Java 环境！请确保已安装 JDK 17 或以上版本并配置 PATH 环境变量。
    echo.
    pause
    exit /b 1
)

echo [2/3] 检查可执行程序包...
if not exist "target\spring-ai-alibaba-0.0.1-SNAPSHOT.jar" (
    echo 未发现已编译的 JAR 包，正在自动为您构建打包（初次可能需要1-2分钟）...
    call mvnw.cmd package -DskipTests
    if %errorlevel% neq 0 (
        echo 【错误】Maven 构建失败，请检查网络或配置！
        echo.
        pause
        exit /b 1
    )
)

echo [3/3] 检查端口 8080 状态...
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo 【提示】检测到 8080 端口已被占用，请先关闭已运行的旧进程。
    echo 如需强行结束占用端口的进程，请在任务管理器关闭对应 Java 进程后再运行。
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  正在启动 Spring Boot 服务...
echo  - 本地便民首页:    http://localhost:8080/
echo  - 政务事项接口:    http://localhost:8080/api/v1/gov/affairs
echo  - H2 数据库控制台: http://localhost:8080/h2-console
echo  - 提示: 保持本窗口打开；如需停止服务，直接关闭窗口或按 Ctrl+C
echo ================================================================
echo.

java -Dfile.encoding=UTF-8 -jar target\spring-ai-alibaba-0.0.1-SNAPSHOT.jar

if %errorlevel% neq 0 (
    echo.
    echo 【提示】服务已退出或启动失败。
    pause
)
