@echo off
setlocal EnableDelayedExpansion
title Collection Archive tools
rem Run everything from the repository root (one folder above tools\).
cd /d "%~dp0.."

set "PY=C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe"
if not exist "%PY%" set "PY=py"

:menu
echo.
echo  ================= COLLECTION ARCHIVE =================
echo   1  Start the local server and open the archive
echo   2  Check the data
echo   3  Make an archive image from a photo
echo   4  Organize folders (preview first)
echo   5  Open the NFC card printer
echo   6  Publish to GitHub (checks the data first)
echo   0  Quit
echo  ======================================================
set "choice="
set /p "choice=Choice: "
if "%choice%"=="1" goto server
if "%choice%"=="2" goto check
if "%choice%"=="3" goto image
if "%choice%"=="4" goto organize
if "%choice%"=="5" goto cards
if "%choice%"=="6" goto publish
if "%choice%"=="0" exit /b 0
echo Unknown choice.
goto menu

:server
call :start_server
start "" "http://localhost:8000/archive.html"
goto menu

:check
"%PY%" tools\check-data.py
goto menu

:image
set "photo="
set "itemid="
set "category="
set "force="
set /p "photo=Photo (drag the file into this window): "
if not defined photo goto menu
set "photo=%photo:"=%"
set /p "itemid=Archive ID (e.g. ZGMF-X10A-HGCE): "
if not defined itemid goto menu
set /p "category=Category [gundam]: "
if not defined category set "category=gundam"
set /p "force=Replace an existing image? [y/N]: "
set "forceflag="
if /i "%force%"=="y" set "forceflag=--force"
"%PY%" tools\new-image.py "%photo%" "%itemid%" --category %category% %forceflag%
goto menu

:organize
"%PY%" tools\organize-archive-folders.py --dry-run
set "go="
set /p "go=Apply these moves? [y/N]: "
if /i "%go%"=="y" "%PY%" tools\organize-archive-folders.py
goto menu

:cards
call :start_server
start "" "http://localhost:8000/tools/nfc-cards.html"
goto menu

:publish
"%PY%" tools\check-data.py
if errorlevel 1 (
  echo.
  echo Data check failed. Fix the FOUT lines first; nothing was published.
  goto menu
)
echo.
git status --short
echo.
set "go="
set /p "go=Publish ALL changes above to GitHub? [y/N]: "
if /i not "%go%"=="y" goto menu
set "msg="
set /p "msg=Short description of the change: "
if not defined msg set "msg=Update archive"
git add -A && git commit -m "%msg%" && git push
goto menu

:start_server
rem Opens the server in its own window, unless one is already running on 8000.
netstat -ano | findstr /r /c:":8000 .*LISTENING" >nul
if errorlevel 1 start "Archive server (close to stop)" "%PY%" -m http.server 8000
timeout /t 1 /nobreak >nul
exit /b 0
