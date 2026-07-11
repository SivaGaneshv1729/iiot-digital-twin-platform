# Start Docker Containers
Write-Host "Starting Docker Containers (PostgreSQL & Redis)..."
docker-compose up -d

# Start AI Service in a new window
Write-Host "Starting AI Service..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd ai-service; .\venv\Scripts\activate; uvicorn main:app --reload --port 8000`""

# Start API Gateway in a new window
Write-Host "Starting API Gateway..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd api-gateway; npm run dev`""

# Start Frontend in a new window
Write-Host "Starting Frontend..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host "All services started! Check the newly opened windows."
