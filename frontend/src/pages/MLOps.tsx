import { useEffect, useState } from 'react';
import { Cpu, RotateCcw, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './MLOps.css';

export const MLOps = () => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/ai/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Convert to Recharts format: [{epoch: 0, loss: 0.8, accuracy: 50}, ...]
        if (data.epochs) {
          const formatted = data.epochs.map((ep: number, i: number) => ({
            epoch: ep,
            loss: data.loss[i],
            accuracy: data.accuracy[i]
          }));
          setMetrics(formatted);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const triggerRetrain = async () => {
    setTraining(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/ai/train', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Refetch the new metrics to update the chart
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Training failed:', err);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="mlops-container">
      <div className="mlops-header">
        <div>
          <h1>PyTorch MLOps Control Center</h1>
          <p className="subtitle">Continuous Learning & Neural Network Health</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={triggerRetrain} 
          disabled={training || loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {training ? (
            <>
              <Activity size={18} className="spin-anim" /> Running backpropagation...
            </>
          ) : (
            <>
              <RotateCcw size={18} /> Trigger PyTorch Retraining Loop
            </>
          )}
        </button>
      </div>

      <div className="mlops-grid">
        <div className="mlops-card glass-panel full-width">
          <div className="card-header">
            <Cpu className="text-accent" />
            <h2>Training Convergence (Loss vs Accuracy)</h2>
          </div>
          
          <div className="card-body">
            {loading ? (
              <div className="loading-state">Loading AI Metrics...</div>
            ) : metrics.length === 0 ? (
              <div className="loading-state">No model data available.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={metrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="epoch" stroke="#94a3b8" />
                    {/* YAxis for Loss (left) */}
                    <YAxis yAxisId="left" stroke="#ef4444" domain={[0, 'dataMax']} />
                    {/* YAxis for Accuracy (right) */}
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[0, 100]} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="loss" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorLoss)" 
                      name="BCE Loss"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorAcc)" 
                      name="Accuracy (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
