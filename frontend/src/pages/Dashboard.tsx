import { useEffect, useState } from 'react';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Zap, ShieldCheck, Wifi, TrendingUp, AlertTriangle, Clock, Server
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { ModelMetrics } from '../components/ModelMetrics';
import { DigitalTwin } from '../components/DigitalTwin';
import { MachineHistoryModal } from '../components/MachineHistoryModal';
import './Dashboard.css';

// Complex dataset for ComposedChart (Dual-Axis)
const mockAdvancedChartData = [
  { time: '08:00', output: 120, target: 125, energy: 400 },
  { time: '10:00', output: 150, target: 145, energy: 480 },
  { time: '12:00', output: 130, target: 135, energy: 420 },
  { time: '14:00', output: 180, target: 175, energy: 590 },
  { time: '16:00', output: 160, target: 165, energy: 520 },
  { time: '18:00', output: 210, target: 205, energy: 680 },
];

const initialEvents = [
  { id: 1, time: '18:12', title: 'AI Prediction: Axis-M bearing wear detected', type: 'ai' },
  { id: 2, time: '18:10', title: 'Conveyor 2 throughput optimized', type: 'system' },
  { id: 3, time: '17:55', title: 'Minor temperature spike on CNC-1', type: 'alert' },
  { id: 4, time: '17:30', title: 'Shift 3 production target updated', type: 'system' },
  { id: 5, time: '17:15', title: 'Scheduled maintenance logged for Robot Arm', type: 'system' },
];

/**
 * @component Dashboard
 * @description The High Enterprise Command Center.
 * Features a 6-metric KPI grid, dual-axis ComposedChart data visualization, 
 * live WebGL 3D Digital Twin, and a real-time system event stream.
 */
export const Dashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({ active_machines: 0, total_target: 0, total_completed: 0, efficiency: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [liveMachines, setLiveMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Fetch production summary
    fetch('http://localhost:4000/api/production/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error(err));

    // Fetch initial machines
    fetch('http://localhost:4000/api/machines', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setLiveMachines(data))
      .catch(err => console.error(err));

    // Initialize WebSockets
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
          <h1>{t('Global Command Center')}</h1>
          <p className="subtitle">{t('Enterprise IoT Telemetry & Advanced AI Analytics')}</p>
        </div>
        
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}` }}>
          <Wifi size={16} className={isConnected ? 'pulse' : ''} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? t('IoT Stream Live') : t('IoT Disconnected')}</span>
        </div>
      </div>

      <DigitalTwin machines={liveMachines} onSelectMachine={setSelectedMachineId} />
      <MachineHistoryModal machineId={selectedMachineId} onClose={() => setSelectedMachineId(null)} />

      {/* Expanded 6-Metric Enterprise KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper blue">
            <Zap size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('OEE Score')}</h3>
            <div className="kpi-value">
              {summary.active_machines > 0 ? '92.4%' : '0%'}
            </div>
          </div>
        </div>
        
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper green">
            <Activity size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('Energy Draw (kWh)')}</h3>
            <div className="kpi-value">
              {summary.active_machines > 0 ? '1,420' : '0'}
            </div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper purple">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('Yield Rate')}</h3>
            <div className="kpi-value">{summary.efficiency}%</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper orange">
            <Server size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('Fleet Uptime')}</h3>
            <div className="kpi-value">
              99.8%
            </div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper cyan">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('MTTR (Hours)')}</h3>
            <div className="kpi-value">
              2.4
            </div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper red">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-content">
            <h3>{t('Active Anomalies')}</h3>
            <div className="kpi-value">
              {liveMachines.filter(m => m.status === 'Warning' || m.status === 'Error').length}
            </div>
          </div>
        </div>
      </div>

      <ModelMetrics />

      {/* Advanced Lower Section: Chart + Event Stream */}
      <div className="dashboard-lower-grid">
        
        {/* Complex Dual-Axis Chart */}
        <div className="charts-section glass-panel">
          <div className="chart-header">
            <h2>{t('Production Output vs Energy Consumption')}</h2>
            <div className="chart-legend-custom">
              <div className="chart-legend-item">
                <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }}></div> Output
              </div>
              <div className="chart-legend-item">
                <div style={{ width: 12, height: 12, background: '#10b981', opacity: 0.3, borderRadius: 2 }}></div> Energy
              </div>
              <div className="chart-legend-item">
                <div style={{ width: 12, height: 2, background: '#f59e0b' }}></div> AI Target
              </div>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mockAdvancedChartData}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                
                {/* Left Y Axis for Output/Target */}
                <YAxis yAxisId="left" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                
                {/* Right Y Axis for Energy */}
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                
                {/* Energy Area (Right Axis) */}
                <Area yAxisId="right" type="monotone" dataKey="energy" fill="url(#colorEnergy)" stroke="#10b981" />
                
                {/* Output Bar (Left Axis) */}
                <Bar yAxisId="left" dataKey="output" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                
                {/* AI Target Line (Left Axis) */}
                <Line yAxisId="left" type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Factory Event Stream */}
        <div className="event-stream-section glass-panel">
          <div className="event-stream-header">
            <h2><div className="live-dot"></div> System Activity Feed</h2>
          </div>
          <div className="event-list">
            {initialEvents.map(event => (
              <div className="event-item" key={event.id}>
                <div className="event-time">{event.time}</div>
                <div className="event-details">
                  <span className={`event-type ${event.type}`}>{event.type}</span>
                  <span className="event-title">{event.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
