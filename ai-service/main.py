from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
from models.maintenance_model import predictor
from services.llm_service import generate_factory_insights

app = FastAPI(title="SmartFactory AI Service", version="1.0.0")

class HealthResponse(BaseModel):
    status: str
    message: str

class MaintenanceRequest(BaseModel):
    temperature: float
    running_hours: int

class ChatRequest(BaseModel):
    question: str
    context: Dict[str, Any]

@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "message": "AI Service is running"}

@app.post("/predict/maintenance")
def predict_maintenance(req: MaintenanceRequest):
    prob = predictor.predict_failure_probability(req.temperature, req.running_hours)
    return {"failure_probability": prob}

@app.get("/predict/metrics")
def get_model_metrics():
    return predictor.get_metrics()

@app.post("/chat")
def chat(req: ChatRequest):
    response = generate_factory_insights(req.question, req.context)
    return {"answer": response}
