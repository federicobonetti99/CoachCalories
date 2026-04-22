@echo off
echo Avvio del progetto MEVN...

:: 1. Avvio del Database (Docker)
echo Avvio del container MongoDB...
start "DOCKER-DB" cmd /k "cd backend/db && docker compose up"

:: Attesa per dare tempo al DB di inizializzarsi
timeout /t 5

:: 2. Avvio del Backend (Node.js)
echo Avvio del server Node.js...
start "NODE-BACKEND" cmd /k "cd backend && npm install && node ."

:: 3. Avvio del Frontend (Vue.js)
echo Avvio del frontend Vue...
start "VUE-FRONTEND" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Tutte le componenti sono in fase di avvio!
pause