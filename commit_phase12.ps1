# Commit 1: Database Seed
git add api-gateway/seed_operator.js
git commit -m "chore(db): create database seeder for restricted operator role"

# Commit 2: API Security Middleware
git add api-gateway/src/middleware/auth.ts
git commit -m "feat(api): engineer requireAdmin JWT middleware for robust route protection"

# Commit 3: API Protected Routes
git add api-gateway/src/routes/machines.ts
git commit -m "feat(api): expose protected machine control endpoints with strict RBAC enforcement"

# Commit 4: Frontend UI Role Checking
git add frontend/src/pages/Machines.tsx
git commit -m "feat(web): integrate dynamic frontend RBAC to conditionally render management controls"

# Commit 5: Documentation & Credits
git add README.md
git commit -m "docs: finalize enterprise documentation detailing phases 1-12 and author credits"

# Push the changes
git push
