@echo off
setlocal
cd /d "%~dp0"
python --version >nul 2>&1
if not errorlevel 1 (
  start "Serveur local MGP" /min python -m http.server 8766 --bind 127.0.0.1
  goto open_dashboard
)
py -3 --version >nul 2>&1
if not errorlevel 1 (
  start "Serveur local MGP" /min py -3 -m http.server 8766 --bind 127.0.0.1
  goto open_dashboard
)
echo Python n'a pas ete detecte par ce lanceur.
echo Ouvrez CMD dans ce dossier et executez : python --version
pause
exit /b 1
:open_dashboard
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8766/Tableau_de_bord_MGP.html"
endlocal
