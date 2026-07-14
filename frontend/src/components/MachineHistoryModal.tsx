import { useEffect, useState } from 'react';
import { X, Activity, Play, Pause, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import './MachineHistoryModal.css';

/**
 * 3D Hologram Component
 */
const MachineHologram = ({ temperature }: { temperature: number }) => {
  // Determine color based on temperature
  const getGlowColor = () => {
    if (temperature < 60) return '#3b82f6'; // Safe (Blue)
    if (temperature < 85) return '#f59e0b'; // Warning (Orange)
    return '#ef4444'; // Critical (Red)
  };

  const glowColor = getGlowColor();

  const groupRef = React.useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Base */}
      <Box args={[3, 0.5, 2]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#1e293b" wireframe />
      </Box>
      
      {/* Engine Core */}
      <Cylinder args={[0.8, 0.8, 2, 16]} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} />
      </Cylinder>
      
      {/* Top Vents */}
      <Box args={[1.5, 0.2, 1]} position={[0, 1.6, 0]}>
        <meshStandardMaterial color="#334155" wireframe />
      </Box>

      {/* Floating Rings */}
      <Cylinder args={[1, 1, 0.1, 32]} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={5} wireframe />
      </Cylinder>
    </group>
  );
};

import React from 'react';

/**
 * @interface MachineHistoryModalProps
 * @description Properties for the Machine History & AI Forecasting Modal
 */
interface MachineHistoryModalProps {
  machineId: number | null;
  onClose: () => void;
}

/**
 * @component MachineHistoryModal
 * @description Renders a modal overlay containing dual-line Recharts visualizing:
 * 1. Historical thermodynamic telemetry (fetched from PostgreSQL)
 * 2. Future predicted trajectory (fetched via PyTorch LSTM inference)
 */
export const MachineHistoryModal = ({ machineId, onClose }: MachineHistoryModalProps) => {
  useTranslation();
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

  const setMachineStatus = async (status: string) => {
    if (!machineId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/api/machines/${machineId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      // The backend will broadcast a WebSocket 'telemetry_update' which the dashboard will catch.
    } catch (err) {
      console.error('Failed to set machine status:', err);
    }
  };

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
        
        <div className="modal-content split-layout">
          {/* Left Side: 3D Hologram */}
          <div className="hologram-container glass-panel">
            {history.length > 0 && (
              <>
                <div className="hologram-overlay-text">
                  <span className="live-badge">LIVE SENSOR</span>
                  <div className="temp-display" style={{ color: history[history.length - 1]?.temperature > 85 ? '#ef4444' : history[history.length - 1]?.temperature > 60 ? '#f59e0b' : '#38bdf8' }}>
                    {history[history.length - 1]?.temperature.toFixed(1)}°C
                  </div>
                </div>
                <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
                  <ambientLight intensity={0.2} />
                  <pointLight position={[10, 10, 10]} />
                  <MachineHologram temperature={history[history.length - 1]?.temperature || 50} />
                  <OrbitControls enableZoom={false} autoRotate={false} />
                  <EffectComposer>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                  </EffectComposer>
                </Canvas>
              </>
            )}
            {loading && <div className="loading-spinner">Initializing 3D Matrix...</div>}
          </div>

          {/* Right Side: Charts & Controls */}
          <div className="analytics-container">
            {loading ? (
              <div className="loading-spinner">Running PyTorch LSTM Inference...</div>
            ) : (
              <div className="chart-container" style={{ height: '300px', width: '100%' }}>
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
                
                {/* Bi-directional Control Panel */}
                <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '12px' }}>Command & Control (Bi-directional Link)</h3>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setMachineStatus('Running')}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
                    >
                      <Play size={16} /> Start
                    </button>
                    <button 
                      onClick={() => setMachineStatus('Idle')}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
                    >
                      <Pause size={16} /> Halt
                    </button>
                    <button 
                      onClick={() => setMachineStatus('Maintenance')}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
                    >
                      <AlertTriangle size={16} /> Maintenance
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
