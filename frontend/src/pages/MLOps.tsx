import { useEffect, useState } from 'react';
import { 
  Cpu, RotateCcw, Activity, Server, Target, 
  Zap, Database, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from 'recharts';
import './MLOps.css';

interface AIModelMetric {
  epoch: number;
  loss: number;
  accuracy: number;
}

// Mock Registry Data for Enterprise feel
const MODEL_REGISTRY = [
  { id: 'v2.4.1', arch: 'YOLOv8', purpose: 'Computer Vision (Quality)', f1: '0.98', latency: '24ms', status: 'Active' },
  { id: 'v2.4.0', arch: 'YOLOv8', purpose: 'Computer Vision (Quality)', f1: '0.95', latency: '28ms', status: 'Archived' },
  { id: 'v1.2.0', arch: 'ResNet-50', purpose: 'Computer Vision (Quality)', f1: '0.89', latency: '45ms', status: 'Archived' },
  { id: 'v3.0.1-beta', arch: 'Transformer', purpose: 'Predictive Maintenance', f1: '0.92', latency: '120ms', status: 'Failed' },
  { id: 'v1.8.4', arch: 'RandomForest', purpose: 'Inventory Depletion', f1: '0.96', latency: '5ms', status: 'Active' },
];

// Mock Hardware Data
const HARDWARE_TELEMETRY = [
  { subject: 'GPU Memory', A: 85, fullMark: 100 },
  { subject: 'Compute Load', A: 92, fullMark: 100 },
  { subject: 'PCIe Bandwidth', A: 45, fullMark: 100 },
  { subject: 'Power Draw', A: 78, fullMark: 100 },
  { subject: 'Temp (C°)', A: 82, fullMark: 100 },
  { subject: 'VRAM Swap', A: 10, fullMark: 100 },
];

export const MLOps = () => {
  const [metrics, setMetrics] = useState<AIModelMetric[]>([]);
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
        if (data.epochs && Array.isArray(data.epochs)) {
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
          <h1>AI Operations Command Center</h1>
          <p className="subtitle">Model health, hardware telemetry, and version control</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={triggerRetrain} 
          disabled={training || loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {training ? (
            <>
              <Activity size={18} className="spin-anim" /> Backpropagation Active...
            </>
          ) : (
            <>
              <RotateCcw size={18} /> Trigger Edge Retraining
            </>
          )}
        </button>
      </div>

      {/* Advanced KPIs */}
      <div className="mlops-kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon primary"><Zap size={24} /></div>
          <div className="kpi-info">
            <h3>Avg Inference Latency</h3>
            <span>24<small>ms</small></span>
          </div>
        </div>
        <div className="kpi-card glass-panel">
          <div className="kpi-icon danger"><Server size={24} /></div>
          <div className="kpi-info">
            <h3>GPU Compute Load</h3>
            <span>92<small>%</small></span>
          </div>
        </div>
        <div className="kpi-card glass-panel">
          <div className="kpi-icon success"><Target size={24} /></div>
          <div className="kpi-info">
            <h3>Global F1 Score</h3>
            <span>0.98</span>
          </div>
        </div>
        <div className="kpi-card glass-panel">
          <div className="kpi-icon warning"><Database size={24} /></div>
          <div className="kpi-info">
            <h3>Training Datapoints</h3>
            <span>1.2<small>M</small></span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="mlops-charts-grid">
        {/* Main Training Curve */}
        <div className="chart-panel glass-panel">
          <h2 className="panel-title"><Activity size={18} className="text-accent" /> Training Convergence (BCE Loss vs Accuracy)</h2>
          <div className="chart-wrapper">
            {loading ? (
              <div className="loading-state">Loading AI Metrics...</div>
            ) : metrics.length === 0 ? (
              <div className="loading-state">No model data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
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
                  <XAxis dataKey="epoch" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis yAxisId="left" stroke="#ef4444" domain={[0, 'dataMax']} tick={{fill: '#ef4444', fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[0, 100]} tick={{fill: '#10b981', fontSize: 12}} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }} />
                  <Area yAxisId="left" type="monotone" dataKey="loss" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoss)" name="BCE Loss" />
                  <Area yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAcc)" name="Accuracy (%)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hardware Telemetry */}
        <div className="chart-panel glass-panel">
          <h2 className="panel-title"><Cpu size={18} className="text-danger" /> Hardware Telemetry</h2>
          <div className="chart-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={HARDWARE_TELEMETRY}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="RTX 4090 (Edge)" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Registry Ledger */}
      <div className="registry-wrapper glass-panel">
        <h2 className="panel-title" style={{ marginBottom: '16px' }}><ShieldCheck size={18} className="text-success" /> Model Deployment Registry</h2>
        <table className="registry-table">
          <thead>
            <tr>
              <th>Version ID</th>
              <th>Architecture</th>
              <th>Purpose</th>
              <th>F1 Score</th>
              <th>Latency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MODEL_REGISTRY.map((model, idx) => (
              <tr key={idx}>
                <td className="version">{model.id}</td>
                <td>{model.arch}</td>
                <td>{model.purpose}</td>
                <td style={{ fontWeight: 600 }}>{model.f1}</td>
                <td>{model.latency}</td>
                <td>
                  <span className={`badge ${model.status === 'Active' ? 'status-active' : model.status === 'Archived' ? 'status-archived' : 'status-failed'}`}>
                    {model.status === 'Failed' && <AlertCircle size={12} />}
                    {model.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
