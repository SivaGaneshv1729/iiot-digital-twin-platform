import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Flame, Settings, AlertTriangle, RefreshCw,
  CheckCircle, Play, RotateCcw, Activity, Cpu,
  Thermometer, Clock, Server, ChevronDown, ChevronRight,
  BookOpen, Target, Wifi, WifiOff, Sliders
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
    label: '🟢 All Normal',
    description: 'Full production. All machines Running at optimal 55–70°C.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    talking: [
      'All 218 machines are in Running state with temperatures between 55–70°C.',
      'OEE is at its peak — over 94%. This is our baseline healthy factory state.',
      'The AI is continuously monitoring for anomalies against historical baselines.',
    ]
  },
  {
    id: 'thermal_crisis',
    label: '🔥 Thermal Crisis',
    description: '5 machines hit 100–115°C. AI failure risk spikes red instantly.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    talking: [
      'I\'ve forced 5 machines into a thermal overheating state — 100–115°C.',
      'Watch the Machines page: AI Failure Risk jumps above 75% and turns red.',
      'In real deployment, this triggers automated SMS/email alerts to the maintenance team.',
      'The system doesn\'t wait for a human to notice — it acts proactively.',
    ]
  },
  {
    id: 'planned_maintenance',
    label: '⚙️ Planned Maintenance',
    description: 'Block E Casting Press machines set to Maintenance.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    talking: [
      'Block E Casting Press machines are now in scheduled maintenance mode.',
      'Notice how OEE excludes Maintenance machines — this is intentional.',
      'OEE only counts machines available for production. Planned downtime is excluded.',
    ]
  },
  {
    id: 'cascade_failure',
    label: '💥 Cascade Failure',
    description: '12 machines Idle + 3 Maintenance. OEE drops live.',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    talking: [
      'Simulated cascade failure: 12 machines Idle, 3 in Maintenance.',
      'Watch OEE drop on the Machines page Fleet banner in real-time.',
      'In a traditional system, a supervisor would find out at end-of-shift — not us.',
    ]
  },
];

const PRESENTATION_FLOW = [
  { step: 1, title: 'Introduction', desc: 'Open the Dashboard. Show the live OEE, active machine count, and real-time telemetry chart. "All data streams via WebSocket from our Spring Boot backend."' },
  { step: 2, title: '3D Digital Twin', desc: 'Click the 3D twin view on Dashboard. "This is a virtual replica of our factory floor. Color = machine health. Green is good, red is at-risk."' },
  { step: 3, title: 'AI Failure Prediction', desc: 'Go to Machines page. Open any machine\'s AI Telemetry modal. Show the failure probability score and trend chart.' },
  { step: 4, title: 'Custom Temp Override', desc: 'Come to Demo Mode. Find a machine in the table. Drag its temperature to 105°C. Click Apply. Navigate to Machines — watch it turn red.' },
  { step: 5, title: 'Thermal Crisis Scenario', desc: 'Click "Thermal Crisis". This fires the backend scenario API which sets 5 machines to 100–115°C server-side. Show red machines on Machines page.' },
  { step: 6, title: 'Recovery & OEE', desc: 'Click "All Normal" to recover. Watch OEE climb back. "This is prescriptive AI — not just detecting, but orchestrating recovery."' },
  { step: 7, title: 'Architecture Wrap', desc: '"Spring Boot 3 + PostgreSQL + Redis + Netty-SocketIO. React frontend with 3D WebGL twin. Deployed via Docker Compose. Production-grade IIoT platform."' },
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
        // Normalize running_hours field
        const normalized = data.map(m => ({ ...m, runningHours: m.runningHours ?? m.running_hours ?? 0 }));
        setMachines(normalized);
        setIsConnected(true);
        calcStats(normalized);
        // Seed edit state for machines not yet in edits
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

  // Apply single machine override
  const applySingle = async (id: number) => {
    const e = edits[id];
    if (!e) return;
    await fetch(`${API_URL}/api/machines/${id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: e.status, temperature: e.temperature, runningHours: e.runningHours })
    });
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], dirty: false } }));
    addLog(`✅ Machine #${id} → Status: ${e.status}, Temp: ${e.temperature}°C, Hours: ${e.runningHours}h`);
    fetchMachines();
  };

  // Apply all dirty edits
  const applyAllDirty = async () => {
    const dirty = Object.entries(edits).filter(([, e]) => e.dirty);
    if (dirty.length === 0) return;
    setIsLoading(true);
    addLog(`📝 Applying ${dirty.length} overrides...`);
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
    addLog(`✅ ${dirty.length} machines updated.`);
    setIsLoading(false);
  };

  const runScenario = async (id: string) => {
    if (isLoading) return;
    if (recoveryRef.current) { clearInterval(recoveryRef.current); recoveryRef.current = null; }
    setIsLoading(true);
    setActiveScenario(id);
    addLog(`▶ Scenario: ${SCENARIOS.find(s => s.id === id)?.label}`);

    if (id === 'all_normal') {
      const res = await fetch(`${API_URL}/api/machines/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: 'all_normal' })
      });
      const d = await res.json();
      addLog(`✅ ${d.machinesAffected} machines set to Running (55–70°C)`);
      // Clear all edits so UI re-syncs from server
      setEdits({});
    }

    if (id === 'thermal_crisis') {
      const res = await fetch(`${API_URL}/api/machines/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: 'thermal_crisis' })
      });
      const d = await res.json();
      addLog(`🔥 ${d.machinesAffected || 5} machines pushed to 100–115°C`);
      addLog('⚠️ AI Failure Risk > 75% — check Machines page');
    }

    if (id === 'planned_maintenance') {
      const res = await fetch(`${API_URL}/api/machines/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: 'planned_maintenance' })
      });
      const d = await res.json();
      addLog(`⚙️ Block E machines → Maintenance (${d.machinesAffected} total processed)`);
      addLog('📊 OEE recalculated — Maintenance excluded');
    }

    if (id === 'cascade_failure') {
      const res = await fetch(`${API_URL}/api/machines/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scenario: 'cascade_failure' })
      });
      const d = await res.json();
      addLog(`💥 Cascade failure applied (${d.machinesAffected} machines processed)`);
      addLog('📉 OEE dropping — watch Dashboard');
    }

    await fetchMachines();
    setIsLoading(false);
  };

  const dirtyCount = Object.values(edits).filter(e => e.dirty).length;

  const getTempColor = (t: number) =>
    t >= 95 ? '#ef4444' : t >= 75 ? '#f59e0b' : '#10b981';

  const getAIRisk = (temp: number, hours: number) =>
    Math.min(98, Math.max(5, Math.round(((temp - 35) * 1.4) + ((hours % 2000) / 100))));

  const updateEdit = (id: number, patch: Partial<MachineEdit>) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], ...patch, dirty: true }
    }));
  };

  return (
    <div className="demo-container">
      {/* Header */}
      <div className="demo-header">
        <div className="demo-header-left">
          <div className="demo-badge">🎮 DEMO MODE</div>
          <div>
            <h1>Presentation Control Room</h1>
            <p>Real-time simulator — control machine stats, run AI scenarios, guide judges</p>
          </div>
        </div>
        <div className="demo-header-right">
          <div className={`demo-conn ${isConnected ? 'conn-ok' : 'conn-fail'}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{isConnected ? 'Spring Boot Live' : 'Backend Offline'}</span>
          </div>
          <button className="demo-btn-sm" onClick={fetchMachines}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* Live Stats Banner */}
      <div className="demo-stats-row">
        {[
          { icon: <Target size={20} />, label: 'Fleet OEE', value: `${liveStats.oee}%`, color: '#06b6d4' },
          { icon: <Activity size={20} />, label: 'Running', value: liveStats.running, color: '#10b981' },
          { icon: <Server size={20} />, label: 'Idle', value: liveStats.idle, color: '#ef4444' },
          { icon: <Settings size={20} />, label: 'Maintenance', value: liveStats.maintenance, color: '#f59e0b' },
          { icon: <Thermometer size={20} />, label: 'Avg Temp', value: `${liveStats.avgTemp}°C`, color: '#8b5cf6' },
          { icon: <Cpu size={20} />, label: 'Total Nodes', value: liveStats.total, color: '#94a3b8' },
        ].map((stat, i) => (
          <div key={i} className="demo-stat-card" style={{ borderColor: `${stat.color}40` }}>
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <div>
              <div className="demo-stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="demo-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="demo-main-grid">
        {/* ── LEFT ────────────────────────────────────── */}
        <div className="demo-left">

          {/* Scenario Buttons */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Zap size={18} className="icon-accent" />
              AI Scenario Triggers
              <span className="demo-section-badge">Server-side preset modes</span>
            </div>
            <div className="scenarios-grid">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  className={`scenario-btn ${activeScenario === s.id ? 'scenario-active' : ''}`}
                  style={{
                    background: s.bgColor,
                    borderColor: activeScenario === s.id ? s.color : s.borderColor,
                    boxShadow: activeScenario === s.id ? `0 0 20px ${s.color}40` : 'none'
                  }}
                  onClick={() => runScenario(s.id)}
                  disabled={isLoading}
                >
                  <div className="scenario-label" style={{ color: s.color }}>{s.label}</div>
                  <div className="scenario-desc">{s.description}</div>
                  {activeScenario === s.id && isLoading && (
                    <div className="scenario-spinner" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Custom Stats Override */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Sliders size={18} className="icon-accent" />
              Custom Machine Stats Override
              <span className="demo-section-badge">Showing {Math.min(machines.length, 40)} of {machines.length}</span>
              {dirtyCount > 0 && (
                <button className="demo-btn-apply" onClick={applyAllDirty} disabled={isLoading}>
                  <CheckCircle size={14} /> Apply {dirtyCount} Changes
                </button>
              )}
            </div>

            <div className="machine-override-table">
              <div className="mot-header">
                <span>Machine</span>
                <span>Status</span>
                <span>Temp (°C)</span>
                <span>Hours</span>
                <span>AI Risk</span>
                <span>Apply</span>
              </div>
              {machines.slice(0, 40).map(m => {
                const e = edits[m.id] || { status: m.status, temperature: Number(m.temperature || 60), runningHours: m.runningHours || 0, dirty: false };
                const risk = getAIRisk(e.temperature, e.runningHours);
                const riskColor = risk > 75 ? '#ef4444' : risk > 50 ? '#f59e0b' : '#10b981';
                return (
                  <div key={m.id} className={`mot-row ${e.dirty ? 'mot-dirty' : ''}`}>
                    <span className="mot-name">
                      <Server size={11} style={{ color: '#475569', flexShrink: 0 }} />
                      {m.name}
                    </span>

                    {/* Status */}
                    <span>
                      <select
                        className={`mot-select status-select status-${e.status.toLowerCase()}`}
                        value={e.status}
                        onChange={ev => updateEdit(m.id, { status: ev.target.value })}
                      >
                        <option value="Running">Running</option>
                        <option value="Idle">Idle</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </span>

                    {/* Temperature slider */}
                    <span className="mot-temp-cell">
                      <input
                        type="range"
                        min={20}
                        max={120}
                        step={0.5}
                        value={e.temperature}
                        className="temp-slider"
                        style={{ '--thumb-color': getTempColor(e.temperature) } as React.CSSProperties}
                        onChange={ev => updateEdit(m.id, { temperature: Number(ev.target.value) })}
                      />
                      <span style={{ color: getTempColor(e.temperature), fontWeight: 700, minWidth: '42px', fontSize: '0.78rem' }}>
                        {e.temperature.toFixed(1)}°
                      </span>
                    </span>

                    {/* Running Hours */}
                    <span>
                      <input
                        type="number"
                        className="mot-hours-input"
                        value={e.runningHours}
                        min={0}
                        max={99999}
                        onChange={ev => updateEdit(m.id, { runningHours: Number(ev.target.value) })}
                      />
                    </span>

                    {/* AI Risk */}
                    <span>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-bg">
                          <div className="risk-bar-fill" style={{ width: `${risk}%`, background: riskColor }} />
                        </div>
                        <span style={{ color: riskColor, fontWeight: 700, fontSize: '0.72rem' }}>{risk}%</span>
                      </div>
                    </span>

                    {/* Apply button */}
                    <span>
                      <button
                        className={`mot-apply-btn ${e.dirty ? 'mot-apply-active' : ''}`}
                        onClick={() => applySingle(m.id)}
                        disabled={!e.dirty || isLoading}
                        title="Push to backend"
                      >
                        <CheckCircle size={13} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT ───────────────────────────────────── */}
        <div className="demo-right">

          {/* Activity Log */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Activity size={18} className="icon-accent" />
              System Activity Log
              <button className="demo-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setLog([])}>Clear</button>
            </div>
            <div className="activity-log">
              {log.length === 0 && <div className="log-empty">Run a scenario or apply an override...</div>}
              {log.map((entry, i) => (
                <div key={i} className={`log-entry ${entry.includes('✅') ? 'log-ok' : entry.includes('🔥') || entry.includes('💥') || entry.includes('⚠️') ? 'log-warn' : ''}`}>
                  {entry}
                </div>
              ))}
            </div>
          </div>

          {/* Active Scenario Talking Points */}
          {activeScenario && (
            <div className="demo-section">
              <div className="demo-section-title">
                <Flame size={18} style={{ color: '#f59e0b' }} />
                What To Say Now
              </div>
              <div className="talking-points">
                {SCENARIOS.find(s => s.id === activeScenario)?.talking.map((point, i) => (
                  <div key={i} className="talking-point">
                    <span className="talking-num">{i + 1}</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Presentation Flow Guide */}
          <div className="demo-section">
            <div className="demo-section-title clickable" onClick={() => setShowNotes(v => !v)}>
              <BookOpen size={18} className="icon-accent" />
              Presentation Flow Guide
              <span className="demo-section-badge">7 steps</span>
              {showNotes ? <ChevronDown size={16} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
            </div>
            {showNotes && (
              <div className="pres-flow">
                {PRESENTATION_FLOW.map(step => (
                  <div
                    key={step.step}
                    className={`pres-step ${activeStep === step.step ? 'pres-step-active' : ''}`}
                    onClick={() => setActiveStep(prev => prev === step.step ? null : step.step)}
                  >
                    <div className="pres-step-header">
                      <span className="pres-step-num">{step.step}</span>
                      <span className="pres-step-title">{step.title}</span>
                      {activeStep === step.step ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {activeStep === step.step && <div className="pres-step-desc">{step.desc}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="demo-section">
            <div className="demo-section-title">
              <RotateCcw size={18} className="icon-accent" />
              Quick Actions
            </div>
            <div className="quick-actions-row">
              <button className="quick-action-btn qa-green" onClick={() => runScenario('all_normal')} disabled={isLoading}>
                <Play size={15} /> Reset All Normal
              </button>
              <button className="quick-action-btn qa-blue" onClick={fetchMachines}>
                <RefreshCw size={15} /> Refresh Stats
              </button>
              <button className="quick-action-btn qa-red" onClick={() => {
                if (recoveryRef.current) { clearInterval(recoveryRef.current); recoveryRef.current = null; }
                setIsLoading(false);
                setActiveScenario(null);
                addLog('⏹ Stopped.');
              }}>
                <AlertTriangle size={15} /> Stop
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="demo-section demo-sysinfo">
            <div className="sysinfo-row"><Clock size={13} /><span>Stats auto-sync every 4s</span></div>
            <div className="sysinfo-row"><Cpu size={13} /><span>Spring Boot 3.2.3 · PostgreSQL · Redis</span></div>
            <div className="sysinfo-row"><Wifi size={13} /><span>Real-time via Netty-SocketIO (port 4001)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
