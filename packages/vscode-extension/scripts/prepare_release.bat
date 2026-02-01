@echo off
setlocal

if "%~1"=="" (
    set /p NEW_VERSION="Enter new version (e.g. 1.0.1): "
) else (
    set NEW_VERSION=%~1
)

if "%NEW_VERSION%"=="" (
    echo Version is required.
    exit /b 1
)

echo Preparing release for version: %NEW_VERSION%

REM Create and checkout release branch
git checkout -b release/v%NEW_VERSION%
if %errorlevel% neq 0 (
    echo Failed to create branch release/v%NEW_VERSION%
    exit /b %errorlevel%
)

REM Bump version in package.json without git tag
call npm version %NEW_VERSION% --no-git-tag-version
if %errorlevel% neq 0 (
    echo Failed to update package.json version
    exit /b %errorlevel%
)

REM Commit changes
git commit -am "Bump version to %NEW_VERSION%"
if %errorlevel% neq 0 (
    echo Failed to commit changes
    exit /b %errorlevel%
)

echo Release preparation complete.
echo Branch: release/v%NEW_VERSION%
echo Please verify changes and push the branch.
echo   git push origin release/v%NEW_VERSION%
