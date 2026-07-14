import { useEffect, useState } from 'react';
import { X, Activity, Play, Pause, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Environment, ContactShadows } from '@react-three/drei';
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
  
  // Animation speed scales with temperature (e.g. hotter = faster)
  const animSpeed = Math.max(1, (temperature / 30)); 

  const mainGroupRef = React.useRef<THREE.Group>(null);
  const fanRef1 = React.useRef<THREE.Mesh>(null);
  const fanRef2 = React.useRef<THREE.Mesh>(null);
  
  // Piston refs
  const p1 = React.useRef<THREE.Mesh>(null);
  const p2 = React.useRef<THREE.Mesh>(null);
  const p3 = React.useRef<THREE.Mesh>(null);
  const p4 = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Slowly rotate the entire assembly
    if (mainGroupRef.current) {
      mainGroupRef.current.rotation.y = t * 0.2;
      mainGroupRef.current.position.y = Math.sin(t * 2) * 0.05; // slight hover
    }
    
    // Spin cooling fans
    if (fanRef1.current) fanRef1.current.rotation.y = t * 5 * animSpeed;
    if (fanRef2.current) fanRef2.current.rotation.y = -t * 5 * animSpeed;
    
    // Pump pistons in sequence
    if (p1.current) p1.current.position.y = Math.sin(t * 10 * animSpeed) * 0.4 + 0.2;
    if (p2.current) p2.current.position.y = Math.sin(t * 10 * animSpeed + Math.PI/2) * 0.4 + 0.2;
    if (p3.current) p3.current.position.y = Math.sin(t * 10 * animSpeed + Math.PI) * 0.4 + 0.2;
    if (p4.current) p4.current.position.y = Math.sin(t * 10 * animSpeed + Math.PI*1.5) * 0.4 + 0.2;
  });

  return (
    <group ref={mainGroupRef} position={[0, -0.5, 0]}>
      
      {/* 1. Transparent Cybernetic Outer Casing */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 1.5]} />
        <meshPhysicalMaterial 
          color="#a8b2c1" 
          transmission={0.9} // Glass effect
          opacity={1}
          metalness={0.8}
          roughness={0.1}
          ior={1.5}
          thickness={0.5}
          transparent
        />
      </mesh>
      
      <Box args={[3.1, 2.1, 1.6]} position={[0, 1, 0]}>
        <meshBasicMaterial color={glowColor} wireframe transparent opacity={0.15} />
      </Box>

      {/* 2. Base Plate */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[3.4, 0.2, 1.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.4} />
      </mesh>

      {/* 3. Internal Working Systems (Pistons & Cylinders) */}
      <group position={[0, 0.5, 0]}>
        {[-1, -0.33, 0.33, 1].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            {/* Cylinder Housing */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 1, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Piston Head */}
            <mesh ref={i === 0 ? p1 : i === 1 ? p2 : i === 2 ? p3 : p4}>
              <cylinderGeometry args={[0.22, 0.22, 0.4, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. Glowing Energy Core */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2.8, 0.1, 1.2]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={5} />
      </mesh>

      {/* 5. Cooling Fans on Top */}
      <group position={[0, 2.1, 0]}>
        <mesh position={[-0.8, 0, 0]} ref={fanRef1}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.8, 0, 0]} ref={fanRef2}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

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
                <Canvas camera={{ position: [5, 4, 5], fov: 40 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  
                  {/* Studio Environment for highly realistic reflections on metal/glass */}
                  <Environment preset="city" />

                  <MachineHologram temperature={history[history.length - 1]?.temperature || 50} />
                  
                  {/* High quality contact shadow under the machine */}
                  <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.6} far={10} color="#000" position={[0, -0.6, 0]} />
                  
                  <OrbitControls enableZoom={false} autoRotate={false} minPolarAngle={Math.PI/4} maxPolarAngle={Math.PI/2} />
                  
                  <EffectComposer>
                    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
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
