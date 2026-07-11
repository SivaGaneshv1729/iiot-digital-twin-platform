from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
from models.maintenance_model import predictor
from models.forecast_model import forecaster
from services.llm_service import generate_factory_insights

app = FastAPI(title="SmartFactory AI Service", version="1.0.0")

class HealthResponse(BaseModel):
    status: str
    message: str

class MaintenanceRequest(BaseModel):
    temperature: float
    running_hours: int

class ForecastRequest(BaseModel):
    history: list[float]

class ChatRequest(BaseModel):
    question: str
    context: Dict[str, Any]

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Returns the health status of the AI microservice."""
    return {"status": "ok", "message": "AI Service is running"}

@app.post("/predict/maintenance")
def predict_maintenance(req: MaintenanceRequest):
    """
    Predicts the point-in-time failure probability of a machine
    using the PyTorch Feed-Forward Neural Network.
    """
    prob = predictor.predict_failure_probability(req.temperature, req.running_hours)
    return {"failure_probability": prob}

@app.get("/predict/metrics")
def get_model_metrics():
    """Retrieves the training convergence metrics (loss/accuracy) for the MLOps dashboard."""
    return predictor.get_metrics()

@app.post("/train")
def trigger_retraining():
    """
    Manually triggers the PyTorch continuous learning loop.
    Re-initializes the Adam optimizer and runs backpropagation for 150 epochs.
    """
    new_metrics = predictor.retrain()
    return {"message": "PyTorch Retraining Complete", "metrics": new_metrics}

@app.post("/forecast/temperature")
def forecast_temperature(req: ForecastRequest):
    """
    Uses the PyTorch LSTM network to forecast the future thermodynamic 
    trajectory of a machine based on its historical time-series sequence.
    """
    forecast = forecaster.forecast_next_n_points(req.history)
    return {"forecast": forecast}

@app.post("/chat")
def chat(req: ChatRequest):
    response = generate_factory_insights(req.question, req.context)
    return {"answer": response}
