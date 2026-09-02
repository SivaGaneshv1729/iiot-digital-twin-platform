import torch
import torch.nn as nn
import torch.optim as optim
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import random

app = FastAPI(title="Digital Twin Anomaly Detection Engine")

# Define the PyTorch Autoencoder
class AnomalyAutoencoder(nn.Module):
    def __init__(self):
        super(AnomalyAutoencoder, self).__init__()
        # Input features: [temp, vib, press, hours, is_running]
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(5, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 3) # Latent space
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(3, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, 5)
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

# Global model instance
model = AnomalyAutoencoder()

# Normalization factors for healthy dataset
def normalize(features):
    temp, vib, press, hours, is_running = features
    return [
        (temp - 70.0) / 30.0,
        (vib - 2.5) / 5.0,
        (press - 100.0) / 20.0,
        hours / 20000.0,
        is_running
    ]

def train_unsupervised_model():
    """Trains the autoencoder strictly on a 'Healthy' baseline dataset."""
    print("Training Anomaly Autoencoder on baseline UC Irvine-style dataset...")
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    loss_fn = nn.MSELoss()
    
    X_train = []
    
    # Generate 5000 healthy data points
    for _ in range(5000):
        # Healthy bounds
        temp = random.gauss(70.0, 5.0) # Normal dist around 70C
        vib = random.gauss(2.5, 0.5)   # Normal dist around 2.5mm/s
        press = random.gauss(100.0, 5.0)
        hours = random.uniform(0.0, 15000.0)
        is_running = 1.0
        
        normalized_features = normalize([temp, vib, press, hours, is_running])
        X_train.append(normalized_features)
        
    X_tensor = torch.tensor(X_train, dtype=torch.float32)
    
    for epoch in range(150):
        optimizer.zero_grad()
        reconstructed = model(X_tensor)
        loss = loss_fn(reconstructed, X_tensor)
        loss.backward()
        optimizer.step()
        
    print(f"Autoencoder Training Complete. Baseline MSE Loss: {loss.item():.6f}")

@app.on_event("startup")
def startup_event():
    train_unsupervised_model()

# --- API Definitions ---

class MachineState(BaseModel):
    id: int
    status: str
    temperature: float
    vibration: float
    pressure: float
    running_hours: int

class PredictionResult(BaseModel):
    id: int
    predicted_temperature: float
    predicted_vibration: float
    predicted_pressure: float
    anomaly_score: float  # Replaces TTF
    running_hours: int

@app.post("/predict/batch", response_model=List[PredictionResult])
def predict_batch(machines: List[MachineState]):
    results = []
    loss_fn = nn.MSELoss()
    
    for m in machines:
        is_running = 1.0 if m.status == 'Running' else 0.0
        
        # Calculate Anomaly Score
        features = [m.temperature, m.vibration, m.pressure, float(m.running_hours), is_running]
        norm_features = torch.tensor([normalize(features)], dtype=torch.float32)
        
        with torch.no_grad():
            reconstructed = model(norm_features)
            # Calculate Reconstruction Loss (MSE for this specific machine)
            mse = loss_fn(reconstructed, norm_features).item()
            
        # Map MSE to a 0-100% Anomaly Score. 
        # A baseline MSE is usually very small. We scale it up heavily.
        raw_score = mse * 100.0 * 25.0 
        
        # Hard physical bounds fallback: If a user manually cranks up the heat or vibration,
        # guarantee that the AI flags it as a critical anomaly (> 75%)
        if m.temperature > 95.0 or m.vibration > 7.0:
            raw_score = max(raw_score, 85.0 + random.uniform(0, 10.0))
            
        anomaly_score = max(0.0, min(100.0, raw_score))
        
        # Drift mechanics (keep the dynamic simulation feel for the UI)
        new_temp = m.temperature
        new_vib = m.vibration
        new_press = m.pressure
        
        if is_running:
            new_temp += random.uniform(-0.5, 1.0)
            if anomaly_score > 70: new_temp += 1.5 # Thermal runaway
            
            new_vib += random.uniform(-0.1, 0.2)
            if anomaly_score > 70: new_vib += 0.5 # Rattling
            
            new_press += random.uniform(-1.0, 1.0)
        else:
            # Cool down
            if new_temp > 30: new_temp -= 1.0
            if new_vib > 0.5: new_vib -= 0.5
            
        new_temp = max(20.0, min(140.0, new_temp))
        new_vib = max(0.0, min(20.0, new_vib))
        new_press = max(10.0, min(150.0, new_press))
        
        new_hours = m.running_hours
        if m.status == 'Running' and random.random() < 0.2:
            new_hours += 1
            
        results.append(PredictionResult(
            id=m.id,
            predicted_temperature=round(new_temp, 2),
            predicted_vibration=round(new_vib, 2),
            predicted_pressure=round(new_press, 2),
            anomaly_score=round(anomaly_score, 1),
            running_hours=new_hours
        ))
        
    return results
