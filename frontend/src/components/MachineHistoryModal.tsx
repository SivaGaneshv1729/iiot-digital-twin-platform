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
      
      // 1. Fetch History
      fetch(`http://localhost:4000/api/machines/${machineId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(async data => {
          // Format timestamps for display
          let formatted = data.map((d: any) => ({
            ...d,
            time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            temperature: parseFloat(d.temperature)
          }));
          
          // 2. Fetch AI Forecast (Phase 15)
          try {
            const tempsOnly = formatted.map((d: any) => d.temperature);
            const forecastRes = await fetch('http://localhost:4000/api/ai/forecast/temperature', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ history: tempsOnly })
            });
            
            if (forecastRes.ok) {
              const forecastData = await forecastRes.json();
              if (forecastData.forecast && formatted.length > 0) {
                const lastTime = new Date(data[data.length - 1].time);
                const forecastPoints = forecastData.forecast.map((temp: number, i: number) => {
                  const futureTime = new Date(lastTime.getTime() + (i + 1) * 2000); // add 2 seconds per point
                  return {
                    time: futureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    forecast_temperature: temp
                  };
                });
                
                // Tie the lines together by setting forecast_temperature on the last historical point
                formatted[formatted.length - 1].forecast_temperature = formatted[formatted.length - 1].temperature;
                formatted = [...formatted, ...forecastPoints];
              }
            }
          } catch (err) {
            console.error('Forecast failed:', err);
          }
          
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
            <h2>Machine #{machineId} Analytics & AI Forecast</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="loading-spinner">Running PyTorch LSTM Inference...</div>
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
                    name="Historical Temperature"
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#38bdf8" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                  <Line 
                    name="AI Predicted Forecast"
                    type="monotone" 
                    dataKey="forecast_temperature" 
                    stroke="#c084fc" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 6, fill: '#c084fc', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '0.85rem' }}>
                <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '3px', backgroundColor: '#38bdf8' }}></div> Historical Data
                </span>
                <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '3px', backgroundColor: '#c084fc', borderBottom: '2px dashed #c084fc' }}></div> PyTorch LSTM Forecast
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
