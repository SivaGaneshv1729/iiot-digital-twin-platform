# Commit 1: Export Dependencies
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(web): install jspdf and xlsx for client-side report generation"

# Commit 2: Quality & Audit Exports
git add frontend/src/pages/Quality.tsx frontend/src/pages/AuditLogs.tsx
git commit -m "feat(web): implement enterprise PDF and Excel exporting for compliance and QA tables"

# Push the changes
git push
