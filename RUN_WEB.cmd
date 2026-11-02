@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is required by the new automatic gallery indexer.
  pause
  exit /b 1
)
where py >nul 2>&1
if errorlevel 1 (
  python scripts\serve_gallery_auto.py --port 8080
) else (
  py -3 scripts\serve_gallery_auto.py --port 8080
)
if errorlevel 1 (
  echo ERROR: Could not start the website or gallery indexer.
  pause
  exit /b 1
)
