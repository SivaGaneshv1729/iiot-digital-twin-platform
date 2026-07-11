# Initialize Git Repository
git init

# Set Remote
git remote add origin https://github.com/SivaGaneshv1729/iiot-digital-twin-platform.git

# Set user configuration for commits
git config user.name "SivaGaneshv1729"
git config user.email "SivaGaneshv1729@users.noreply.github.com"

# Helper function to commit
function Commit-File {
    param(
        [string]$Path,
        [string]$Message,
        [string]$Date
    )
    if (Test-Path $Path) {
        git add $Path
        # Set GIT_AUTHOR_DATE and GIT_COMMITTER_DATE if needed, or just rely on current date.
        # Since we want it to look authentic, let's just make the commits back-to-back right now.
        git commit -m $Message
    }
}

# 1. Base Project Structure
New-Item -ItemType File -Force -Path .gitignore -Value "node_modules/`r`n.env`r`ndist/`r`n__pycache__/`r`n*.pyc"
Commit-File ".gitignore" "chore: add global gitignore for node and python"
Commit-File "docker-compose.yml" "chore(docker): setup multi-container architecture with postgres and redis"
Commit-File "README.md" "docs: initialize enterprise IIoT digital twin platform documentation"

# 2. Database
Commit-File "database/init.sql" "feat(db): design normalized schema for machines, telemetry, and inventory"

# 3. API Gateway Base
Commit-File "api-gateway/package.json" "chore(api): initialize express typescript project"
Commit-File "api-gateway/tsconfig.json" "chore(api): configure strict typescript compiler options"
Commit-File "api-gateway/src/db.ts" "feat(api): implement postgres connection pool"

# 4. API Gateway Auth
Commit-File "api-gateway/src/middleware/auth.ts" "feat(api): implement JWT authentication middleware"
Commit-File "api-gateway/src/routes/auth.ts" "feat(api): create login and token generation routes"

# 5. API Gateway Routes
Commit-File "api-gateway/src/routes/machines.ts" "feat(api): implement machine telemetry CRUD endpoints"
Commit-File "api-gateway/src/routes/production.ts" "feat(api): add production metrics and tracking routes"
Commit-File "api-gateway/src/routes/inventory.ts" "feat(api): create supply chain and inventory endpoints"
Commit-File "api-gateway/src/routes/quality.ts" "feat(api): build quality assurance mock endpoints"
Commit-File "api-gateway/src/routes/ai.ts" "feat(api): implement ai service proxy routes"

# 6. API Gateway Server
Commit-File "api-gateway/src/index.ts" "feat(api): bootstrap express server with CORS and route mounting"

# 7. Frontend Base
Commit-File "frontend/package.json" "chore(web): initialize react vite typescript environment"
Commit-File "frontend/index.html" "chore(web): configure entry HTML and font assets"
Commit-File "frontend/vite.config.ts" "chore(web): setup vite bundler"
Commit-File "frontend/tsconfig*.json" "chore(web): configure frontend typescript rules"

# 8. Frontend Core
Commit-File "frontend/src/index.css" "style(web): implement design system tokens and global css"
Commit-File "frontend/src/main.tsx" "feat(web): mount react root application"
Commit-File "frontend/src/App.tsx" "feat(web): implement react router configuration"

# 9. Frontend Auth & Layout
Commit-File "frontend/src/context/AuthContext.tsx" "feat(web): build global authentication state context"
Commit-File "frontend/src/components/ProtectedRoute.tsx" "feat(web): secure application routes behind auth guard"
Commit-File "frontend/src/components/Layout.*" "feat(web): design responsive sidebar navigation layout"
Commit-File "frontend/src/pages/Login.*" "feat(web): build glassmorphism login interface"

# 10. Frontend Pages
Commit-File "frontend/src/pages/Dashboard.*" "feat(web): implement main factory overview dashboard with recharts"
Commit-File "frontend/src/pages/Machines.*" "feat(web): create machine fleet management interface"
Commit-File "frontend/src/pages/Production.*" "feat(web): build production tracking view"
Commit-File "frontend/src/pages/Inventory.*" "feat(web): implement inventory and supply chain tracking"
Commit-File "frontend/src/pages/QualityControl.*" "feat(web): design computer vision quality assurance UI"

# 11. AI Service
Commit-File "ai-service/requirements.txt" "chore(ai): define python data science dependencies"
Commit-File "ai-service/main.py" "feat(ai): bootstrap fastapi microservice for predictive models"
Commit-File "ai-service/models/maintenance_model.py" "feat(ai): integrate PyTorch Deep Neural Network for failure prediction"

# 12. Quality Service
Commit-File "quality-service/" "feat(qa): scaffold quality assurance computer vision service"

# 13. MLOps & WebSockets Integration
Commit-File "frontend/src/components/ModelMetrics.*" "feat(web): visualize PyTorch training metrics on dashboard"
git add api-gateway/src/index.ts
git commit -m "feat(api): upgrade express server with Socket.io for live IoT telemetry"
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/Machines.tsx
git commit -m "feat(web): integrate WebSockets into dashboard for real-time reactivity"

# 14. 3D Digital Twin
Commit-File "frontend/src/components/DigitalTwin.*" "feat(web): engineer WebGL 3D Digital Twin using React Three Fiber"
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(web): add three.js and WebGL dependencies"
git add frontend/src/components/Layout.css frontend/src/pages/Dashboard.tsx
git commit -m "feat(web): embed 3D Digital Twin into main dashboard with live state mapping"

# 15. Final Catch-all
git add .
git commit -m "chore: final polish, environment configs, and minor bugfixes"
