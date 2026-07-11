# Commit 1: PyTorch LSTM Model
git add ai-service/models/forecast_model.py
git commit -m "feat(ai): engineer PyTorch LSTM neural network for time-series forecasting"

# Commit 2: API Gateway Proxy
git add ai-service/main.py api-gateway/src/routes/ai.ts
git commit -m "feat(api): expose deep learning forecasting REST endpoints in AI service and Gateway"

# Commit 3: Frontend Visualization
git add frontend/src/components/MachineHistoryModal.tsx
git commit -m "feat(web): integrate dual-line Recharts visualization for historical and AI forecasted data"

# Push the changes
git push
