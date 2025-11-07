@echo off
REM =========================================
REM J'MONIC ENTERPRISE - Simplified Client Setup
REM One-Click Installation & Database Setup
REM =========================================

setlocal enabledelayedexpansion
color 0A
cls

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   J'MONIC ENTERPRISE - CLIENT SETUP WIZARD               ║
echo ║   Automated Installation & Configuration                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: This setup requires Administrator privileges
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [*] Starting J'MONIC Setup...
echo.

REM =========================================
REM STEP 1: Check PHP Installation
REM =========================================
echo [STEP 1/5] Checking PHP...

php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] PHP not found. Installing...
    echo.
    
    REM Try to detect PHP in common locations
    if exist "C:\PHP\php.exe" (
        echo [+] PHP found at C:\PHP
        set "PHP_PATH=C:\PHP"
    ) else if exist "C:\Program Files\PHP\php.exe" (
        echo [+] PHP found at C:\Program Files\PHP
        set "PHP_PATH=C:\Program Files\PHP"
    ) else (
        echo [!] PHP installation needed
        echo.
        echo Please download PHP from: https://www.php.net/downloads
        echo 1. Download "Windows binaries - Non-Thread Safe"
        echo 2. Extract to: C:\PHP
        echo 3. Add to PATH
        echo 4. Run this setup again
        echo.
        pause
        exit /b 1
    )
) else (
    echo [+] PHP is installed
    php -v | findstr /R "PHP"
)
echo.

REM =========================================
REM STEP 2: Check MySQL Installation
REM =========================================
echo [STEP 2/5] Checking MySQL...

mysql -u root -p -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    mysql -u root -e "SELECT 1;" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] MySQL not found or not running
        echo.
        echo Solutions:
        echo 1. Start MySQL service:
        echo    - Press Win+R, type: services.msc
        echo    - Find MySQL, right-click, select Start
        echo 2. If not installed, download from:
        echo    https://dev.mysql.com/downloads/mysql/
        echo 3. Run this setup again after starting MySQL
        echo.
        pause
        exit /b 1
    )
)

echo [+] MySQL is running
echo.

REM =========================================
REM STEP 3: Copy J'MONIC Files
REM =========================================
echo [STEP 3/5] Setting up J'MONIC files...

if not exist "C:\JMONIC-ENTERPRISE" (
    echo [!] J'MONIC files not found at C:\JMONIC-ENTERPRISE
    echo.
    echo This setup expects the files to be at: C:\JMONIC-ENTERPRISE
    echo Please copy the files there first, then run this setup again.
    echo.
    pause
    exit /b 1
)

echo [+] J'MONIC files found
echo.

REM =========================================
REM STEP 4: Create Database
REM =========================================
echo [STEP 4/5] Creating database...

mysql -u root -e "DROP DATABASE IF EXISTS jmonic;" >nul 2>&1

cd /d C:\JMONIC-ENTERPRISE\dashboard

mysql -u root < database_setup.sql >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Database creation failed
    echo.
    echo This might mean:
    echo 1. MySQL password is not empty
    echo 2. Database already exists with locked access
    echo.
    echo Try manually:
    echo   mysql -u root -p < C:\JMONIC-ENTERPRISE\dashboard\database_setup.sql
    echo.
    pause
    exit /b 1
)

echo [+] Database created successfully
echo.

REM =========================================
REM STEP 5: Create Desktop Shortcut
REM =========================================
echo [STEP 5/5] Creating desktop shortcut...

set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\J'MONIC Dashboard.lnk"
set "TARGET=C:\JMONIC-ENTERPRISE\START_JMONIC.bat"
set "ICON=C:\JMONIC-ENTERPRISE\dashboard\favicon.ico"

powershell -Command "^
$DesktopPath = '%DESKTOP%'; ^
$ShortcutPath = '%SHORTCUT%'; ^
$TargetPath = '%TARGET%'; ^
$IconPath = '%ICON%'; ^
$WshShell = New-Object -ComObject WScript.Shell; ^
$Shortcut = $WshShell.CreateShortcut($ShortcutPath); ^
$Shortcut.TargetPath = $TargetPath; ^
$Shortcut.WorkingDirectory = 'C:\JMONIC-ENTERPRISE'; ^
if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath; } ^
$Shortcut.Save();
" >nul 2>&1

if %errorlevel% neq 0 (
    echo [!] Could not create desktop shortcut
    echo [*] You can create it manually:
    echo    1. Navigate to C:\JMONIC-ENTERPRISE
    echo    2. Right-click START_JMONIC.bat
    echo    3. Send to Desktop (create shortcut)
) else (
    echo [+] Desktop shortcut created
)

echo.

REM =========================================
REM COMPLETION
REM =========================================
cls
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ✓ SETUP COMPLETE!                                      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo What's Next:
echo.
echo 1. Look for "J'MONIC Dashboard" icon on your Desktop
echo.
echo 2. Double-click it to start the system:
echo    - Dashboard will open in browser automatically
echo    - Takes 2-3 seconds to load
echo.
echo 3. Start using:
echo    - Add products
echo    - Record sales
echo    - View reports
echo    - All data is saved automatically
echo.
echo ───────────────────────────────────────────────────────────
echo.
echo Questions?
echo See: C:\JMONIC-ENTERPRISE\CLIENT_DESKTOP_ACCESS_COMPLETE.md
echo.
echo ───────────────────────────────────────────────────────────
echo.

pause

REM Open dashboard automatically
start http://localhost:8000
