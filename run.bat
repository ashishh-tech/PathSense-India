@echo off
echo ============================================
echo   PathSense India - Road Quality Intelligence
echo   "Don't just navigate. Know your road."
echo ============================================
echo.

:: Check if Python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

:: Install backend dependencies
echo [1/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt --quiet
cd ..
echo      Done!
echo.

:: Start backend server
echo [2/3] Starting FastAPI backend on http://localhost:8000...
start "PathSense Backend" cmd /c "cd backend && python main.py"
timeout /t 3 /nobreak >nul
echo      Backend started!
echo.

:: Start frontend server
echo [3/3] Starting frontend on http://localhost:3000...
start "PathSense Frontend" cmd /c "npx -y serve frontend -l 3000"
timeout /t 3 /nobreak >nul
echo      Frontend started!
echo.

echo ============================================
echo   PathSense India is running!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo ============================================
echo.
echo   Press any key to open in browser...
pause >nul
start http://localhost:3000
