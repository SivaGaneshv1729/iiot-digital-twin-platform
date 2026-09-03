import torch
import torch.nn as nn
import torch.optim as optim
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import random
import numpy as np

# ══════════════════════════════════════════════════════════════════════════════
# Reproducible Seeds — Ensures identical model weights on every startup
# ══════════════════════════════════════════════════════════════════════════════
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

app = FastAPI(title="Digital Twin Anomaly Detection Engine")

# ══════════════════════════════════════════════════════════════════════════════
# Autoencoder Architecture
# ══════════════════════════════════════════════════════════════════════════════
class AnomalyAutoencoder(nn.Module):
    """
    Undercomplete autoencoder for anomaly detection.
    Input: [temperature, vibration, pressure, running_hours, is_running] (5 features)
    Bottleneck: 3 neurons (forces the network to learn compressed healthy patterns)
    Output: reconstructed 5 features
    
    Anomaly detection principle: The model is trained ONLY on healthy data.
    When it encounters anomalous inputs, the reconstruction error (MSE) is high
    because the model cannot accurately reconstruct patterns it has never seen.
    """
    def __init__(self):
        super(AnomalyAutoencoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(5, 32),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(32),
            nn.Linear(32, 16),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(16),
            nn.Linear(16, 3),  # Latent space
            nn.Tanh()          # Bound latent space to [-1, 1] to prevent perfectly reconstructing extreme outliers
        )
        self.decoder = nn.Sequential(
            nn.Linear(3, 16),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(16),
            nn.Linear(16, 32),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(32),
            nn.Linear(32, 5)
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

# ══════════════════════════════════════════════════════════════════════════════
# Global State
# ══════════════════════════════════════════════════════════════════════════════
model = AnomalyAutoencoder()
ANOMALY_THRESHOLD = 0.0  # Will be calibrated from validation data
MODEL_METRICS = {}       # Populated after evaluation

# ══════════════════════════════════════════════════════════════════════════════
# Normalization — Maps raw sensor values to approximately [-1, 1]
# Based on the healthy operating ranges of the equipment.
# ══════════════════════════════════════════════════════════════════════════════
# Healthy baselines (mean, std used for normalization)
NORM_PARAMS = {
    'temperature': (65.0, 15.0),   # healthy: ~50-80°C
    'vibration':   (2.5,  1.5),    # healthy: ~1-4 mm/s
    'pressure':    (100.0, 15.0),  # healthy: ~85-115 PSI
    'hours':       (7500.0, 5000.0),
    'is_running':  (0.5, 0.5),
}

def normalize(features: list) -> list:
    """Z-score normalization using healthy population statistics."""
    temp, vib, press, hours, is_running = features
    return [
        (temp - NORM_PARAMS['temperature'][0]) / NORM_PARAMS['temperature'][1],
        (vib - NORM_PARAMS['vibration'][0]) / NORM_PARAMS['vibration'][1],
        (press - NORM_PARAMS['pressure'][0]) / NORM_PARAMS['pressure'][1],
        (hours - NORM_PARAMS['hours'][0]) / NORM_PARAMS['hours'][1],
        (is_running - NORM_PARAMS['is_running'][0]) / NORM_PARAMS['is_running'][1],
    ]

# ══════════════════════════════════════════════════════════════════════════════
# Dataset Generation
# ══════════════════════════════════════════════════════════════════════════════
def generate_healthy_sample() -> list:
    """Generate a single sample from the healthy operating distribution, introducing physical correlations."""
    # Base load factor (0.0 to 1.0) representing how hard the machine is working
    load = random.uniform(0.1, 0.9)
    
    # Features naturally correlate with the machine's load
    temp = 50.0 + (load * 30.0) + random.gauss(0, 3.0)      # 50°C to 80°C based on load
    vib = 1.0 + (load * 3.0) + random.gauss(0, 0.4)         # 1.0 to 4.0 mm/s based on load
    vib = abs(vib)
    press = 90.0 + (load * 20.0) + random.gauss(0, 4.0)     # 90 to 110 PSI based on load
    
    hours = random.uniform(0.0, 15000.0)
    is_running = 1.0
    return [temp, vib, press, hours, is_running]

def generate_anomalous_sample() -> list:
    """Generate a sample that represents a genuine equipment anomaly.
    
    Anomaly types (randomly selected):
    - Thermal overload: temperature 95-130°C
    - Excessive vibration: vibration 7-15 mm/s (bearing failure, imbalance)
    - Pressure anomaly: pressure <60 or >135 PSI (leak or blockage)
    - Combined failure: multiple metrics simultaneously abnormal
    """
    anomaly_type = random.choice(['thermal', 'vibration', 'pressure', 'combined'])
    hours = random.uniform(0.0, 20000.0)
    is_running = 1.0

    if anomaly_type == 'thermal':
        temp = random.uniform(95.0, 130.0)
        vib = abs(random.gauss(3.0, 1.5))
        press = random.gauss(100.0, 10.0)
    elif anomaly_type == 'vibration':
        temp = random.gauss(70.0, 10.0)
        vib = random.uniform(7.0, 15.0)
        press = random.gauss(100.0, 10.0)
    elif anomaly_type == 'pressure':
        temp = random.gauss(70.0, 10.0)
        vib = abs(random.gauss(3.0, 1.0))
        press = random.choice([random.uniform(20.0, 55.0), random.uniform(140.0, 180.0)])
    else:  # combined
        temp = random.uniform(90.0, 120.0)
        vib = random.uniform(6.0, 12.0)
        press = random.choice([random.uniform(30.0, 60.0), random.uniform(130.0, 160.0)])

    return [temp, vib, press, hours, is_running]

def build_datasets():
    """Build train, validation, and test datasets.
    
    Returns:
        train_data: 5000 healthy samples (normalized tensors)
        val_data: 500 healthy samples (normalized tensors) — for threshold calibration
        test_data: 500 samples (normalized tensors) — 250 healthy + 250 anomalous
        test_labels: 500 binary labels (0=healthy, 1=anomalous)
        test_raw: 500 raw feature lists (for reporting)
    """
    # Training set: purely healthy
    train_raw = [generate_healthy_sample() for _ in range(5000)]
    train_norm = [normalize(s) for s in train_raw]
    train_data = torch.tensor(train_norm, dtype=torch.float32)

    # Validation set: purely healthy (used to calibrate threshold)
    val_raw = [generate_healthy_sample() for _ in range(500)]
    val_norm = [normalize(s) for s in val_raw]
    val_data = torch.tensor(val_norm, dtype=torch.float32)

    # Test set: 250 healthy + 250 anomalous (with ground truth labels)
    test_healthy_raw = [generate_healthy_sample() for _ in range(250)]
    test_anomaly_raw = [generate_anomalous_sample() for _ in range(250)]
    test_raw = test_healthy_raw + test_anomaly_raw
    test_labels = [0] * 250 + [1] * 250  # 0 = healthy, 1 = anomalous

    # Shuffle test set deterministically
    combined = list(zip(test_raw, test_labels))
    random.shuffle(combined)
    test_raw, test_labels = zip(*combined)
    test_raw = list(test_raw)
    test_labels = list(test_labels)

    test_norm = [normalize(s) for s in test_raw]
    test_data = torch.tensor(test_norm, dtype=torch.float32)

    return train_data, val_data, test_data, test_labels, test_raw

# ══════════════════════════════════════════════════════════════════════════════
# Training & Evaluation Pipeline
# ══════════════════════════════════════════════════════════════════════════════
def train_and_evaluate():
    """Full pipeline: train → calibrate threshold → evaluate on test set."""
    global ANOMALY_THRESHOLD, MODEL_METRICS

    print("=" * 70)
    print("  ANOMALY DETECTION MODEL — TRAINING & EVALUATION PIPELINE")
    print("=" * 70)

    # ── Step 1: Build Datasets ──
    train_data, val_data, test_data, test_labels, test_raw = build_datasets()
    print(f"\n📊 Dataset Sizes:")
    print(f"   Training:   {len(train_data)} healthy samples")
    print(f"   Validation: {len(val_data)} healthy samples")
    print(f"   Test:       {len(test_data)} samples (250 healthy + 250 anomalous)")

    # ── Step 2: Train Autoencoder ──
    print(f"\n🔧 Training Autoencoder (300 epochs)...")
    optimizer = optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=100, gamma=0.5)
    loss_fn = nn.MSELoss()

    model.train()
    train_losses = []
    val_losses = []

    for epoch in range(300):
        # Training step
        optimizer.zero_grad()
        reconstructed = model(train_data)
        train_loss = loss_fn(reconstructed, train_data)
        train_loss.backward()
        optimizer.step()
        scheduler.step()

        # Validation step (no gradient)
        if epoch % 10 == 0 or epoch == 299:
            model.eval()
            with torch.no_grad():
                val_reconstructed = model(val_data)
                val_loss = loss_fn(val_reconstructed, val_data)
            model.train()
            train_losses.append(round(train_loss.item(), 6))
            val_losses.append(round(val_loss.item(), 6))

            if epoch % 50 == 0:
                print(f"   Epoch {epoch:>3d}: train_loss={train_loss.item():.6f}  val_loss={val_loss.item():.6f}")

    final_train_loss = train_losses[-1]
    final_val_loss = val_losses[-1]
    print(f"   ✅ Final: train_loss={final_train_loss:.6f}  val_loss={final_val_loss:.6f}")

    # ── Step 3: Calibrate Anomaly Threshold ──
    print(f"\n📏 Calibrating anomaly threshold...")
    model.eval()
    with torch.no_grad():
        val_reconstructed = model(val_data)
        # Per-sample MSE
        val_mse = torch.mean((val_reconstructed - val_data) ** 2, dim=1).numpy()

    # Set threshold at the 95th percentile of healthy reconstruction errors.
    # This means: only 5% of genuinely healthy samples will be falsely flagged.
    percentile_95 = float(np.percentile(val_mse, 95))
    percentile_99 = float(np.percentile(val_mse, 99))
    ANOMALY_THRESHOLD = percentile_95

    print(f"   Healthy MSE distribution:")
    print(f"     Mean:  {np.mean(val_mse):.6f}")
    print(f"     Std:   {np.std(val_mse):.6f}")
    print(f"     P50:   {np.percentile(val_mse, 50):.6f}")
    print(f"     P90:   {np.percentile(val_mse, 90):.6f}")
    print(f"     P95:   {percentile_95:.6f}")
    print(f"     P99:   {percentile_99:.6f}")
    print(f"     Max:   {np.max(val_mse):.6f}")
    print(f"   ✅ Threshold set at P95: {ANOMALY_THRESHOLD:.6f}")

    # ── Step 4: Evaluate on Labeled Test Set ──
    print(f"\n🧪 Evaluating on labeled test set...")
    with torch.no_grad():
        test_reconstructed = model(test_data)
        test_mse = torch.mean((test_reconstructed - test_data) ** 2, dim=1).numpy()

    # Classify: MSE > threshold → anomaly (1), else healthy (0)
    predictions = [1 if mse > ANOMALY_THRESHOLD else 0 for mse in test_mse]

    # Confusion matrix components
    tp = sum(1 for p, l in zip(predictions, test_labels) if p == 1 and l == 1)
    fp = sum(1 for p, l in zip(predictions, test_labels) if p == 1 and l == 0)
    tn = sum(1 for p, l in zip(predictions, test_labels) if p == 0 and l == 0)
    fn = sum(1 for p, l in zip(predictions, test_labels) if p == 0 and l == 1)

    accuracy = (tp + tn) / len(test_labels)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    # ROC AUC (manual trapezoidal computation — no sklearn dependency)
    auc = compute_roc_auc(test_mse, test_labels)

    # Store globally
    MODEL_METRICS = {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "threshold": round(ANOMALY_THRESHOLD, 6),
        "confusion_matrix": {
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
        },
        "training": {
            "epochs": 300,
            "final_train_loss": final_train_loss,
            "final_val_loss": final_val_loss,
            "train_samples": len(train_data),
            "val_samples": len(val_data),
            "test_samples": len(test_data),
        },
        "healthy_mse_stats": {
            "mean": round(float(np.mean(val_mse)), 6),
            "std": round(float(np.std(val_mse)), 6),
            "p50": round(float(np.percentile(val_mse, 50)), 6),
            "p95": round(float(percentile_95), 6),
            "p99": round(float(percentile_99), 6),
        },
    }

    print(f"\n{'='*50}")
    print(f"  MODEL EVALUATION RESULTS")
    print(f"{'='*50}")
    print(f"  Accuracy:  {accuracy:.2%}")
    print(f"  Precision: {precision:.2%}")
    print(f"  Recall:    {recall:.2%}")
    print(f"  F1 Score:  {f1:.2%}")
    print(f"  ROC AUC:   {auc:.4f}")
    print(f"")
    print(f"  Confusion Matrix:")
    print(f"                Predicted")
    print(f"                Healthy  Anomaly")
    print(f"  Actual Healthy   {tn:>4d}     {fp:>4d}")
    print(f"  Actual Anomaly   {fn:>4d}     {tp:>4d}")
    print(f"{'='*50}\n")


def compute_roc_auc(scores, labels):
    """Compute ROC AUC without sklearn using the trapezoidal rule.
    
    scores: array of anomaly scores (MSE values)
    labels: array of ground truth (0=healthy, 1=anomalous)
    """
    # Sort by score descending
    paired = sorted(zip(scores, labels), key=lambda x: -x[0])
    
    total_pos = sum(labels)
    total_neg = len(labels) - total_pos
    
    if total_pos == 0 or total_neg == 0:
        return 0.5
    
    tp = 0
    fp = 0
    prev_tpr = 0.0
    prev_fpr = 0.0
    auc = 0.0
    
    for score, label in paired:
        if label == 1:
            tp += 1
        else:
            fp += 1
        
        tpr = tp / total_pos
        fpr = fp / total_neg
        
        # Trapezoidal area
        auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2.0
        prev_tpr = tpr
        prev_fpr = fpr
    
    return auc


# ══════════════════════════════════════════════════════════════════════════════
# Startup
# ══════════════════════════════════════════════════════════════════════════════
@app.on_event("startup")
def startup_event():
    train_and_evaluate()

# ══════════════════════════════════════════════════════════════════════════════
# API Models
# ══════════════════════════════════════════════════════════════════════════════
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
    anomaly_score: float
    running_hours: int

# ══════════════════════════════════════════════════════════════════════════════
# /predict/batch — Main inference endpoint (called by Spring Boot every 2s)
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/predict/batch", response_model=List[PredictionResult])
def predict_batch(machines: List[MachineState]):
    results = []
    model.eval()

    for m in machines:
        is_running = 1.0 if m.status == 'Running' else 0.0

        # ── Compute Anomaly Score (pure model inference, no noise) ──
        features = [m.temperature, m.vibration, m.pressure, float(m.running_hours), is_running]
        norm_features = torch.tensor([normalize(features)], dtype=torch.float32)

        with torch.no_grad():
            reconstructed = model(norm_features)
            mse = torch.mean((reconstructed - norm_features) ** 2).item()

        # Map MSE to 0-100% scale using calibrated threshold.
        # At threshold, score = 75%. Above threshold scales toward 100%.
        # Below threshold scales from 0% to 75%.
        if mse <= ANOMALY_THRESHOLD:
            # Linear scale: 0 → 75% as MSE goes from 0 → threshold
            anomaly_score = (mse / ANOMALY_THRESHOLD) * 75.0
        else:
            # Above threshold: 75% → 100% (saturates at ~5x threshold)
            overshoot = (mse - ANOMALY_THRESHOLD) / (ANOMALY_THRESHOLD * 4.0)
            anomaly_score = 75.0 + min(overshoot * 25.0, 25.0)

        anomaly_score = max(0.0, min(100.0, anomaly_score))

        # ── Simulate sensor drift for the digital twin (UI realism) ──
        new_temp = m.temperature
        new_vib = m.vibration
        new_press = m.pressure

        if is_running:
            new_temp += random.uniform(-0.5, 1.0)
            if anomaly_score > 70:
                new_temp += 1.5  # Thermal runaway feedback
            new_vib += random.uniform(-0.1, 0.2)
            if anomaly_score > 70:
                new_vib += 0.5  # Bearing deterioration
            new_press += random.uniform(-1.0, 1.0)
        else:
            if new_temp > 30:
                new_temp -= 1.0
            if new_vib > 0.5:
                new_vib -= 0.5

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

# ══════════════════════════════════════════════════════════════════════════════
# /model/metrics — Returns genuine evaluation metrics
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/model/metrics")
def get_model_metrics():
    """Returns the model's evaluation metrics computed on the labeled test set."""
    return MODEL_METRICS

# ══════════════════════════════════════════════════════════════════════════════
# /model/evaluate — Ad-hoc evaluation of custom inputs
# ══════════════════════════════════════════════════════════════════════════════
class EvalInput(BaseModel):
    temperature: float
    vibration: float
    pressure: float
    running_hours: int = 5000
    is_running: bool = True

class EvalResult(BaseModel):
    mse: float
    anomaly_score: float
    is_anomaly: bool
    threshold: float

@app.post("/model/evaluate", response_model=EvalResult)
def evaluate_single(input: EvalInput):
    """Evaluate a single data point and return detailed anomaly analysis."""
    model.eval()
    is_running = 1.0 if input.is_running else 0.0
    features = [input.temperature, input.vibration, input.pressure, float(input.running_hours), is_running]
    norm_features = torch.tensor([normalize(features)], dtype=torch.float32)

    with torch.no_grad():
        reconstructed = model(norm_features)
        mse = torch.mean((reconstructed - norm_features) ** 2).item()

    if mse <= ANOMALY_THRESHOLD:
        anomaly_score = (mse / ANOMALY_THRESHOLD) * 75.0
    else:
        overshoot = (mse - ANOMALY_THRESHOLD) / (ANOMALY_THRESHOLD * 4.0)
        anomaly_score = 75.0 + min(overshoot * 25.0, 25.0)

    anomaly_score = max(0.0, min(100.0, anomaly_score))

    return EvalResult(
        mse=round(mse, 6),
        anomaly_score=round(anomaly_score, 1),
        is_anomaly=mse > ANOMALY_THRESHOLD,
        threshold=round(ANOMALY_THRESHOLD, 6),
    )
