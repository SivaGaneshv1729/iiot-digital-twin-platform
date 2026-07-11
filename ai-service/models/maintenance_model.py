import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

class FailurePredictionNet(nn.Module):
    def __init__(self):
        super(FailurePredictionNet, self).__init__()
        # Input features: [temperature, running_hours]
        self.fc1 = nn.Linear(2, 16)
        self.relu1 = nn.ReLU()
        self.fc2 = nn.Linear(16, 8)
        self.relu2 = nn.ReLU()
        self.out = nn.Linear(8, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu1(self.fc1(x))
        x = self.relu2(self.fc2(x))
        x = self.sigmoid(self.out(x))
        return x

class MaintenancePredictor:
    def __init__(self):
        self.model = FailurePredictionNet()
        self.is_trained = False
        self.metrics_history = {
            'epochs': [],
            'loss': [],
            'accuracy': []
        }
        self._train_mock_model()

    def _train_mock_model(self):
        # Generate synthetic data for training
        np.random.seed(42)
        torch.manual_seed(42)
        n_samples = 2000
        
        # Normal operation: temp 40-70, hours 0-2000 => label 0 (Healthy)
        normal_temps = np.random.uniform(40, 70, int(n_samples * 0.7))
        normal_hours = np.random.uniform(0, 2000, int(n_samples * 0.7))
        normal_labels = np.zeros(int(n_samples * 0.7))
        
        # Failing operation: temp 70-100, hours 1500-5000 => label 1 (Failing)
        failing_temps = np.random.uniform(70, 100, int(n_samples * 0.3))
        failing_hours = np.random.uniform(1500, 5000, int(n_samples * 0.3))
        failing_labels = np.ones(int(n_samples * 0.3))
        
        X_np = np.vstack((np.concatenate([normal_temps, failing_temps]), 
                       np.concatenate([normal_hours, failing_hours]))).T
        y_np = np.concatenate([normal_labels, failing_labels]).reshape(-1, 1)

        # Normalize features
        self.temp_mean, self.temp_std = X_np[:, 0].mean(), X_np[:, 0].std()
        self.hours_mean, self.hours_std = X_np[:, 1].mean(), X_np[:, 1].std()
        
        X_np[:, 0] = (X_np[:, 0] - self.temp_mean) / self.temp_std
        X_np[:, 1] = (X_np[:, 1] - self.hours_mean) / self.hours_std

        X = torch.FloatTensor(X_np)
        y = torch.FloatTensor(y_np)

        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=0.01)

        epochs = 150
        for epoch in range(epochs):
            optimizer.zero_grad()
            outputs = self.model(X)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()

            # Calculate accuracy
            predicted = (outputs >= 0.5).float()
            accuracy = (predicted == y).float().mean().item() * 100

            # Store metrics every 10 epochs
            if epoch % 10 == 0 or epoch == epochs - 1:
                self.metrics_history['epochs'].append(epoch)
                self.metrics_history['loss'].append(round(loss.item(), 4))
                self.metrics_history['accuracy'].append(round(accuracy, 2))

        self.is_trained = True

    def predict_failure_probability(self, temperature: float, running_hours: int) -> float:
        if not self.is_trained:
            return 0.0
            
        self.model.eval()
        with torch.no_grad():
            # Normalize inputs
            norm_temp = (temperature - self.temp_mean) / self.temp_std
            norm_hours = (running_hours - self.hours_mean) / self.hours_std
            
            x = torch.FloatTensor([[norm_temp, norm_hours]])
            prob = self.model(x).item()
            
        return round(prob * 100, 2)

    def get_metrics(self):
        return self.metrics_history

    def retrain(self):
        """Trigger continuous learning loop by re-initializing and training"""
        self.is_trained = False
        self.model = FailurePredictionNet()
        self.metrics_history = {
            'epochs': [],
            'loss': [],
            'accuracy': []
        }
        self._train_mock_model()
        return self.metrics_history

# Global instance
predictor = MaintenancePredictor()
