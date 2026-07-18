import { useEffect, useState, useRef } from 'react';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart 
} from 'recharts';
import { 
  Activity, Zap, Wifi, DollarSign, Leaf, Clock, Download, AlertOctagon, Bell, Mic, Power, Database, Target, ShieldCheck, ArrowRight
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DigitalTwin } from '../components/DigitalTwin';
import { MachineHistoryModal } from '../components/MachineHistoryModal';

import { ErrorBoundary } from '../components/ErrorBoundary';
import './Dashboard.css';

// Initial Base Data for the Chart
const INITIAL_CHART_DATA = [
  { time: '08:00', output: 120, target: 125, energy: 400 },
  { time: '10:00', output: 150, target: 145, energy: 480 },
  { time: '12:00', output: 130, target: 135, energy: 420 },
  { time: '14:00', output: 180, target: 175, energy: 590 },
  { time: '16:00', output: 160, target: 165, energy: 520 },
  { time: '18:00', output: 210, target: 205, energy: 680 },
];

const INITIAL_RISK_DATA = [
  { time: 'Mon', risk: 12, threshold: 30 },
  { time: 'Tue', risk: 15, threshold: 30 },
  { time: 'Wed', risk: 10, threshold: 30 },
  { time: 'Thu', risk: 28, threshold: 30 },
  { time: 'Fri', risk: 14, threshold: 30 },
  { time: 'Sat', risk: 9, threshold: 30 },
  { time: 'Sun', risk: 8, threshold: 30 },
];

interface PrescriptiveAction {
  id: number;
  time: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'dismissed';
}

const INITIAL_ACTIONS: PrescriptiveAction[] = [
  { id: 1, time: 'Just now', title: 'Reroute Conveyor B', description: 'AI predicts a 94% chance of bottleneck on Conveyor A in 15 mins. Rerouting will save $2,400 in downtime.', priority: 'high', status: 'pending' },
  { id: 2, time: '4 mins ago', title: 'Throttle CNC-1 Power', description: 'Thermal threshold approaching. Throttling power by 10% will prevent overheating without impacting yield targets.', priority: 'medium', status: 'pending' },
  { id: 3, time: '12 mins ago', title: 'Trigger Predictive Maintenance', description: 'Robot Arm #3 showing abnormal vibration frequency. Recommend scheduling maintenance for 3rd shift.', priority: 'high', status: 'pending' },
];

export const Dashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({ active_machines: 0, total_target: 0, total_completed: 0, efficiency: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [liveMachines, setLiveMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [dvrTime, setDvrTime] = useState<number>(0);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [thermalMode, setThermalMode] = useState(false);
  const [aiHeatmapMode, setAiHeatmapMode] = useState(false);
  
  const [chartData, setChartData] = useState(INITIAL_CHART_DATA);
  const [riskData] = useState(INITIAL_RISK_DATA);
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [isListening, setIsListening] = useState(false);
  const [showDVR, setShowDVR] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Voice Command Recognized:", transcript);
        handleVoiceCommand(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [thermalMode, isEmergencyMode]);

  const handleVoiceCommand = (command: string) => {
    const synth = window.speechSynthesis;
    const speak = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      synth.speak(utterance);
    };

    if (command.includes('emergency stop')) {
      triggerEmergencyStop(true);
      speak('Emergency stop activated. All machines halted.');
    } else if (command.includes('thermal scan') || command.includes('thermal mode')) {
      setThermalMode(true);
      speak('Thermal scan mode activated.');
    } else if (command.includes('normal view') || command.includes('normal mode')) {
      setThermalMode(false);
      speak('Returning to normal view.');
    } else if (command.includes('export') || command.includes('report')) {
      generatePDF();
      speak('Exporting PDF report.');
    } else {
      speak('Command not recognized.');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const generatePDF = async () => {
    const dashboardElement = document.querySelector('.dashboard-container') as HTMLElement;
    if (!dashboardElement) return;

    try {
      const canvas = await html2canvas(dashboardElement, { scale: 2, backgroundColor: '#0a0a0f' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SmartFactory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev];
        const lastIndex = newData.length - 1;
        newData[lastIndex] = {
          ...newData[lastIndex],
          output: Math.max(180, Math.min(230, newData[lastIndex].output + (Math.random() * 10 - 5))),
          energy: Math.max(600, Math.min(750, newData[lastIndex].energy + (Math.random() * 20 - 10))),
        };
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleToggleThermal = () => setThermalMode(prev => !prev);
    const handleEStopEvent = () => triggerEmergencyStop();
    
    window.addEventListener('cmd_export_pdf', generatePDF);
    window.addEventListener('cmd_emergency_stop', handleEStopEvent);
    window.addEventListener('cmd_toggle_thermal', handleToggleThermal);
    return () => {
      window.removeEventListener('cmd_export_pdf', generatePDF);
      window.removeEventListener('cmd_emergency_stop', handleEStopEvent);
      window.removeEventListener('cmd_toggle_thermal', handleToggleThermal);
    };
  }, []);

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
      .then(data => setLiveMachines(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    const socket = io('http://localhost:4000');
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('telemetry_update', (machines: any[]) => {
      if (Array.isArray(machines)) {
        setLiveMachines(machines);
        const active = machines.filter(m => m.status === 'Running').length;
        setSummary(prev => ({ ...prev, active_machines: active }));
      }
    });
    
    socket.on('emergency_stop', () => {
      setIsEmergencyMode(true);
      setLiveMachines(prev => prev.map(m => ({ ...m, status: 'Maintenance' })));
      setSummary(prev => ({ ...prev, active_machines: 0 }));
    });

    socket.on('emergency_revoke', () => {
      setIsEmergencyMode(false);
      setLiveMachines(prev => prev.map(m => ({ ...m, status: 'Running' })));
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleAction = (id: number, status: 'approved' | 'dismissed') => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const triggerEmergencyStop = async (bypassConfirm = false) => {
    if (!bypassConfirm && !window.confirm("CRITICAL WARNING: This will immediately halt all factory production lines. Are you absolutely sure?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:4000/api/machines/emergency-stop', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      setIsEmergencyMode(true);
    } catch (err) {
      console.error("Failed to trigger E-Stop", err);
    }
  };

  const revokeEmergencyStop = async () => {
    if (!window.confirm("WARNING: This will restart all halted machines. Ensure the floor is clear. Proceed?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:4000/api/machines/emergency-revoke', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      setIsEmergencyMode(false);
    } catch (err) {
      console.error("Failed to revoke E-Stop", err);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
          alert("Already subscribed to Global Push Notifications.");
          return;
      }
      const response = await fetch('http://localhost:4000/api/push/vapidPublicKey', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const vapidPublicKey = await response.text();
      const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
      };
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
      });
      await fetch('http://localhost:4000/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
      });
      alert("Successfully subscribed to PWA Web Push Alerts!");
    } catch (err) {
      console.error("Push subscription failed:", err);
      alert("Failed to subscribe to Web Push (requires HTTPS or localhost in modern browsers). Check console.");
    }
  };

  const revenueAtRisk = liveMachines.filter(m => m.status === 'Error' || m.status === 'Maintenance').length * 4500;

  return (
    <div className={`dashboard-container ${isEmergencyMode ? 'emergency-mode-active' : ''}`}>
      {isEmergencyMode && (
        <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', animation: 'pulse 2s infinite' }}>
          <AlertOctagon size={24} /> CRITICAL ALERT: GLOBAL EMERGENCY STOP ACTIVATED. ALL MACHINES HALTED.
        </div>
      )}
      
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <h1>{t('Executive Command Center')}</h1>
          <p className="subtitle">{t('Bridging AI Telemetry with Business Financial Impact')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowDVR(!showDVR)}
            className={`glass-panel ${showDVR ? 'listening-pulse' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: showDVR ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid #38bdf8', fontWeight: 'bold' }}
            title="Toggle DVR Time-Travel"
          >
            <Clock size={16} />
            <span>DVR Time-Travel</span>
          </button>
          
          <button 
            onClick={() => setAiHeatmapMode(!aiHeatmapMode)}
            className={`glass-panel ${aiHeatmapMode ? 'listening-pulse' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: aiHeatmapMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid #f97316', fontWeight: 'bold' }}
            title="Toggle AI Anomaly Detection Heatmap Overlay"
          >
            <Activity size={16} />
            <span>AI Heatmap</span>
          </button>
          
          <button 
            onClick={subscribeToPush} 
            className="glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid #8b5cf6' }}
            title="Subscribe to Push Alerts"
          >
            <Bell size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable Alerts</span>
          </button>

          <button 
            onClick={generatePDF} 
            className="glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid #3b82f6' }}
            title={t('Download PDF Report')}
          >
            <Download size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('Export PDF')}</span>
          </button>
          
          {isEmergencyMode ? (
              <button 
                onClick={revokeEmergencyStop}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50 rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse"
              >
                <Power className="w-5 h-5" />
                <span className="font-bold tracking-wider">REVOKE E-STOP</span>
              </button>
            ) : (
              <button 
                onClick={() => triggerEmergencyStop()}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded-lg transition-all"
              >
                <Power className="w-5 h-5" />
                <span className="font-bold tracking-wider">E-STOP</span>
              </button>
            )}

          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}` }}>
            <Wifi size={16} className={isConnected ? 'pulse' : ''} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? t('IoT Stream Live') : t('IoT Disconnected')}</span>
          </div>
        </div>
      </div>

      {showDVR && (
        <div className="dvr-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
            <Clock size={20} />
            <span style={{ fontWeight: 'bold' }}>DVR Time-Travel:</span>
          </div>
          <input 
            type="range" 
            min="-24" 
            max="0" 
            value={dvrTime} 
            style={{ flexGrow: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setDvrTime(val);
              if (val === 0) {
                if (isEmergencyMode) revokeEmergencyStop();
                setAiHeatmapMode(false);
              } else if (val < -12) {
                triggerEmergencyStop(true);
              } else {
                if (isEmergencyMode) revokeEmergencyStop();
                setAiHeatmapMode(true);
              }
            }}
          />
          <div style={{ fontWeight: 'bold', color: dvrTime === 0 ? '#38bdf8' : '#f59e0b', minWidth: '120px', textAlign: 'right' }}>
            {dvrTime === 0 ? 'LIVE NOW' : `${Math.abs(dvrTime)} HOURS AGO`}
          </div>
        </div>
      )}

      <div className="dashboard-layout">
        


        {/* Center Main Area */}
        <div className="dashboard-main-center">
          <ErrorBoundary>
            <DigitalTwin machines={liveMachines} onSelectMachine={setSelectedMachineId} thermalMode={thermalMode} isEmergencyMode={isEmergencyMode} aiHeatmapMode={aiHeatmapMode} />
          </ErrorBoundary>
          
          <div className="kpi-grid">
            <div className="kpi-card glass-panel">
              <div className="kpi-icon-wrapper green"><Activity size={22} /></div>
              <div className="kpi-content">
                <h3>{t('OEE')}</h3>
                <div className="kpi-value">
                  {summary.active_machines > 0 ? '94.2%' : '0%'}
                  {summary.active_machines > 0 && <span style={{ color: '#10b981', fontSize: '0.8rem', marginLeft: '4px' }}>+1.2%</span>}
                </div>
              </div>
            </div>
            <div className="kpi-card glass-panel">
              <div className="kpi-icon-wrapper blue"><Database size={22} /></div>
              <div className="kpi-content">
                <h3>{t('Total Production')}</h3>
                <div className="kpi-value">
                  {summary.active_machines > 0 ? '18,634' : '0'}
                  {summary.active_machines > 0 && <span style={{ color: '#10b981', fontSize: '0.8rem', marginLeft: '4px' }}>+8.7%</span>}
                </div>
              </div>
            </div>
            <div className="kpi-card glass-panel">
              <div className="kpi-icon-wrapper purple"><Clock size={22} /></div>
              <div className="kpi-content">
                <h3>{t('Downtime')}</h3>
                <div className="kpi-value">
                  1.32 <small>hrs</small>
                  <span style={{ color: '#ef4444', fontSize: '0.8rem', marginLeft: '4px' }}>+12.4%</span>
                </div>
              </div>
            </div>
            <div className="kpi-card glass-panel">
              <div className="kpi-icon-wrapper orange"><Zap size={22} /></div>
              <div className="kpi-content">
                <h3>{t('Energy')}</h3>
                <div className="kpi-value">
                  24.5 <small>MWh</small>
                  <span style={{ color: '#10b981', fontSize: '0.8rem', marginLeft: '4px' }}>-5.3%</span>
                </div>
              </div>
            </div>
            <div className="kpi-card glass-panel">
              <div className="kpi-icon-wrapper cyan"><Target size={22} /></div>
              <div className="kpi-content">
                <h3>{t('Quality Rate')}</h3>
                <div className="kpi-value">
                  98.3%
                  <span style={{ color: '#10b981', fontSize: '0.8rem', marginLeft: '4px' }}>+2.1%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="charts-bottom-row">
            <div className="charts-section glass-panel">
              <div className="chart-header">
                <h2>{t('Production vs Energy Draw')}</h2>
                <div className="chart-legend-custom">
                  <div className="chart-legend-item">
                    <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }}></div> Output
                  </div>
                  <div className="chart-legend-item">
                    <div style={{ width: 12, height: 12, background: '#10b981', opacity: 0.3, borderRadius: 2 }}></div> Energy
                  </div>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorEnergyDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis yAxisId="left" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area yAxisId="right" type="monotone" dataKey="energy" fill="url(#colorEnergyDash)" stroke="#10b981" isAnimationActive={false} />
                    <Bar yAxisId="left" dataKey="output" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="charts-section glass-panel">
              <div className="chart-header">
                <h2>{t('Predictive Risk')}</h2>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={riskData}>
                    <defs>
                      <linearGradient id="colorRiskDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="risk" fill="url(#colorRiskDash)" stroke="#f43f5e" strokeWidth={2} isAnimationActive={false} />
                    <Line type="stepAfter" dataKey="threshold" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="dashboard-sidebar-right">
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
             <h3 style={{ fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', alignSelf: 'flex-start', fontWeight: 'bold' }}>Campus Status</h3>
             <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <svg width="160" height="160" viewBox="0 0 160 160">
                 <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                 <circle cx="80" cy="80" r="70" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="440" strokeDashoffset="96.8" strokeLinecap="round" transform="rotate(-90 80 80)" />
               </svg>
               <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f8fafc' }}>78<span style={{ fontSize: '1rem' }}>%</span></span>
                 <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Overall Health</span>
               </div>
             </div>
             
             <div style={{ marginTop: '24px', width: '100%', fontSize: '0.85rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginRight: '8px' }}></div>Healthy
                 </span>
                 <span style={{ fontWeight: 600 }}>128</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', marginRight: '8px' }}></div>At Risk
                 </span>
                 <span style={{ fontWeight: 600 }}>18</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '8px' }}></div>Critical
                 </span>
                 <span style={{ fontWeight: 600 }}>6</span>
               </div>
             </div>
          </div>

           <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
             <h3 style={{ fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                AI Assistant <span style={{ background: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>BETA</span>
             </h3>
             
             <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.95rem', color: '#f8fafc', marginBottom: '4px', fontWeight: '600' }}>Hello! 👋</div>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>How can I help you today?</div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
               <button style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', fontWeight: '500' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><AlertOctagon size={16} color="#ef4444"/> Show me machines with highest failure risk</div>
                  <ArrowRight size={14} style={{ opacity: 0.8 }} />
               </button>
               <button style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', fontWeight: '500' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><DollarSign size={16} color="#f59e0b"/> What is the revenue at risk today?</div>
                  <ArrowRight size={14} style={{ opacity: 0.8 }} />
               </button>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
               <button onClick={toggleListening} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isListening ? '#ec4899' : '#cbd5e1' }}>
                 {isListening ? <Mic size={18} className="listening-pulse" /> : <Mic size={18} />}
               </button>
               <input type="text" placeholder="Ask anything about your factory..." style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', width: '100%' }} />
             </div>
           </div>

           <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
             <h3 style={{ fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', fontWeight: 'bold' }}>Revenue At Risk</h3>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
               <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc' }}>${revenueAtRisk.toLocaleString()}</span>
               <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>↑ 18.6%</span>
             </div>
             <div style={{ height: '80px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskData}>
                    <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
             </div>
           </div>
           
           <div className="event-stream-section glass-panel" style={{ flex: 1, background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <div className="event-stream-header">
                <h2><div className="live-dot"></div> AI Prescriptions</h2>
              </div>
              <div className="event-list">
                {actions.map(action => (
                  <div className={`action-card ${action.status === 'pending' ? `${action.priority}-priority` : ''}`} key={action.id} style={{ opacity: action.status !== 'pending' ? 0.6 : 1, padding: '12px' }}>
                    <div className="action-card-header">
                      <h3 className="action-title" style={{ fontSize: '0.85rem' }}>{action.title}</h3>
                      <span className="action-time" style={{ fontSize: '0.65rem' }}>{action.time}</span>
                    </div>
                    {action.status === 'pending' && (
                      <div className="action-controls" style={{ marginTop: '12px' }}>
                        <button className="btn-dismiss" onClick={() => handleAction(action.id, 'dismissed')}>Dismiss</button>
                        <button className="btn-approve" onClick={() => handleAction(action.id, 'approved')}>
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
           </div>

        </div>
      </div>
      <MachineHistoryModal machineId={selectedMachineId} onClose={() => setSelectedMachineId(null)} />
    </div>
  );
};
