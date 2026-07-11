import { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, Wifi } from 'lucide-react';
import { io } from 'socket.io-client';
import './Machines.css';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  running_hours: number;
  last_maintenance: string | null;
}

const MachineCard = ({ machine, userRole }: { machine: Machine, userRole: string }) => {
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
        <h2>{machine.name}</h2>
        <span className={`status-badge status-${machine.status}`}>
          {machine.status}
        </span>
      </div>
      
      <div className="machine-stats">
        <div className="stat-row">
          <Activity size={18} className="stat-icon" />
          <span className="stat-label">Temperature:</span>
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

      <div className="machine-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        {!isAdmin && (
          <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', color: '#ef4444' }}>
            🔒 Admin Access Required
          </div>
        )}
        {isAdmin && (
          <>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.2)' }}
              onClick={() => updateStatus('Running')}
            >
              Start
            </button>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.2)' }}
              onClick={() => updateStatus('Idle')}
            >
              Stop
            </button>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.2)' }}
              onClick={() => updateStatus('Maintenance')}
            >
              Maint.
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const Machines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'Operator';

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

  return (
    <div className="machines-container">
      <div className="machines-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Machine Fleet Management</h1>
          <p className="subtitle">Monitor and manage all factory machines</p>
        </div>
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}` }}>
          <Wifi size={16} className={isConnected ? 'pulse' : ''} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? 'IoT Stream Live' : 'IoT Disconnected'}</span>
        </div>
      </div>

      <div className="machines-grid">
        {machines.map(machine => (
          <MachineCard key={machine.id} machine={machine} userRole={userRole} />
        ))}
      </div>
    </div>
  );
};
