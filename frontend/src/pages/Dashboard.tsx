import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Zap, CheckCircle, Wifi, TrendingUp, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { ModelMetrics } from '../components/ModelMetrics';
import { DigitalTwin } from '../components/DigitalTwin';
import './Dashboard.css';

const mockChartData = [
  { time: '08:00', output: 120 },
  { time: '10:00', output: 150 },
  { time: '12:00', output: 130 },
  { time: '14:00', output: 180 },
  { time: '16:00', output: 160 },
  { time: '18:00', output: 210 },
];

export const Dashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({ active_machines: 0, total_target: 0, total_completed: 0, efficiency: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [liveMachines, setLiveMachines] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    fetch('http://localhost:4000/api/production/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error(err));

    fetch('http://localhost:4000/api/machines', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setLiveMachines(data))
      .catch(err => console.error(err));

    const socket = io('http://localhost:4000');
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('telemetry_update', (machines: any[]) => {
      setLiveMachines(machines);
      const active = machines.filter(m => m.status === 'Running').length;
      setSummary(prev => ({ ...prev, active_machines: active }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('Factory Overview')}</h1>
          <p className="subtitle">{t('Real-time production and machine telemetry')}</p>
        </div>
        
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}` }}>
          <Wifi size={16} className={isConnected ? 'pulse' : ''} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? t('IoT Stream Live') : t('IoT Disconnected')}</span>
        </div>
      </div>

      <DigitalTwin machines={liveMachines} />

      {/* OEE Metrics Grid */}
      <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{t('Overall Equipment Effectiveness')}</h3>
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper blue">
            <Zap size={24} />
          </div>
          <div className="kpi-content">
            <h3>{t('Availability')}</h3>
            <div className="kpi-value">
              {summary.active_machines > 0 ? '98.2%' : '0%'}
            </div>
          </div>
        </div>
        
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper purple">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <h3>{t('Performance')}</h3>
            <div className="kpi-value">{summary.efficiency}%</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper green">
            <ShieldCheck size={24} />
          </div>
          <div className="kpi-content">
            <h3>{t('Quality')}</h3>
            <div className="kpi-value">
              {summary.total_target > 0 ? Math.round((summary.total_completed / summary.total_target) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      <ModelMetrics />

      <div className="charts-section glass-panel">
        <div className="chart-header">
          <h2>{t('Production Output Today')}</h2>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{fill: '#94a3b8'}} />
              <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13141f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Line type="monotone" dataKey="output" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
