import { useEffect, useState } from 'react';
import { Activity, Clock, Settings2, AlertTriangle, Wifi } from 'lucide-react';
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

const MachineCard = ({ machine }: { machine: Machine }) => {
  const [failureProb, setFailureProb] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Fetch AI prediction for this machine
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
  }, [machine.temperature, machine.running_hours]); // Re-run when telemetry changes

  const isHighRisk = failureProb !== null && failureProb > 75;

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

      <div className="machine-actions">
        <button className="btn-secondary">
          <Settings2 size={16} /> Manage
        </button>
      </div>
    </div>
  );
};

export const Machines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Initial fetch
    fetch('http://localhost:4000/api/machines', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMachines(data))
      .catch(err => console.error(err));

    // Connect WebSocket
    const socket = io('http://localhost:4000');
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('telemetry_update', (liveMachines: Machine[]) => {
      setMachines(liveMachines);
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
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </div>
  );
};
