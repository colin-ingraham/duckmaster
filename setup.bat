@echo off
echo.
echo ============================================
echo    DM Table Game - Setup Script
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully!
echo.

REM Check for .env file
if not exist ".env" (
    echo [WARNING] No .env file found!
    echo.
    set /p has_key="Do you have an Anthropic API key? (y/n): "
    
    if /i "%has_key%"=="y" (
        set /p api_key="Enter your API key: "
        echo REACT_APP_ANTHROPIC_API_KEY=!api_key! > .env
        echo [OK] .env file created!
    ) else (
        echo.
        echo Please get an API key from: https://console.anthropic.com/
        echo Then create a .env file with:
        echo REACT_APP_ANTHROPIC_API_KEY=your_key_here
        copy .env.example .env
        echo.
        echo [WARNING] Created .env file - please edit it with your API key
    )
) else (
    echo [OK] .env file already exists
)

echo.
echo ============================================
echo    Setup complete!
echo ============================================
echo.
echo To start the game, run:
echo   npm start
echo.
pause
