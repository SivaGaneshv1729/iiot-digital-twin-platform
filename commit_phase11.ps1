# Commit 1: Database Migration
git add api-gateway/migrate.js
git commit -m "chore(db): create time-series telemetry_history table migration script"

# Commit 2: API Gateway Ingestion
git add api-gateway/src/index.ts
git commit -m "feat(api): implement automated time-series data ingestion from Redis to PostgreSQL"

# Commit 3: API Gateway Endpoints
git add api-gateway/src/routes/machines.ts
git commit -m "feat(api): create chronological historical analytics endpoint for 3D visualization"

# Commit 4: Frontend Modal UI
git add frontend/src/components/MachineHistoryModal.*
git commit -m "feat(web): build glassmorphism analytical modal with Recharts time-series integration"

# Commit 5: Frontend 3D Raycasting Interactivity
git add frontend/src/components/DigitalTwin.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(web): engineer 3D raycasting interactivity for dynamic data fetching on mesh click"

# Push the changes
git push
