import { useEffect, useState, useRef } from 'react';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Zap, Wifi, TrendingUp, DollarSign, Leaf, CheckCircle, Clock, Download, AlertOctagon, Bell, Mic, MicOff, Power
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ModelMetrics } from '../components/ModelMetrics';
import { DigitalTwin } from '../components/DigitalTwin';
import { MachineHistoryModal } from '../components/MachineHistoryModal';
import { CCTVPanel } from '../components/CCTVPanel';
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
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [thermalMode, setThermalMode] = useState(false);
  const [aiHeatmapMode, setAiHeatmapMode] = useState(false);
  
  const [chartData, setChartData] = useState(INITIAL_CHART_DATA);
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [isListening, setIsListening] = useState(false);
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
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>{t('Executive Command Center')}</h1>
          <p className="subtitle">{t('Bridging AI Telemetry with Business Financial Impact')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={toggleListening} 
            className={`glass-panel ${isListening ? 'listening-pulse' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: isListening ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid #ec4899' }}
            title="Voice Commands"
          >
            {isListening ? <Mic size={16} /> : <MicOff size={16} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Voice</span>
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
          
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}` }}>
            <Wifi size={16} className={isConnected ? 'pulse' : ''} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isConnected ? t('IoT Stream Live') : t('IoT Disconnected')}</span>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <DigitalTwin machines={liveMachines} onSelectMachine={setSelectedMachineId} thermalMode={thermalMode} isEmergencyMode={isEmergencyMode} aiHeatmapMode={aiHeatmapMode} />
      </ErrorBoundary>
      <MachineHistoryModal machineId={selectedMachineId} onClose={() => setSelectedMachineId(null)} />

      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper blue"><Zap size={22} /></div>
          <div className="kpi-content">
            <h3>{t('Fleet OEE Score')}</h3>
            <div className="kpi-value">{summary.active_machines > 0 ? '94.2%' : '0%'}</div>
          </div>
        </div>
        
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper red"><DollarSign size={22} /></div>
          <div className="kpi-content">
            <h3>{t('Revenue at Risk')}</h3>
            <div className="kpi-value">
              ${revenueAtRisk.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper green"><Leaf size={22} /></div>
          <div className="kpi-content">
            <h3>{t('AI Energy Savings')}</h3>
            <div className="kpi-value">$12,450 <small>/mo</small></div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper purple"><TrendingUp size={22} /></div>
          <div className="kpi-content">
            <h3>{t('Global Yield Rate')}</h3>
            <div className="kpi-value">{summary.efficiency}%</div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper cyan"><Activity size={22} /></div>
          <div className="kpi-content">
            <h3>{t('Throughput (UPH)')}</h3>
            <div className="kpi-value">
              {summary.active_machines > 0 ? '4,820' : '0'}
            </div>
          </div>
        </div>
      </div>

      <ModelMetrics />

      <div className="dashboard-lower-grid">
        
        <div className="charts-section glass-panel">
          <div className="chart-header">
            <h2>{t('Production Output vs Energy Draw (Live)')}</h2>
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
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="colorEnergyDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Area yAxisId="right" type="monotone" dataKey="energy" fill="url(#colorEnergyDash)" stroke="#10b981" isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="output" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                <Line yAxisId="left" type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Prescriptive Action Center */}
        <div className="event-stream-section glass-panel">
          <div className="event-stream-header">
            <h2><div className="live-dot"></div> AI Prescriptive Actions</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Machine learning recommendations requiring executive approval.</p>
          </div>
          <div className="event-list">
            {actions.map(action => (
              <div className={`action-card ${action.status === 'pending' ? `${action.priority}-priority` : ''}`} key={action.id} style={{ opacity: action.status !== 'pending' ? 0.6 : 1 }}>
                <div className="action-card-header">
                  <h3 className="action-title">{action.title}</h3>
                  <span className="action-time"><Clock size={12}/> {action.time}</span>
                </div>
                <p className="action-desc">{action.description}</p>
                
                {action.status === 'pending' ? (
                  <div className="action-controls">
                    <button className="btn-dismiss" onClick={() => handleAction(action.id, 'dismissed')}>Dismiss</button>
                    <button className="btn-approve" onClick={() => handleAction(action.id, 'approved')}>
                      <CheckCircle size={14} /> Approve AI Action
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: action.status === 'approved' ? '#10b981' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> {action.status === 'approved' ? 'Action Executed via API' : 'Recommendation Dismissed'}
                  </div>
                )}
              </div>
            ))}
            {actions.every(a => a.status !== 'pending') && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '20px', fontSize: '0.9rem' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#10b981', opacity: 0.5 }} />
                All AI prescriptions have been resolved.
              </div>
            )}
          </div>
        </div>

        {/* Live CCTV Panel */}
        <CCTVPanel isEmergencyMode={isEmergencyMode} />

      </div>
    </div>
  );
};
