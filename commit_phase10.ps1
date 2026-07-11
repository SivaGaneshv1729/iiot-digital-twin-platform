# Commit 1: CI/CD Pipeline
git add .github/workflows/ci.yml
git commit -m "ci(github): implement automated build and test pipeline for microservices"

# Commit 2: Dockerfiles
git add frontend/Dockerfile api-gateway/Dockerfile ai-service/Dockerfile
git commit -m "build(docker): containerize frontend, api-gateway, and ai-service with multi-stage builds"

# Commit 3: Production Orchestration
git add docker-compose.prod.yml
git commit -m "build(compose): orchestrate production environment with isolated internal networking"

# Commit 4: Frontend Japanese Localization
git add frontend/package.json frontend/package-lock.json frontend/src/i18n.ts frontend/src/main.tsx frontend/src/components/Layout.tsx
git commit -m "feat(web): integrate react-i18next for native Japanese (日本語) localization support"

# Commit 5: OEE Metrics
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(web): upgrade dashboard analytics to calculate True OEE (Overall Equipment Effectiveness)"

# Commit 6: Redis Pub/Sub
git add api-gateway/package.json api-gateway/package-lock.json api-gateway/src/index.ts
git commit -m "feat(api): migrate WebSockets to Redis Pub/Sub event-driven architecture for scalability"

# Commit 7: Documentation
git add README.md
git commit -m "docs: finalize enterprise documentation with architecture topology and deployment guides"

# Push the changes
git push
