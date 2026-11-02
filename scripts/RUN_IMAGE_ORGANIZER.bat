@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo   RENTAL PROPERTY IMAGE ORGANIZER
 echo ================================================
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 -c "from PIL import Image" >nul 2>nul
    if errorlevel 1 py -3 -m pip install Pillow
    py -3 "%~dp0process_property_images.py" %*
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python 3 not found. Install Python and add it to PATH.
        pause
        exit /b 1
    )
    python -c "from PIL import Image" >nul 2>nul
    if errorlevel 1 python -m pip install Pillow
    python "%~dp0process_property_images.py" %*
)
echo.
if errorlevel 1 echo There were errors; see messages above.
pause
endlocal
