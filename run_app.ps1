# Run AI Emergency Resource Locator
# This script starts both the Python FastAPI backend and the React Vite frontend.

Write-Host "Starting AI Emergency Resource Locator..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "Starting Backend (Port 8000)..." -ForegroundColor Yellow
$backendCmd = "Set-Location -Path `"backend`"; & `".\venv\Scripts\python.exe`" -m uvicorn main:app --reload --port 8000"
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-Command `"$backendCmd`""

# Wait briefly for backend to begin spinning up
Start-Sleep -Seconds 3

# 2. Start Frontend
Write-Host "Starting Frontend (Port 5173)..." -ForegroundColor Yellow
$frontendCmd = "Set-Location -Path `"frontend`"; npm run dev"
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-Command `"$frontendCmd`""

# Wait briefly for frontend to spin up
Start-Sleep -Seconds 3

# 3. Open Browser
Write-Host "Opening http://localhost:5173 in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "Both servers are running in the background. Close this PowerShell window to stop the visible script, though the child processes might remain running depending on your PowerShell configuration." -ForegroundColor Magenta
Write-Host "To stop them cleanly later, you can run: Stop-Process -Name node,python -ErrorAction SilentlyContinue" -ForegroundColor Gray

# Keep this window open so user can see logs if they run it interactively
Wait-Event
