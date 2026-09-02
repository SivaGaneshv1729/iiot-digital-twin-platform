import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Server, RotateCcw, Play, RefreshCw, AlertTriangle, Zap,
  Thermometer, CheckCircle, Sliders, TrendingUp, Gauge, Settings, ArrowUpRight, Wifi, WifiOff, Eye, BarChart2, Shield, Cpu
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import './DemoSimulator.css';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  vibration: number;
  pressure: number;
  runningHours: number;
  anomalyScore?: number;
  running_hours?: number;
}

interface MachineEdit {
  status: string;
  temperature: number;
  vibration: number;
  pressure: number;
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

export const DemoSimulator = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [edits, setEdits] = useState<Record<number, MachineEdit>>({});
  const [liveStats, setLiveStats] = useState<LiveStats>({ total: 0, running: 0, idle: 0, maintenance: 0, oee: '0', avgTemp: '0' });
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Global batch controls
  const [batchStatus, setBatchStatus] = useState('Running');
  const [batchTemp, setBatchTemp] = useState(85);
  const [batchVibration, setBatchVibration] = useState(8.5);
  const [batchPressure, setBatchPressure] = useState(90);
  const [batchHours] = useState(15000);
  const [batchTarget, setBatchTarget] = useState<'all' | 'running' | 'idle' | 'maintenance' | 'specific'>('all');
  const [batchMachineId, setBatchMachineId] = useState('');
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);



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
      const res = await fetchWithAuth('/api/machines');
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
                vibration: Number(m.vibration || 1.5),
                pressure: Number(m.pressure || 100),
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
    setMachines(prev => prev.map(m => m.id === id ? { ...m, status: e.status, temperature: e.temperature, vibration: e.vibration, pressure: e.pressure, runningHours: e.runningHours } : m));
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], dirty: false } }));
    addLog(`✅ #${id} updated: ${e.status}, ${e.temperature.toFixed(1)}°C, ${e.vibration.toFixed(2)}mm/s, ${e.pressure.toFixed(1)}PSI, ${e.runningHours}h`);
    
    try {
      await fetchWithAuth(`/api/machines/${id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: e.status, temperature: e.temperature, vibration: e.vibration, pressure: e.pressure, runningHours: e.runningHours })
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
      return (edit && edit.dirty) ? { ...m, status: edit.status, temperature: edit.temperature, vibration: edit.vibration, pressure: edit.pressure, runningHours: edit.runningHours } : m;
    }));

    try {
      await Promise.all(dirty.map(([id, e]) =>
        fetchWithAuth(`/api/machines/${id}/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: e.status, temperature: e.temperature, vibration: e.vibration, pressure: e.pressure, runningHours: e.runningHours })
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
      if (batchTarget === 'specific') return m.id.toString() === batchMachineId;
      return m.status.toLowerCase() === batchTarget;
    });
    if (!targets.length) { addLog('⚠️ No machines match the batch target.'); return; }
    setIsLoading(true);
    addLog(`📦 Batch override: ${targets.length} machines → ${batchStatus}, ${batchTemp}°C, ${batchVibration}mm/s, ${batchPressure}PSI, ${batchHours}h`);
    
    // Instant local state update
    const targetIds = new Set(targets.map(m => m.id));
    setMachines(prev => prev.map(m => targetIds.has(m.id) ? { ...m, status: batchStatus, temperature: batchTemp, vibration: batchVibration, pressure: batchPressure, runningHours: batchHours } : m));

    try {
      await fetchWithAuth('/api/machines/simulate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targets.map(m => m.id), status: batchStatus, temperature: batchTemp, vibration: batchVibration, pressure: batchPressure, runningHours: batchHours })
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
      const res = await fetchWithAuth('/api/machines/simulate/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const getTempColor = (temp: number) => {
    if (temp < 60) return '#3b82f6';
    if (temp < 85) return '#f59e0b';
    return '#ef4444';
  };

  const getVibrationColor = (vib: number) => {
    if (vib < 5.0) return '#10b981';
    if (vib < 8.0) return '#f59e0b';
    return '#ef4444';
  };

  const getPressureColor = (press: number) => {
    if (press < 60 || press > 140) return '#ef4444';
    if (press < 80 || press > 120) return '#f59e0b';
    return '#10b981';
  };

  const dirtyCount = Object.values(edits).filter(e => e.dirty).length;

  const filteredMachines = machines
    .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 50);

  const oeeNum = parseFloat(liveStats.oee);

  return (
    <div className="demo-container">
      {/* ── Page Header ── */}
      <div className="machines-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>System State Simulator</h1>
          <p className="subtitle">Mutate live digital twin telemetry for automated anomaly testing and fault simulation</p>
        </div>
        
        {/* Navigation Quick Links for Demo Presentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/')} title="Go to Dashboard">
            <Eye size={15} /> 3D Digital Twin <ArrowUpRight size={14} />
          </button>
          <button className="btn-secondary" onClick={() => navigate('/machines')} title="Go to Machines Fleet">
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

      <div className="demo-layout-wrapper">
        {/* ════ HERO ROW: SCENARIO TRIGGERS ════ */}
        <div className="glass-panel demo-section-card mb-4">
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

        <div className="demo-split-layout">
          {/* ════ MAIN CONTENT: CONTROL MATRIX ════ */}
          <div className="demo-matrix-column">
            <div className="glass-panel demo-section-card">
              <div className="demo-card-header" style={{ marginBottom: '16px' }}>
                <BarChart2 size={18} className="text-accent" />
                <h2>Per-Machine Live Control Matrix</h2>
                <span className="demo-pill">{filteredMachines.length} nodes shown</span>
                {dirtyCount > 0 && (
                  <button className="demo-apply-dirty" onClick={applyAllDirty} disabled={isLoading}>
                    <CheckCircle size={13} /> Push {dirtyCount} Changes
                  </button>
                )}
              </div>

              {/* HORIZONTAL BATCH TOOLBAR */}
              <div className="bulk-action-toolbar">
                <div className="toolbar-header">
                  <Sliders size={15} className="text-accent" />
                  <strong>Bulk Override</strong>
                </div>
                <div className="toolbar-controls">
                  <select className="demo-select toolbar-input" value={batchTarget} onChange={e => setBatchTarget(e.target.value as any)}>
                    <option value="all">All Machines</option>
                    <option value="running">Running Only</option>
                    <option value="idle">Idle Only</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="specific">Specific Machine</option>
                  </select>
                  {batchTarget === 'specific' && (
                    <input 
                      type="text" 
                      placeholder="Machine ID..." 
                      className="demo-select toolbar-input" 
                      style={{ width: '100px' }} 
                      value={batchMachineId} 
                      onChange={e => setBatchMachineId(e.target.value)} 
                    />
                  )}
                  <select className={`demo-select toolbar-input status-select-${batchStatus.toLowerCase()}`} value={batchStatus} onChange={e => setBatchStatus(e.target.value)}>
                    <option value="Running">Running</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  
                  <div className="toolbar-slider-group">
                    <span style={{color: getTempColor(batchTemp)}}>{batchTemp}°C</span>
                    <input type="range" min={20} max={120} step={1} value={batchTemp}
                      className="demo-slider" style={{ '--tc': getTempColor(batchTemp), width: '60px' } as React.CSSProperties}
                      onChange={e => setBatchTemp(Number(e.target.value))} />
                  </div>
                  <div className="toolbar-slider-group">
                    <span style={{color: getVibrationColor(batchVibration)}}>{batchVibration}mm/s</span>
                    <input type="range" min={0} max={15} step={0.1} value={batchVibration}
                      className="demo-slider" style={{ '--tc': getVibrationColor(batchVibration), width: '60px' } as React.CSSProperties}
                      onChange={e => setBatchVibration(Number(e.target.value))} />
                  </div>
                  <div className="toolbar-slider-group">
                    <span style={{color: getPressureColor(batchPressure)}}>{batchPressure}PSI</span>
                    <input type="range" min={30} max={150} step={1} value={batchPressure}
                      className="demo-slider" style={{ '--tc': getPressureColor(batchPressure), width: '60px' } as React.CSSProperties}
                      onChange={e => setBatchPressure(Number(e.target.value))} />
                  </div>
                  
                  <button className="demo-apply-batch toolbar-btn" onClick={applyBatchOverride} disabled={isLoading}>
                    <CheckCircle size={14} /> Apply
                  </button>
                </div>
              </div>

              {/* Table Filters */}
              <div className="table-filters" style={{ marginTop: '16px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search machine name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="machine-table-wrap">
                <div className="mt-header">
                  <span>Machine Node</span>
                  <span>Status</span>
                  <span>Temp</span>
                  <span>Vib</span>
                  <span>Press</span>
                  <span>Hours</span>
                  <span>Anomaly</span>
                  <span>Apply</span>
                </div>
                {filteredMachines.map(m => {
                  const e = edits[m.id] || { status: m.status, temperature: Number(m.temperature || 60), vibration: Number(m.vibration || 1.5), pressure: Number(m.pressure || 100), runningHours: m.runningHours || 0, dirty: false };
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
                      <span>
                        <input type="number" className="mt-hours" style={{width: '60px'}} value={e.temperature} 
                          onChange={ev => updateEdit(m.id, { temperature: Number(ev.target.value) })} />
                      </span>
                      <span>
                        <input type="number" className="mt-hours" style={{width: '60px'}} value={e.vibration} 
                          onChange={ev => updateEdit(m.id, { vibration: Number(ev.target.value) })} />
                      </span>
                      <span>
                        <input type="number" className="mt-hours" style={{width: '60px'}} value={e.pressure} 
                          onChange={ev => updateEdit(m.id, { pressure: Number(ev.target.value) })} />
                      </span>
                      <span>
                        <input type="number" className="mt-hours" style={{width: '75px'}} value={e.runningHours} min={0} max={99999}
                          onChange={ev => updateEdit(m.id, { runningHours: Number(ev.target.value) })} />
                      </span>
                      <span>
                        <span className="anomaly-badge" style={{ 
                          backgroundColor: (m.anomalyScore || 0) > 75 ? 'rgba(239, 68, 68, 0.15)' : (m.anomalyScore || 0) > 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: (m.anomalyScore || 0) > 75 ? 'var(--danger)' : (m.anomalyScore || 0) > 40 ? 'var(--warning)' : 'var(--success)',
                          border: `1px solid ${(m.anomalyScore || 0) > 75 ? 'rgba(239, 68, 68, 0.3)' : (m.anomalyScore || 0) > 40 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'
                        }}>
                          {m.anomalyScore !== undefined ? m.anomalyScore.toFixed(1) + '%' : '-'}
                        </span>
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

          {/* ════ RIGHT SIDEBAR: TERMINAL ════ */}
          <aside className="telemetry-terminal">
            {/* Quick Actions */}
            <div className="glass-panel demo-section-card terminal-card mb-4">
              <div className="demo-card-header" style={{ marginBottom: '12px' }}>
                <RotateCcw size={15} className="text-accent" />
                <h2 style={{ fontSize: '0.9rem' }}>Shortcuts</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className="btn-secondary terminal-btn-green" onClick={() => runScenario('all_normal')} disabled={isLoading}>
                  <Play size={13} /> Play All
                </button>
                <button className="btn-secondary terminal-btn" onClick={fetchMachines}>
                  <RefreshCw size={13} /> Sync
                </button>
                <button className="btn-secondary terminal-btn-red" style={{ gridColumn: 'span 2' }}
                  onClick={() => { setIsLoading(false); setActiveScenario(null); addLog('⏹ Simulation stopped.'); }}>
                  <AlertTriangle size={13} /> Emergency Stop
                </button>
              </div>
            </div>

            {/* Activity Log */}
            <div className="glass-panel demo-section-card terminal-card mb-4">
              <div className="demo-card-header" style={{ marginBottom: '12px' }}>
                <Activity size={15} className="text-accent" />
                <h2 style={{ fontSize: '0.9rem' }}>Live Stream Logs</h2>
                <button className="btn-secondary" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setLog([])}>Clear</button>
              </div>
              <div className="activity-log terminal-log">
                {log.length === 0 && <div className="log-empty">Waiting for WebSocket pings...</div>}
                {log.map((entry, i) => (
                  <div key={i} className={`log-line ${entry.includes('✅') ? 'log-ok' : entry.includes('⚠️') || entry.includes('📉') || entry.includes('💥') ? 'log-warn' : ''}`}>
                    {entry}
                  </div>
                ))}
              </div>
            </div>

            {/* Stack Info */}
            <div className="glass-panel demo-section-card terminal-card">
              <div className="demo-card-header" style={{ marginBottom: '12px' }}>
                <Shield size={15} className="text-accent" />
                <h2 style={{ fontSize: '0.9rem' }}>Engine Stack</h2>
              </div>
              {[
                { icon: <Cpu size={12} />, text: 'Spring Boot 3.2.3' },
                { icon: <Activity size={12} />, text: 'PyTorch ML (TTF)' },
                { icon: <Server size={12} />, text: 'PostgreSQL & Redis' },
                { icon: <Wifi size={12} />, text: 'WebSocket WSS://' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#94a3b8', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>{row.icon}</span>{row.text}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
