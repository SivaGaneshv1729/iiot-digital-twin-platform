import { useEffect, useState } from 'react';
import { X, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import './MachineHistoryModal.css';

interface MachineHistoryModalProps {
  machineId: number | null;
  onClose: () => void;
}

export const MachineHistoryModal = ({ machineId, onClose }: MachineHistoryModalProps) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (machineId) {
      setLoading(true);
      const token = localStorage.getItem('token');
      fetch(`http://localhost:4000/api/machines/${machineId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          // Format timestamps for display
          const formatted = data.map((d: any) => ({
            ...d,
            time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }));
          setHistory(formatted);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [machineId]);

  if (!machineId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Activity className="text-accent" />
            <h2>Machine #{machineId} Historical Analytics</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="loading-spinner">Loading Time-Series Data...</div>
          ) : (
            <div className="chart-container" style={{ height: '300px', width: '100%', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickFormatter={(val) => `${val}°C`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#38bdf8" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
