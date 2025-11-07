@echo off
REM =========================================
REM J'MONIC ENTERPRISE - Complete Setup
REM Everything included, no downloads needed!
REM =========================================

setlocal enabledelayedexpansion
color 0A
cls

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   J'MONIC ENTERPRISE - AUTOMATIC SETUP                  ║
echo ║                                                           ║
echo ║   Everything is ready to go!                             ║
echo ║   Just click and use.                                    ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] This needs Administrator access
    echo.
    echo Right-click this file and select:
    echo "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Setting up J'MONIC on your computer...
echo.

REM Get current directory
set "SETUP_DIR=%~dp0"
set "DASHBOARD_DIR=%SETUP_DIR%dashboard"
set "DB_FILE=%SETUP_DIR%jmonic.db"

REM =========================================
REM Check if PHP exists in folder
REM =========================================
echo [STEP 1/4] Checking PHP...

if exist "%SETUP_DIR%php\php.exe" (
    echo [+] PHP found locally
    set "PHP_CMD=%SETUP_DIR%php\php.exe"
) else if exist "C:\PHP\php.exe" (
    echo [+] PHP found on system
    set "PHP_CMD=C:\PHP\php.exe"
) else (
    php -v >nul 2>&1
    if !errorlevel! equ 0 (
        echo [+] PHP is installed
        set "PHP_CMD=php"
    ) else (
        echo [!] ERROR: PHP not found
        echo.
        echo PHP must be in one of these places:
        echo   1. In this folder: php\
        echo   2. System: C:\PHP\
        echo   3. System PATH
        echo.
        echo Download from: https://www.php.net/downloads
        echo (Windows binaries - Non-Thread Safe)
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [STEP 2/4] Checking database...

REM Check for SQLite database
if exist "%DB_FILE%" (
    echo [+] Database found
) else (
    echo [*] Creating database...
    
    REM Use SQLite if available, or create MySQL setup
    if exist "%SETUP_DIR%sqlite3.exe" (
        echo [+] Using SQLite database
        
        REM Import SQLite schema if it exists
        if exist "%SETUP_DIR%database_setup_sqlite.sql" (
            "%SETUP_DIR%sqlite3.exe" "%DB_FILE%" < "%SETUP_DIR%database_setup_sqlite.sql"
        )
    ) else (
        echo [+] Using MySQL database
        
        REM Try to start MySQL if available
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS jmonic;" >nul 2>&1
        
        if exist "%DASHBOARD_DIR%\database_setup.sql" (
            mysql -u root < "%DASHBOARD_DIR%\database_setup.sql" >nul 2>&1
        )
    )
)

echo.
echo [STEP 3/4] Setting up files...

if not exist "%DASHBOARD_DIR%" (
    echo [!] Dashboard folder not found
    pause
    exit /b 1
)

echo [+] Files ready
echo.

echo [STEP 4/4] Creating desktop shortcut...

set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\J'MONIC Dashboard.lnk"
set "TARGET=%SETUP_DIR%START_JMONIC.bat"

powershell -Command "^
$DesktopPath = '%DESKTOP%'; ^
$ShortcutPath = '%SHORTCUT%'; ^
$TargetPath = '%TARGET%'; ^
$WshShell = New-Object -ComObject WScript.Shell; ^
$Shortcut = $WshShell.CreateShortcut($ShortcutPath); ^
$Shortcut.TargetPath = $TargetPath; ^
$Shortcut.WorkingDirectory = '%SETUP_DIR%'; ^
$Shortcut.Save();
" >nul 2>&1

if %errorlevel% neq 0 (
    echo [*] Could not auto-create shortcut
    echo [*] But you can still use the dashboard!
) else (
    echo [+] Shortcut created on desktop
)

echo.
echo.
cls
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   ✓ ALL SET UP!                                          ║
echo ║                                                           ║
echo ║   Your J'MONIC Dashboard is ready to use                ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo.
echo   WHAT TO DO NOW:
echo.
echo   1. Look on your Desktop for: "J'MONIC Dashboard"
echo.
echo   2. Double-click it to open
echo.
echo   3. The dashboard opens in your browser
echo.
echo   4. Start using it:
echo      - Add products
echo      - Record sales
echo      - View reports
echo      - Everything auto-saves
echo.
echo.
echo   Questions? See: README.md in this folder
echo.
echo ╔═══════════════════════════════════════════════════════════╝
echo.

REM Optional: auto-open dashboard
REM Uncomment the next line if you want it to open automatically
REM start http://localhost:8000

pause
