@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if errorlevel 1 exit /b 1
where node >nul 2>nul || (echo ERROR: Node.js is not installed or not on PATH. & exit /b 1)
where git >nul 2>nul || (echo ERROR: Git is not installed or not on PATH. & exit /b 1)
set "SITE_URL=https://amanibluesky.com"
echo.
echo [1/5] Build site and publish gallery paths into dist...
call npm run build || exit /b 1
echo.
echo [2/5] Validate deployment and Property 10 image files...
call npm run check:deploy || exit /b 1
node scripts/verify-property-010.mjs || exit /b 1
echo.
echo [3/5] Stage ALL added, changed and removed tracked/unignored files...
git add -A || exit /b 1
echo.
echo [4/5] Review staged changes...
git status --short || exit /b 1
git diff --cached --quiet
if not errorlevel 1 (
  echo No uncommitted changes to commit.
) else (
  git commit -m "Synchronize Property 010 gallery and all pending website changes" || exit /b 1
)
echo.
echo [5/5] Verify Git status...
git status -sb || exit /b 1
echo.
echo Finished locally. To publish run: git push origin main
exit /b 0
