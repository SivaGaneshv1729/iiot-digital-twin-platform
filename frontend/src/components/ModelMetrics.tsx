import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit } from 'lucide-react';
import './ModelMetrics.css';



export const ModelMetrics = () => {
  const [data, setData] = useState<{ epoch: number, loss: number, accuracy: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:4000/api/ai/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const raw = await res.json();
          // Transform for Recharts if data is valid
          if (raw && raw.epochs && Array.isArray(raw.epochs)) {
            const formatted = raw.epochs.map((epoch: number, i: number) => ({
              epoch,
              loss: raw.loss[i],
              accuracy: raw.accuracy[i]
            }));
            setData(formatted);
          }
        }
      } catch (err) {
        console.error("Failed to fetch model metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="model-metrics-panel glass-panel">
      <div className="panel-header">
        <h3><BrainCircuit size={18} className="text-accent" /> PyTorch AI Engine Status</h3>
        <span className="badge status-pass">Model Trained</span>
      </div>
      
      {loading ? (
        <div className="loading-state">Fetching training metrics...</div>
      ) : (
        <div className="metrics-content">
          <div className="metrics-description">
            <p><strong>Architecture:</strong> Deep Feed-Forward Neural Network</p>
            <p><strong>Optimization:</strong> Adam (BCELoss)</p>
          </div>
          
          <div className="charts-container">
            <div className="chart-box">
              <h4>Training Loss Curve</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" stroke="#666" tick={{fill: '#666'}} />
                  <YAxis stroke="#666" tick={{fill: '#666'}} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-box">
              <h4>Validation Accuracy (%)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" stroke="#666" tick={{fill: '#666'}} />
                  <YAxis stroke="#666" tick={{fill: '#666'}} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
