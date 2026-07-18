import { useEffect, useState } from 'react';
import { 
  Activity, Clock, AlertTriangle, Wifi,
  Settings, Zap, BarChart2, Server, LayoutGrid, List
} from 'lucide-react';
import { io } from 'socket.io-client';
import { MachineHistoryModal } from '../components/MachineHistoryModal';
import { DataTable, type Column } from '../components/DataTable';
import './Machines.css';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  running_hours: number;
  last_maintenance: string | null;
}

const MachineCard = ({ machine, userRole, onOpenAnalytics }: { machine: Machine, userRole: string, onOpenAnalytics: (id: number) => void }) => {
  const [failureProb, setFailureProb] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/ai/predict/maintenance', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        temperature: machine.temperature,
        running_hours: machine.running_hours
      })
    })
      .then(res => res.json())
      .then(data => setFailureProb(data.failure_probability))
      .catch(err => console.error(err));
  }, [machine.temperature, machine.running_hours]);

  const isHighRisk = failureProb !== null && failureProb > 75;
  const isAdmin = userRole === 'Admin';

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:4000/api/machines/${machine.id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating status');
    }
  };

  return (
    <div className={`machine-card glass-panel ${isHighRisk ? 'high-risk' : ''}`}>
      <div className="machine-card-header">
        <h2><Server size={18} className="text-accent"/> {machine.name}</h2>
        <span className={`status-badge status-${machine.status}`}>
          {machine.status}
        </span>
      </div>
      
      <div className="machine-stats">
        <div className="stat-row">
          <Activity size={18} className="stat-icon" />
          <span className="stat-label">Core Temperature:</span>
          <span className="stat-value">{machine.temperature}°C</span>
        </div>
        <div className="stat-row">
          <Clock size={18} className="stat-icon" />
          <span className="stat-label">Running Hours:</span>
          <span className="stat-value">{machine.running_hours}h</span>
        </div>
        
        {/* AI Health Score */}
        <div className="stat-row ai-health">
          <AlertTriangle size={18} className={isHighRisk ? 'text-danger' : 'text-success'} />
          <span className="stat-label">AI Failure Risk:</span>
          <span className={`stat-value ${isHighRisk ? 'text-danger' : 'text-success'}`}>
            {failureProb !== null ? `${failureProb}%` : 'Calculating...'}
          </span>
        </div>
      </div>

      <div className="machine-actions">
        <button 
          className="btn-ai-analytics" 
          onClick={() => onOpenAnalytics(machine.id)}
        >
          <BarChart2 size={16} /> Open AI Telemetry
        </button>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {!isAdmin && (
            <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', color: '#ef4444', padding: '8px' }}>
              🔒 Admin Access Required
            </div>
          )}
          {isAdmin && (
            <>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                onClick={() => updateStatus('Running')}
              >
                Start
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                onClick={() => updateStatus('Idle')}
              >
                Stop
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                onClick={() => updateStatus('Maintenance')}
              >
                Maint.
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const Machines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'Operator';
  const isAdmin = userRole === 'Admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Initial fetch
    fetch('http://localhost:4000/api/machines', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    // Connect WebSocket
    const socket = io('http://localhost:4000');
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('telemetry_update', (liveMachines: Machine[]) => {
      if (Array.isArray(liveMachines)) {
        setMachines(liveMachines);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Calculate Fleet KPIs
  const totalMachines = machines.length;
  const runningMachines = machines.filter(m => m.status === 'Running').length;
  const avgTemp = totalMachines > 0 
    ? (machines.reduce((acc, m) => acc + (typeof m.temperature === 'number' ? m.temperature : parseFloat(m.temperature)), 0) / totalMachines).toFixed(1)
    : 0;
  
  // Mock OEE calculation for presentation: (Running / Total) * 0.95 (Performance) * 0.99 (Quality)
  const oee = totalMachines > 0 
    ? ((runningMachines / totalMachines) * 0.95 * 0.99 * 100).toFixed(1) 
    : 0;

  const updateMachineStatus = async (machineId: number, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:4000/api/machines/${machineId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating status');
    }
  };

  const columns: Column<Machine>[] = [
    { key: 'name', label: 'Node Name', render: (row) => <span style={{ fontWeight: 'bold' }}><Server size={14} style={{ display: 'inline', marginRight: '6px' }}/>{row.name}</span> },
    { key: 'status', label: 'Status', render: (row) => <span className={`status-badge status-${row.status}`}>{row.status}</span> },
    { key: 'temperature', label: 'Core Temp', render: (row) => <span>{row.temperature}°C</span> },
    { key: 'running_hours', label: 'Uptime', render: (row) => <span>{row.running_hours}h</span> },
    { key: 'actions', label: 'Controls', sortable: false, render: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setSelectedMachineId(row.id)}>
          <BarChart2 size={12} style={{ display: 'inline', marginRight: '4px' }}/> Telemetry
        </button>
        {isAdmin && (
          <>
            <button style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }} onClick={() => updateMachineStatus(row.id, 'Running')}>Start</button>
            <button style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px' }} onClick={() => updateMachineStatus(row.id, 'Idle')}>Stop</button>
          </>
        )}
      </div>
    )}
  ];

  return (
    <div className="machines-container">
      <div className="machines-header">
        <div>
          <h1>Fleet & OEE Command Center</h1>
          <p className="subtitle">Global equipment effectiveness and predictive AI node analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="view-toggles" style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ padding: '6px 12px', background: viewMode === 'grid' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'grid' ? '#3b82f6' : '#94a3b8', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LayoutGrid size={16} /> Grid
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{ padding: '6px 12px', background: viewMode === 'table' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'table' ? '#3b82f6' : '#94a3b8', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <List size={16} /> Registry
            </button>
          </div>
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <Wifi size={16} className={isConnected ? 'pulse' : ''} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? 'IoT Stream Live' : 'IoT Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Fleet KPI Banner */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card glass-panel">
          <Zap size={32} className="text-accent" />
          <div className="fleet-kpi-info">
            <h3>Global Fleet OEE</h3>
            <span>{oee}<small>%</small></span>
          </div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Activity size={32} className="text-success" />
          <div className="fleet-kpi-info">
            <h3>Active Nodes</h3>
            <span>{runningMachines} <small>/ {totalMachines}</small></span>
          </div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Settings size={32} className="text-warning" />
          <div className="fleet-kpi-info">
            <h3>Avg Core Temp</h3>
            <span>{avgTemp}<small>°C</small></span>
          </div>
        </div>
      </div>

      {/* Machines View */}
      {viewMode === 'grid' ? (
        <div className="machines-grid">
          {machines.map(machine => (
            <MachineCard 
              key={machine.id} 
              machine={machine} 
              userRole={userRole} 
              onOpenAnalytics={(id) => setSelectedMachineId(id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', marginTop: '24px' }}>
          <DataTable 
            data={machines} 
            columns={columns} 
            searchPlaceholder="Search equipment registry..." 
            itemsPerPage={10} 
          />
        </div>
      )}

      {/* Machine History & AI Forecast Modal */}
      {selectedMachineId && (
        <MachineHistoryModal 
          machineId={selectedMachineId} 
          onClose={() => setSelectedMachineId(null)} 
        />
      )}
    </div>
  );
};
