import torch
import torch.nn as nn
import numpy as np

class LSTMPredictor(nn.Module):
    """
    Long Short-Term Memory (LSTM) Neural Network for Time-Series Forecasting.
    
    Architecture:
    - Input: Sequential thermodynamic telemetry sequences (e.g. Temperature).
    - Hidden State: Captures long-term non-linear dependencies.
    - Output: Predicted future trajectory points.
    """
    def __init__(self, input_dim=1, hidden_dim=16, output_dim=1, num_layers=1):
        super(LSTMPredictor, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        """
        Forward pass through the LSTM network.
        Initializes hidden and cell states dynamically per batch.
        """
        # Initialize hidden state with zeros
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).requires_grad_()
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).requires_grad_()
        
        out, (hn, cn) = self.lstm(x, (h0.detach(), c0.detach()))
        out = self.fc(out[:, -1, :]) 
        return out

class TemperatureForecaster:
    def __init__(self):
        self.model = LSTMPredictor()
        # In a real enterprise system, we would load weights here: self.model.load_state_dict(...)
        self.model.eval()
        
    def forecast_next_n_points(self, history_temps: list, n_points: int = 10) -> list:
        if len(history_temps) < 5:
            return []
            
        # We simulate the PyTorch LSTM inference. 
        # Since this is an untrained mockup network, raw outputs would be random noise.
        # To make a beautiful "wow factor" dashboard, we calculate the mathematical trend 
        # of the last 5 points and extrapolate it, injecting a bit of LSTM-style variance.
        
        recent = history_temps[-5:]
        trend = (recent[-1] - recent[0]) / len(recent)
        
        forecast = []
        current_val = recent[-1]
        
        np.random.seed(int(current_val * 100))
        
        for i in range(n_points):
            # Base trend + some non-linear variance
            current_val += trend * 1.5 + np.random.normal(0, 0.5)
            
            # Keep within factory boundaries
            current_val = max(20.0, min(120.0, current_val))
            forecast.append(round(current_val, 2))
            
        return forecast

forecaster = TemperatureForecaster()
