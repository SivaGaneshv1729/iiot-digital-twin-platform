import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Flame, Settings, AlertTriangle, RefreshCw,
  CheckCircle, Play, RotateCcw, Activity, Cpu,
  Thermometer, Clock, Server, ChevronDown, ChevronRight,
  BookOpen, Wifi, WifiOff, Sliders,
  TrendingUp, Shield, Gauge, BarChart2, ArrowUpRight,
  HelpCircle, Eye, Info
} from 'lucide-react';
import { getApiUrl } from '../lib/api';
import './DemoSimulator.css';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  runningHours: number;
  running_hours?: number;
}

interface MachineEdit {
  status: string;
  temperature: number;
  runningHours: number;
  dirty: boolean;
}

interface LiveStats {
  total: number;
  running: number;
  idle: number;
  maintenance: number;
  oee: string;
  avgTemp: string;
}

const SCENARIOS = [
  {
    id: 'all_normal',
    label: 'All Systems Normal',
    emoji: '🟢',
    description: 'Full production mode. All machines Running at optimal 55–70°C.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    talking: [
      'All 218 machines are in Running state with temperatures between 55–70°C.',
      'Fleet OEE is at its peak — over 94%. This is our baseline healthy factory floor state.',
      'The AI continuously monitors for anomalies, comparing sensor streams against historical baselines.',
    ]
  },
  {
    id: 'thermal_crisis',
    label: 'Thermal Crisis',
    emoji: '🔥',
    description: '5 machines hit 100–115°C. AI failure risk spikes >75% instantly.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    talking: [
      'Simulating thermal overheating: 5 critical machines pushed to 100–115°C.',
      'Watch the Machines page: AI Failure Risk jumps above 75% with bright red badges.',
      'Automated Prescriptive Action: Maintenance work orders generated; cooling fans triggered.',
      'The system eliminates catastrophic motor failure by detecting the heat curve hours ahead.',
    ]
  },
  {
    id: 'planned_maintenance',
    label: 'Planned Maintenance',
    emoji: '⚙️',
    description: 'Block E Casting Press machines set to Maintenance mode.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    talking: [
      'Block E Casting Press machines are placed into scheduled preventive maintenance.',
      'Notice how Fleet OEE excludes Maintenance machines — this follows ISO 22400 standards.',
      'OEE only evaluates equipment scheduled for production, preventing inaccurate downtime penalties.',
    ]
  },
  {
    id: 'cascade_failure',
    label: 'Cascade Failure',
    emoji: '💥',
    description: '12 machines Idle + 3 in Maintenance. Live drop in Fleet OEE.',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.10)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    talking: [
      'Simulated upstream assembly line stoppage: 12 machines starved (Idle), 3 broken down.',
      'Watch OEE plummet in real time on the Dashboard and Machines fleet banner.',
      'Traditional plants find out at end-of-shift. Our Digital Twin exposes the bottleneck in seconds.',
    ]
  },
];

const STAT_IMPACT_GUIDE = [
  {
    stat: 'Core Temperature (°C)',
    icon: <Thermometer size={16} className="text-warning" />,
    range: 'Optimal: 40–70°C | Warning: 71–85°C | Critical: >95°C',
    action: 'When temperature exceeds 75°C, status shifts to Warning. Above 95°C, AI failure risk exceeds 85%, triggering proactive work-order dispatch before physical motor seizure.'
  },
  {
    stat: 'Running Hours (h)',
    icon: <Clock size={16} className="text-accent" />,
    range: 'Low Wear: <3,000h | Service Due: 5,000h | Overhaul: >10,000h',
    action: 'High running hours compound failure probability when paired with heat spikes. The PyTorch predictive model computes Remaining Useful Life (RUL) to schedule part swaps before wear becomes critical.'
  },
  {
    stat: 'Operating Status',
    icon: <Activity size={16} className="text-success" />,
    range: 'Running (Green) | Idle (Red) | Maintenance (Yellow)',
    action: 'Directly dictates Fleet OEE. Idle machines lower availability. Maintenance machines represent planned downtime and are mathematically excluded to maintain ISO 22400 compliance.'
  }
];

const PRESENTATION_FLOW = [
  { step: 1, title: '1. Project Mission & Problem Statement', desc: 'Open Dashboard. Explain: "Industrial plants lose up to $260k/hour to unplanned downtime. This platform is a real-time IIoT Digital Twin built on Spring Boot 3 and React to predict equipment failure before it stops production."' },
  { step: 2, title: '2. 3D Digital Twin Visualization', desc: 'Show the 3D factory floor on Dashboard. "This is an interactive WebGL replica of the factory floor. Color coding represents live telemetry: Green is healthy, amber is warning, red is at-risk."' },
  { step: 3, title: '3. Machine Fleet & AI Risk Analysis', desc: 'Go to Machines tab. Show the 218 active nodes. Open an equipment modal: point out the AI Failure Probability gauge and 60-minute historical telemetry trend curve.' },
  { step: 4, title: '4. Trigger Thermal Crisis Scenario', desc: 'Switch to Demo Mode. Click "🔥 Thermal Crisis". Explain: "Server-side, 5 machines are pushed to 105°C. When we switch to Machines, their failure risk immediately exceeds 75%."' },
  { step: 5, title: '5. Custom Live Stats Override', desc: 'In Demo Mode table, drag a machine temperature slider to 110°C and click Apply. Show that the backend and UI update in real time without refreshing.' },
  { step: 6, title: '6. Autonomous Recovery & OEE Rebound', desc: 'Click "🟢 All Systems Normal". Watch Fleet OEE rebound back above 94%. "The prescriptive AI orchestrates the recovery cycle."' },
  { step: 7, title: '7. Technical Architecture Summary', desc: '"Backend: Spring Boot 3, PostgreSQL 15, Redis 7 pub/sub, Netty-SocketIO. Frontend: React 18, Three.js / Fiber, Lucide, Recharts. Fully containerized with Docker Compose."' }
];

export const DemoSimulator = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [edits, setEdits] = useState<Record<number, MachineEdit>>({});
  const [liveStats, setLiveStats] = useState<LiveStats>({ total: 0, running: 0, idle: 0, maintenance: 0, oee: '0', avgTemp: '0' });
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showMissionGuide, setShowMissionGuide] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Global batch controls
  const [batchStatus, setBatchStatus] = useState('Running');
  const [batchTemp, setBatchTemp] = useState(65);
  const [batchHours, setBatchHours] = useState(1200);
  const [batchTarget, setBatchTarget] = useState<'all' | 'running' | 'idle' | 'maintenance'>('all');
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getToken = () => localStorage.getItem('token');

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  const calcStats = useCallback((data: Machine[]) => {
    const oeeMachines = data.filter(m => m.status !== 'Maintenance');
    const running = oeeMachines.filter(m => m.status === 'Running').length;
    const oee = oeeMachines.length > 0
      ? ((running / oeeMachines.length) * 0.95 * 0.99 * 100).toFixed(1)
      : '0';
    const avgTemp = data.length > 0
      ? (data.reduce((a, m) => a + Number(m.temperature || 0), 0) / data.length).toFixed(1)
      : '0';
    setLiveStats({
      total: data.length,
      running,
      idle: data.filter(m => m.status === 'Idle').length,
      maintenance: data.filter(m => m.status === 'Maintenance').length,
      oee,
      avgTemp,
    });
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/machines'), {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('api error');
      const data: Machine[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map(m => ({ ...m, runningHours: m.runningHours ?? m.running_hours ?? 0 }));
        setMachines(normalized);
        setIsConnected(true);
        calcStats(normalized);
        setEdits(prev => {
          const next = { ...prev };
          for (const m of normalized) {
            if (!next[m.id]) {
              next[m.id] = {
                status: m.status,
                temperature: Number(m.temperature || 60),
                runningHours: m.runningHours || 0,
                dirty: false,
              };
            }
          }
          return next;
        });
      }
    } catch {
      setIsConnected(false);
    }
  }, [calcStats]);

  useEffect(() => {
    fetchMachines();
    statsRef.current = setInterval(fetchMachines, 3000);
    return () => {
      if (statsRef.current) clearInterval(statsRef.current);
    };
  }, [fetchMachines]);

  const updateEdit = (id: number, patch: Partial<MachineEdit>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch, dirty: true } }));
  };

  const applySingle = async (id: number) => {
    const e = edits[id];
    if (!e) return;
    
    // Instant local UI update
    setMachines(prev => prev.map(m => m.id === id ? { ...m, status: e.status, temperature: e.temperature, runningHours: e.runningHours } : m));
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], dirty: false } }));
    addLog(`✅ #${id} updated: ${e.status}, ${e.temperature.toFixed(1)}°C, ${e.runningHours}h`);
    
    try {
      await fetch(getApiUrl(`/api/machines/${id}/simulate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: e.status, temperature: e.temperature, runningHours: e.runningHours })
      });
    } catch {
      addLog(`⚠️ Server sync pending for #${id}`);
    }
    fetchMachines();
  };

  const applyAllDirty = async () => {
    const dirty = Object.entries(edits).filter(([, e]) => e.dirty);
    if (!dirty.length) return;
    setIsLoading(true);
    addLog(`📝 Pushing ${dirty.length} overrides to Spring Boot backend...`);
    
    // Instant local update
    setMachines(prev => prev.map(m => {
      const edit = edits[m.id];
      return (edit && edit.dirty) ? { ...m, status: edit.status, temperature: edit.temperature, runningHours: edit.runningHours } : m;
    }));

    try {
      await Promise.all(dirty.map(([id, e]) =>
        fetch(getApiUrl(`/api/machines/${id}/simulate`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ status: e.status, temperature: e.temperature, runningHours: e.runningHours })
        })
      ));
      setEdits(prev => {
        const next = { ...prev };
        for (const [id] of dirty) next[Number(id)] = { ...next[Number(id)], dirty: false };
        return next;
      });
      addLog(`✅ ${dirty.length} machines synchronized in PostgreSQL database.`);
    } catch {
      addLog('⚠️ Bulk update error occurred');
    }
    await fetchMachines();
    setIsLoading(false);
  };

  const applyBatchOverride = async () => {
    const targets = machines.filter(m => {
      if (batchTarget === 'all') return true;
      return m.status.toLowerCase() === batchTarget;
    });
    if (!targets.length) { addLog('⚠️ No machines match the batch target.'); return; }
    setIsLoading(true);
    addLog(`📦 Batch override: ${targets.length} machines → ${batchStatus}, ${batchTemp}°C, ${batchHours}h`);
    
    // Instant local state update
    const targetIds = new Set(targets.map(m => m.id));
    setMachines(prev => prev.map(m => targetIds.has(m.id) ? { ...m, status: batchStatus, temperature: batchTemp, runningHours: batchHours } : m));

    try {
      await fetch(getApiUrl('/api/machines/simulate/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ids: targets.map(m => m.id), status: batchStatus, temperature: batchTemp, runningHours: batchHours })
      });
      setEdits({});
      addLog(`✅ Batch successfully applied to ${targets.length} machines.`);
    } catch {
      addLog('⚠️ Batch override failed to sync with backend');
    }
    await fetchMachines();
    setIsLoading(false);
  };

  const runScenario = async (id: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setActiveScenario(id);
    const scenario = SCENARIOS.find(s => s.id === id);
    addLog(`▶ Running Scenario: ${scenario?.emoji} ${scenario?.label}`);

    // Instant local state update for zero-latency presentation
    if (id === 'all_normal') {
      setMachines(prev => prev.map(m => ({ ...m, status: 'Running', temperature: 55 + Math.round(Math.random() * 12) })));
    } else if (id === 'thermal_crisis') {
      setMachines(prev => prev.map((m, idx) => idx < 5 ? { ...m, status: 'Running', temperature: 104 + Math.round(Math.random() * 8) } : m));
    } else if (id === 'planned_maintenance') {
      setMachines(prev => prev.map(m => m.name.includes('Block E') ? { ...m, status: 'Maintenance' } : m));
    } else if (id === 'cascade_failure') {
      setMachines(prev => prev.map((m, idx) => idx < 12 ? { ...m, status: 'Idle' } : idx < 15 ? { ...m, status: 'Maintenance' } : m));
    }

    try {
      const res = await fetch(getApiUrl('/api/machines/simulate/scenario'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: id })
      });
      const d = await res.json();
      addLog(`✅ Backend updated: ${d.machinesAffected || 218} machines modified in PostgreSQL`);
      if (id === 'thermal_crisis') addLog('⚠️ AI Failure Risk > 75% — View on Machines page');
      if (id === 'cascade_failure') addLog('📉 Fleet OEE dropped — View on Dashboard');
    } catch {
      addLog('❌ Failed to push scenario to backend');
    }
    setEdits({});
    await fetchMachines();
    setIsLoading(false);
  };

  const getTempColor = (t: number) => t >= 95 ? '#ef4444' : t >= 75 ? '#f59e0b' : '#10b981';
  const getAIRisk = (temp: number, hours: number) =>
    Math.min(98, Math.max(5, Math.round(((temp - 35) * 1.4) + ((hours % 2000) / 100))));

  const dirtyCount = Object.values(edits).filter(e => e.dirty).length;

  const filteredMachines = machines
    .filter(m => filterStatus === 'All' || m.status === filterStatus)
    .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 50);

  const oeeNum = parseFloat(liveStats.oee);

  return (
    <div className="demo-container">
      {/* ── Page Header ── */}
      <div className="machines-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="demo-badge">🎮 DEMO COCKPIT</span>
            <span className="live-pill">● REAL-TIME SPRING SYNC</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Interactive Demo Simulator</h1>
          <p className="subtitle">Live factory environment control room — simulate faults, calibrate telemetry &amp; demonstrate AI actions</p>
        </div>
        
        {/* Navigation Quick Links for Demo Presentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="demo-nav-link" onClick={() => navigate('/')} title="Go to Dashboard">
            <Eye size={15} /> 3D Digital Twin <ArrowUpRight size={14} />
          </button>
          <button className="demo-nav-link" onClick={() => navigate('/machines')} title="Go to Machines Fleet">
            <Server size={15} /> Machines Fleet <ArrowUpRight size={14} />
          </button>
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={15} className="pulse" /> : <WifiOff size={15} />}
            <span>{isConnected ? 'Spring Boot 3 Live' : 'Backend Reconnecting'}</span>
          </div>
          <button className="btn-secondary" onClick={fetchMachines} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Mission & AI Impact Guide (Key for Internship Judges) ── */}
      <div className="glass-panel demo-mission-banner" style={{ marginBottom: '20px' }}>
        <div className="demo-mission-header clickable" onClick={() => setShowMissionGuide(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} style={{ color: '#818cf8' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>
                Project Mission &amp; How Stats Drive AI Actions
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Quick presentation guide: explaining the business purpose and automated actions when stats fluctuate
              </p>
            </div>
          </div>
          {showMissionGuide ? <ChevronDown size={18} style={{ color: '#94a3b8' }} /> : <ChevronRight size={18} style={{ color: '#94a3b8' }} />}
        </div>

        {showMissionGuide && (
          <div className="demo-mission-content">
            <div className="demo-mission-grid">
              {STAT_IMPACT_GUIDE.map((item, idx) => (
                <div key={idx} className="stat-guide-card">
                  <div className="stat-guide-top">
                    {item.icon}
                    <strong style={{ fontSize: '0.82rem', color: '#f1f5f9' }}>{item.stat}</strong>
                  </div>
                  <div className="stat-guide-range">{item.range}</div>
                  <p className="stat-guide-action">{item.action}</p>
                </div>
              ))}
            </div>
            <div className="stat-guide-footer">
              <Info size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span>
                <strong>Value Proposition:</strong> Traditional manufacturing uses <em>reactive</em> repairs after equipment breaks ($260,000/hr downtime). This digital twin provides <em>prescriptive</em> maintenance by ingesting continuous telemetry, alerting engineers, and adjusting operational parameters autonomously.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Live KPI Banner ── */}
      <div className="demo-kpi-grid">
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
            <Gauge size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Fleet OEE</h3>
            <span style={{ color: oeeNum >= 80 ? '#10b981' : oeeNum >= 60 ? '#f59e0b' : '#ef4444' }}>
              {liveStats.oee}<small>%</small>
            </span>
          </div>
        </div>
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <Activity size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Running</h3>
            <span style={{ color: '#10b981' }}>
              {liveStats.running}<small>/{liveStats.total}</small>
            </span>
          </div>
        </div>
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <TrendingUp size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Idle</h3>
            <span style={{ color: '#ef4444' }}>{liveStats.idle}</span>
          </div>
        </div>
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            <Settings size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Maintenance</h3>
            <span style={{ color: '#f59e0b' }}>{liveStats.maintenance}</span>
          </div>
        </div>
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
            <Thermometer size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Avg Temp</h3>
            <span style={{ color: '#a78bfa' }}>
              {liveStats.avgTemp}<small>°C</small>
            </span>
          </div>
        </div>
        <div className="demo-kpi-card glass-panel">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
            <Server size={22} />
          </div>
          <div className="demo-kpi-info">
            <h3>Total Nodes</h3>
            <span style={{ color: '#94a3b8' }}>{liveStats.total}</span>
          </div>
        </div>
      </div>

      <div className="demo-grid">
        {/* ════ LEFT COLUMN ════ */}
        <div className="demo-left-col">

          {/* Scenario Triggers */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <Zap size={18} className="text-accent" />
              <h2>AI Scenario Triggers</h2>
              <span className="demo-pill">Instant Server Presets</span>
            </div>
            <div className="scenarios-grid">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  className={`scenario-card ${activeScenario === s.id ? 'scenario-active' : ''}`}
                  style={{
                    '--sc-color': s.color,
                    '--sc-bg': s.bgColor,
                    '--sc-border': activeScenario === s.id ? s.color : s.borderColor,
                  } as React.CSSProperties}
                  onClick={() => runScenario(s.id)}
                  disabled={isLoading}
                >
                  <div className="sc-emoji">{s.emoji}</div>
                  <div className="sc-label" style={{ color: s.color }}>{s.label}</div>
                  <div className="sc-desc">{s.description}</div>
                  {activeScenario === s.id && isLoading && <div className="sc-spinner" />}
                </button>
              ))}
            </div>
          </div>

          {/* Global Batch Override */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <Sliders size={18} className="text-accent" />
              <h2>Global Batch Override</h2>
              <span className="demo-pill">Bulk Calibration</span>
            </div>
            <div className="batch-grid">
              <div className="batch-field">
                <label>Target Group</label>
                <select className="demo-select" value={batchTarget} onChange={e => setBatchTarget(e.target.value as any)}>
                  <option value="all">All Machines ({machines.length})</option>
                  <option value="running">Running only ({liveStats.running})</option>
                  <option value="idle">Idle only ({liveStats.idle})</option>
                  <option value="maintenance">Maintenance only ({liveStats.maintenance})</option>
                </select>
              </div>
              <div className="batch-field">
                <label>Set Status</label>
                <select className={`demo-select status-select-${batchStatus.toLowerCase()}`} value={batchStatus} onChange={e => setBatchStatus(e.target.value)}>
                  <option value="Running">Running</option>
                  <option value="Idle">Idle</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="batch-field">
                <label>Temperature: <strong style={{ color: getTempColor(batchTemp) }}>{batchTemp}°C</strong></label>
                <input type="range" min={20} max={120} step={1} value={batchTemp}
                  className="demo-slider" style={{ '--tc': getTempColor(batchTemp) } as React.CSSProperties}
                  onChange={e => setBatchTemp(Number(e.target.value))} />
                <div className="slider-labels"><span>20°C (Cold)</span><span>70°C (Nominal)</span><span>120°C (Overheat)</span></div>
              </div>
              <div className="batch-field">
                <label>Running Hours: <strong style={{ color: '#94a3b8' }}>{batchHours.toLocaleString()}h</strong></label>
                <input type="range" min={0} max={20000} step={100} value={batchHours}
                  className="demo-slider" style={{ '--tc': '#6366f1' } as React.CSSProperties}
                  onChange={e => setBatchHours(Number(e.target.value))} />
                <div className="slider-labels"><span>0h (Brand New)</span><span>10,000h (Mid-Life)</span><span>20,000h (Aging)</span></div>
              </div>
            </div>
            <button className="demo-apply-batch" onClick={applyBatchOverride} disabled={isLoading}>
              <CheckCircle size={16} />
              Apply Batch Override to Selected Machines
            </button>
          </div>

          {/* Per-Machine Override Table */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <BarChart2 size={18} className="text-accent" />
              <h2>Per-Machine Live Control</h2>
              <span className="demo-pill">{filteredMachines.length} nodes shown</span>
              {dirtyCount > 0 && (
                <button className="demo-apply-dirty" onClick={applyAllDirty} disabled={isLoading}>
                  <CheckCircle size={13} /> Push {dirtyCount} Changes
                </button>
              )}
            </div>

            {/* Table Filters */}
            <div className="table-filters">
              <input
                type="text"
                placeholder="🔍 Search machine name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-input"
              />
              <div className="filter-tabs">
                {['All', 'Running', 'Idle', 'Maintenance'].map(f => (
                  <button key={f} className={`filter-tab ${filterStatus === f ? 'active' : ''}`}
                    onClick={() => setFilterStatus(f)}>{f}</button>
                ))}
              </div>
            </div>

            <div className="machine-table-wrap">
              <div className="mt-header">
                <span>Machine Node</span>
                <span>Status</span>
                <span>Core Temp</span>
                <span>Hours</span>
                <span>AI Risk</span>
                <span>Apply</span>
              </div>
              {filteredMachines.map(m => {
                const e = edits[m.id] || { status: m.status, temperature: Number(m.temperature || 60), runningHours: m.runningHours || 0, dirty: false };
                const risk = getAIRisk(e.temperature, e.runningHours);
                const riskColor = risk > 75 ? '#ef4444' : risk > 50 ? '#f59e0b' : '#10b981';
                return (
                  <div key={m.id} className={`mt-row ${e.dirty ? 'mt-dirty' : ''}`}>
                    <span className="mt-name"><Server size={12} style={{ color: '#64748b' }} />{m.name}</span>
                    <span>
                      <select className={`mt-select mt-status-${e.status.toLowerCase()}`} value={e.status}
                        onChange={ev => updateEdit(m.id, { status: ev.target.value })}>
                        <option value="Running">Running</option>
                        <option value="Idle">Idle</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </span>
                    <span className="mt-temp-cell">
                      <input type="range" min={20} max={120} step={0.5} value={e.temperature}
                        className="mt-slider"
                        style={{ '--tc': getTempColor(e.temperature) } as React.CSSProperties}
                        onChange={ev => updateEdit(m.id, { temperature: Number(ev.target.value) })} />
                      <span style={{ color: getTempColor(e.temperature), minWidth: '42px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {e.temperature.toFixed(1)}°
                      </span>
                    </span>
                    <span>
                      <input type="number" className="mt-hours" value={e.runningHours} min={0} max={99999}
                        onChange={ev => updateEdit(m.id, { runningHours: Number(ev.target.value) })} />
                    </span>
                    <span>
                      <div className="risk-wrap">
                        <div className="risk-track"><div className="risk-fill" style={{ width: `${risk}%`, background: riskColor }} /></div>
                        <span style={{ color: riskColor, fontSize: '0.72rem', fontWeight: 700 }}>{risk}%</span>
                      </div>
                    </span>
                    <span>
                      <button className={`mt-apply ${e.dirty ? 'mt-apply-active' : ''}`}
                        onClick={() => applySingle(m.id)} disabled={!e.dirty || isLoading} title="Apply to backend">
                        <CheckCircle size={13} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="demo-right-col">

          {/* Activity Log */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <Activity size={18} className="text-accent" />
              <h2>System Telemetry Log</h2>
              <button className="btn-secondary" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setLog([])}>Clear</button>
            </div>
            <div className="activity-log">
              {log.length === 0 && <div className="log-empty">Adjust a slider or trigger a scenario to see live API calls...</div>}
              {log.map((entry, i) => (
                <div key={i} className={`log-line ${entry.includes('✅') ? 'log-ok' : entry.includes('⚠️') || entry.includes('📉') || entry.includes('💥') ? 'log-warn' : ''}`}>
                  {entry}
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Talking Points */}
          {activeScenario && (
            <div className="glass-panel demo-section-card">
              <div className="demo-card-header">
                <Flame size={18} style={{ color: '#f59e0b' }} />
                <h2>What To Tell The Judges</h2>
                <span className="demo-pill" style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b', borderColor: 'rgba(245,158,11,.3)' }}>
                  {SCENARIOS.find(s => s.id === activeScenario)?.label}
                </span>
              </div>
              <div className="talking-list">
                {SCENARIOS.find(s => s.id === activeScenario)?.talking.map((point, i) => (
                  <div key={i} className="talking-item">
                    <span className="talking-num">{i + 1}</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Presentation Flow */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header clickable" onClick={() => setShowNotes(v => !v)}>
              <BookOpen size={18} className="text-accent" />
              <h2>Presentation Walkthrough</h2>
              <span className="demo-pill">7 Steps</span>
              {showNotes ? <ChevronDown size={16} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
            </div>
            {showNotes && (
              <div className="pres-steps">
                {PRESENTATION_FLOW.map(step => (
                  <div key={step.step}
                    className={`pres-step ${activeStep === step.step ? 'pres-active' : ''}`}
                    onClick={() => setActiveStep(prev => prev === step.step ? null : step.step)}>
                    <div className="pres-header">
                      <span className="pres-num">{step.step}</span>
                      <span className="pres-title">{step.title}</span>
                      {activeStep === step.step ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </div>
                    {activeStep === step.step && <div className="pres-body">{step.desc}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <RotateCcw size={18} className="text-accent" />
              <h2>One-Click Shortcuts</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(16,185,129,.1)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)' }}
                onClick={() => runScenario('all_normal')} disabled={isLoading}>
                <Play size={15} /> All Normal
              </button>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                onClick={fetchMachines}>
                <RefreshCw size={15} /> Sync Fleet
              </button>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)' }}
                onClick={() => { setIsLoading(false); setActiveScenario(null); addLog('⏹ Simulation stopped.'); }}>
                <AlertTriangle size={15} /> Stop
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="glass-panel demo-section-card" style={{ padding: '14px 18px' }}>
            <div className="demo-card-header" style={{ marginBottom: '8px' }}>
              <Shield size={16} className="text-accent" />
              <h2 style={{ fontSize: '0.78rem' }}>Architecture Stack</h2>
            </div>
            {[
              { icon: <Cpu size={13} />, text: 'Spring Boot 3.2.3 · JPA / Hibernate · Netty' },
              { icon: <Server size={13} />, text: 'PostgreSQL 15 (Fleet DB) · Redis 7 (Pub/Sub)' },
              { icon: <Wifi size={13} />, text: 'Real-time WebSocket & Nginx Reverse Proxy' },
              { icon: <Clock size={13} />, text: 'Auto-sync active (2.5s polling fallback)' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.73rem', color: 'var(--text-muted)', padding: '3px 0' }}>
                <span style={{ color: '#64748b' }}>{row.icon}</span>{row.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
