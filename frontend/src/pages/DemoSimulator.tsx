import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Flame, Settings, AlertTriangle, RefreshCw,
  CheckCircle, Play, RotateCcw, Activity, Cpu,
  Thermometer, Clock, Server, ChevronDown, ChevronRight,
  BookOpen, Wifi, WifiOff, Sliders,
  TrendingUp, Shield, Gauge, BarChart2
} from 'lucide-react';
import './DemoSimulator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
      'OEE is at its peak — over 94%. This is our baseline healthy factory state.',
      'The AI continuously monitors for anomalies, comparing telemetry against historical baselines.',
    ]
  },
  {
    id: 'thermal_crisis',
    label: 'Thermal Crisis',
    emoji: '🔥',
    description: '5 machines hit 100–115°C. AI failure risk spikes instantly.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    talking: [
      'I forced 5 machines into thermal overheating — 100–115°C.',
      'Watch the Machines page: AI Failure Risk jumps above 75% and turns red.',
      'In real deployment, this triggers automated SMS/email alerts to the maintenance team.',
      'The system doesn\'t wait for a human to notice — it acts proactively.',
    ]
  },
  {
    id: 'planned_maintenance',
    label: 'Planned Maintenance',
    emoji: '⚙️',
    description: 'Block E Casting Press machines set to Maintenance.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    talking: [
      'Block E Casting Press machines are now in scheduled maintenance mode.',
      'Notice how OEE excludes Maintenance machines — this is intentional.',
      'OEE only counts machines available for production. Planned downtime is excluded.',
    ]
  },
  {
    id: 'cascade_failure',
    label: 'Cascade Failure',
    emoji: '💥',
    description: '12 machines Idle + 3 Maintenance. OEE drops live on Dashboard.',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.10)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    talking: [
      'Simulated cascade failure: 12 machines Idle, 3 in Maintenance.',
      'Watch OEE drop on the Machines page Fleet banner in real-time.',
      'Traditional systems find out at end-of-shift. Our Digital Twin shows it instantly.',
    ]
  },
];

const PRESENTATION_FLOW = [
  { step: 1, title: 'Introduction', desc: 'Open the Dashboard. Show the live OEE, active machine count, and real-time telemetry chart. "All data streams via WebSocket from our Spring Boot backend."' },
  { step: 2, title: '3D Digital Twin', desc: 'Click the 3D twin view on Dashboard. "This is a virtual replica of our factory floor. Color = machine health. Green is good, red is at-risk."' },
  { step: 3, title: 'AI Failure Prediction', desc: 'Go to Machines page. Open any machine\'s AI Telemetry modal. Show the failure probability score and trend chart.' },
  { step: 4, title: 'Custom Temp Override', desc: 'Come to Demo Mode. Find a machine in the table. Drag its temperature to 105°C. Click Apply. Navigate to Machines — watch it turn red.' },
  { step: 5, title: 'Thermal Crisis Scenario', desc: 'Click "Thermal Crisis". This fires the backend scenario API which sets 5 machines to 100–115°C server-side. Show red machines on Machines page.' },
  { step: 6, title: 'OEE & Fleet Command', desc: 'Click "Cascade Failure". Show OEE dropping on the Machines page Fleet banner. "This is the power of real-time telemetry streaming."' },
  { step: 7, title: 'Architecture Wrap-up', desc: '"Spring Boot 3 + PostgreSQL + Redis + Netty-SocketIO. React frontend with 3D WebGL twin. Deployed via Docker Compose. Production-grade IIoT platform."' },
];

export const DemoSimulator = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [edits, setEdits] = useState<Record<number, MachineEdit>>({});
  const [liveStats, setLiveStats] = useState<LiveStats>({ total: 0, running: 0, idle: 0, maintenance: 0, oee: '0', avgTemp: '0' });
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  // Global batch controls
  const [batchStatus, setBatchStatus] = useState('Running');
  const [batchTemp, setBatchTemp] = useState(65);
  const [batchHours, setBatchHours] = useState(1200);
  const [batchTarget, setBatchTarget] = useState<'all' | 'running' | 'idle' | 'maintenance'>('all');
  const recoveryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getToken = () => localStorage.getItem('token');

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 59)]);
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
      const res = await fetch(`${API_URL}/api/machines`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('api error');
      const data: Machine[] = await res.json();
      if (Array.isArray(data)) {
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
    statsRef.current = setInterval(fetchMachines, 4000);
    return () => {
      if (statsRef.current) clearInterval(statsRef.current);
      if (recoveryRef.current) clearInterval(recoveryRef.current);
    };
  }, [fetchMachines]);

  const updateEdit = (id: number, patch: Partial<MachineEdit>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch, dirty: true } }));
  };

  const applySingle = async (id: number) => {
    const e = edits[id];
    if (!e) return;
    await fetch(`${API_URL}/api/machines/${id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: e.status, temperature: e.temperature, runningHours: e.runningHours })
    });
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], dirty: false } }));
    addLog(`✅ #${id} → ${e.status}, ${e.temperature.toFixed(1)}°C, ${e.runningHours}h`);
    fetchMachines();
  };

  const applyAllDirty = async () => {
    const dirty = Object.entries(edits).filter(([, e]) => e.dirty);
    if (!dirty.length) return;
    setIsLoading(true);
    addLog(`📝 Pushing ${dirty.length} overrides to Spring Boot...`);
    await Promise.all(dirty.map(([id, e]) =>
      fetch(`${API_URL}/api/machines/${id}/simulate`, {
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
    await fetchMachines();
    addLog(`✅ ${dirty.length} machines updated in database.`);
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
    await fetch(`${API_URL}/api/machines/simulate/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ids: targets.map(m => m.id), status: batchStatus, temperature: batchTemp, runningHours: batchHours })
    });
    setEdits({});
    await fetchMachines();
    addLog(`✅ Batch applied to ${targets.length} machines.`);
    setIsLoading(false);
  };

  const runScenario = async (id: string) => {
    if (isLoading) return;
    if (recoveryRef.current) { clearInterval(recoveryRef.current); recoveryRef.current = null; }
    setIsLoading(true);
    setActiveScenario(id);
    addLog(`▶ Scenario: ${SCENARIOS.find(s => s.id === id)?.emoji} ${SCENARIOS.find(s => s.id === id)?.label}`);
    try {
      const res = await fetch(`${API_URL}/api/machines/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: id })
      });
      const d = await res.json();
      addLog(`✅ Scenario complete — ${d.machinesAffected || '?'} machines affected`);
      if (id === 'thermal_crisis') addLog('⚠️ AI Failure Risk > 75% — check Machines page now');
      if (id === 'cascade_failure') addLog('📉 OEE dropping — watch Dashboard & Machines Fleet banner');
    } catch {
      addLog('❌ Scenario API error — is Spring Boot running?');
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
      <div className="machines-header">
        <div>
          <h1>🎮 Demo Control Room</h1>
          <p className="subtitle">Presentation simulator — control machine stats &amp; run AI scenarios live</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={16} className="pulse" /> : <WifiOff size={16} />}
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isConnected ? 'Spring Boot Live' : 'Backend Offline'}
            </span>
          </div>
          <button className="btn-secondary" onClick={fetchMachines} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* ── Live KPI Banner ── */}
      <div className="fleet-kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: '24px' }}>
        <div className="fleet-kpi-card glass-panel">
          <Gauge size={28} className="text-accent" />
          <div className="fleet-kpi-info">
            <h3>Fleet OEE</h3>
            <span style={{ color: oeeNum >= 80 ? '#10b981' : oeeNum >= 60 ? '#f59e0b' : '#ef4444' }}>
              {liveStats.oee}<small>%</small>
            </span>
          </div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Activity size={28} className="text-success" />
          <div className="fleet-kpi-info"><h3>Running</h3><span>{liveStats.running}<small>/{liveStats.total}</small></span></div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <TrendingUp size={28} style={{ color: '#ef4444' }} />
          <div className="fleet-kpi-info"><h3>Idle</h3><span style={{ color: '#ef4444' }}>{liveStats.idle}</span></div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Settings size={28} className="text-warning" />
          <div className="fleet-kpi-info"><h3>Maintenance</h3><span style={{ color: '#f59e0b' }}>{liveStats.maintenance}</span></div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Thermometer size={28} style={{ color: '#8b5cf6' }} />
          <div className="fleet-kpi-info"><h3>Avg Temp</h3><span style={{ color: '#a78bfa' }}>{liveStats.avgTemp}<small>°C</small></span></div>
        </div>
        <div className="fleet-kpi-card glass-panel">
          <Server size={28} style={{ color: '#94a3b8' }} />
          <div className="fleet-kpi-info"><h3>Total Nodes</h3><span style={{ color: '#94a3b8' }}>{liveStats.total}</span></div>
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
              <span className="demo-pill">Server-side presets</span>
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
              <span className="demo-pill">Apply to multiple machines</span>
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
                <div className="slider-labels"><span>20°C</span><span>70°C</span><span>120°C</span></div>
              </div>
              <div className="batch-field">
                <label>Running Hours: <strong style={{ color: '#94a3b8' }}>{batchHours.toLocaleString()}h</strong></label>
                <input type="range" min={0} max={20000} step={100} value={batchHours}
                  className="demo-slider" style={{ '--tc': '#6366f1' } as React.CSSProperties}
                  onChange={e => setBatchHours(Number(e.target.value))} />
                <div className="slider-labels"><span>0h</span><span>10,000h</span><span>20,000h</span></div>
              </div>
            </div>
            <button className="demo-apply-batch" onClick={applyBatchOverride} disabled={isLoading}>
              <CheckCircle size={16} />
              Apply Batch Override
            </button>
          </div>

          {/* Per-Machine Override Table */}
          <div className="glass-panel demo-section-card">
            <div className="demo-card-header">
              <BarChart2 size={18} className="text-accent" />
              <h2>Per-Machine Override</h2>
              <span className="demo-pill">{filteredMachines.length} shown</span>
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
                placeholder="🔍 Search machines..."
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
                <span>Machine</span>
                <span>Status</span>
                <span>Temperature</span>
                <span>Hours</span>
                <span>AI Risk</span>
                <span></span>
              </div>
              {filteredMachines.map(m => {
                const e = edits[m.id] || { status: m.status, temperature: Number(m.temperature || 60), runningHours: m.runningHours || 0, dirty: false };
                const risk = getAIRisk(e.temperature, e.runningHours);
                const riskColor = risk > 75 ? '#ef4444' : risk > 50 ? '#f59e0b' : '#10b981';
                return (
                  <div key={m.id} className={`mt-row ${e.dirty ? 'mt-dirty' : ''}`}>
                    <span className="mt-name"><Server size={11} />{m.name}</span>
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
                      <span style={{ color: getTempColor(e.temperature), minWidth: '40px', fontSize: '0.76rem', fontWeight: 700 }}>
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
                        <span style={{ color: riskColor, fontSize: '0.7rem', fontWeight: 700 }}>{risk}%</span>
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
              <h2>System Activity Log</h2>
              <button className="btn-secondary" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setLog([])}>Clear</button>
            </div>
            <div className="activity-log">
              {log.length === 0 && <div className="log-empty">Run a scenario or apply an override...</div>}
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
                <h2>What To Say Now</h2>
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
              <h2>Presentation Flow</h2>
              <span className="demo-pill">7 steps</span>
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
              <h2>Quick Actions</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(16,185,129,.1)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)' }}
                onClick={() => runScenario('all_normal')} disabled={isLoading}>
                <Play size={15} /> Reset Normal
              </button>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                onClick={fetchMachines}>
                <RefreshCw size={15} /> Refresh
              </button>
              <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)' }}
                onClick={() => { setIsLoading(false); setActiveScenario(null); addLog('⏹ Stopped.'); }}>
                <AlertTriangle size={15} /> Stop
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="glass-panel demo-section-card" style={{ padding: '14px 18px' }}>
            <div className="demo-card-header" style={{ marginBottom: '8px' }}>
              <Shield size={16} className="text-accent" />
              <h2 style={{ fontSize: '0.78rem' }}>System Architecture</h2>
            </div>
            {[
              { icon: <Cpu size={13} />, text: 'Spring Boot 3.2.3 · Maven · JPA/Hibernate' },
              { icon: <Server size={13} />, text: 'PostgreSQL 15 · Redis 7 (telemetry cache)' },
              { icon: <Wifi size={13} />, text: 'Netty-SocketIO real-time (port 4001)' },
              { icon: <Clock size={13} />, text: 'Stats auto-sync every 4 seconds' },
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
