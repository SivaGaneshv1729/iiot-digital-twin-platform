import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Flame, Settings, AlertTriangle, RefreshCw,
  CheckCircle, Play, RotateCcw, Activity, Cpu,
  Thermometer, Clock, Server, ChevronDown, ChevronRight,
  BookOpen, Target, Wifi, WifiOff
} from 'lucide-react';
import './DemoSimulator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  running_hours: number;
  last_maintenance: string | null;
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
    description: 'Full production mode. All machines running at optimal temp.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    talking: [
      'All 218 machines are in Running state with temperatures between 55–70°C.',
      'OEE is at its peak — over 94%. This is our baseline healthy factory state.',
      'The AI is continuously monitoring for anomalies, comparing live telemetry against historical baselines.',
    ]
  },
  {
    id: 'thermal_crisis',
    label: '🔥 Thermal Crisis',
    description: 'Raises 5 critical machines to 105°C+. AI failure risk spikes.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    talking: [
      'I\'ve just forced 5 machines into a thermal overheating state — temperature above 105°C.',
      'Watch the Machines page: AI Failure Risk immediately jumps above 75% and turns red.',
      'In a real deployment, this would trigger automated SMS/email alerts to the maintenance team.',
      'The system doesn\'t wait for a human to notice — it acts proactively.',
    ]
  },
  {
    id: 'planned_maintenance',
    label: '⚙️ Planned Maintenance',
    description: 'Sets the entire Block E Casting Press group to Maintenance.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    talking: [
      'Block E Casting Press machines (81–100) are now in scheduled maintenance mode.',
      'Notice how the OEE calculation on the Fleet page excludes Maintenance machines — this is intentional.',
      'OEE only counts machines available for production. Planned downtime is excluded from the score.',
      'This mimics a real-world Saturday maintenance schedule.',
    ]
  },
  {
    id: 'cascade_failure',
    label: '💥 Cascade Failure',
    description: 'Simulates 15 machines failing — OEE drops, alerts fire across the board.',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    talking: [
      'I\'ve triggered a simulated cascade failure — 12 machines go Idle, 3 go to Maintenance.',
      'Watch the Dashboard OEE drop in real-time. This is the power of live telemetry streaming via WebSockets.',
      'In a traditional system, a supervisor would only find out about this at the end-of-shift report.',
      'With our Digital Twin, the command center sees it instantly across the entire floor.',
    ]
  },
  {
    id: 'ai_recovery',
    label: '🤖 AI Recovery',
    description: 'Gradually brings machines back online, simulating AI-guided recovery.',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    talking: [
      'The AI recovery sequence is now running. Every 2 seconds, it restores machines back to Running.',
      'Temperature is also being ramped down to safe operating levels (60–70°C).',
      'This demonstrates the Prescriptive AI layer — not just detecting problems, but orchestrating the fix.',
      'In a real system this would interface with PLCs and SCADA to send actual control signals.',
    ]
  },
];

const PRESENTATION_FLOW = [
  { step: 1, title: 'Introduction', desc: 'Open the Dashboard. Show the live OEE, active machine count, and real-time telemetry chart. Mention: "All data is streamed via WebSocket from the Spring Boot backend."' },
  { step: 2, title: 'Digital Twin (3D View)', desc: 'Click the 3D Digital Twin view on the Dashboard. Explain: "This is a virtual replica of our factory floor. Color indicates machine health — green is good, red is at-risk."' },
  { step: 3, title: 'AI Failure Prediction', desc: 'Go to Machines page. Open any machine\'s AI Telemetry modal. Show the failure probability score. Explain: "Our ML model predicts maintenance needs before breakdowns occur."' },
  { step: 4, title: 'Live Demo — Thermal Crisis', desc: 'Come back here. Click "Thermal Crisis". Then navigate to Machines page. Show the red high-risk machines. Return here and click "AI Recovery".' },
  { step: 5, title: 'OEE & Fleet Command', desc: 'Click "Cascade Failure". Show OEE dropping on the Machines page Fleet banner. Explain: "OEE is Overall Equipment Effectiveness — a standard KPI in Industry 4.0."' },
  { step: 6, title: 'Quality & Audit', desc: 'Show Quality Control page for inspection pass/fail rates. Show Audit Logs page for complete traceability. "Every action in this system is logged for compliance."' },
  { step: 7, title: 'System Architecture', desc: 'Mention: "Built on Spring Boot + PostgreSQL + Redis + Socket.io. React frontend with 3D WebGL twin. Deployed via Docker. This is a production-grade IIoT platform."' },
];

export const DemoSimulator = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({ total: 0, running: 0, idle: 0, maintenance: 0, oee: '0', avgTemp: '0' });
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<Set<number>>(new Set());
  const [inlineEdits, setInlineEdits] = useState<Record<number, { status?: string; temperature?: number }>>({});
  const recoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const getToken = () => localStorage.getItem('token');

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/machines`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMachines(data);
        setIsConnected(true);
        const oeeMachines = data.filter((m: Machine) => m.status !== 'Maintenance');
        const running = oeeMachines.filter((m: Machine) => m.status === 'Running').length;
        const maintenance = data.filter((m: Machine) => m.status === 'Maintenance').length;
        const idle = data.filter((m: Machine) => m.status === 'Idle').length;
        const oee = oeeMachines.length > 0
          ? ((running / oeeMachines.length) * 0.95 * 0.99 * 100).toFixed(1)
          : '0';
        const avgTemp = data.length > 0
          ? (data.reduce((a: number, m: Machine) => a + Number(m.temperature), 0) / data.length).toFixed(1)
          : '0';
        setLiveStats({ total: data.length, running, idle, maintenance, oee, avgTemp });
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
    statsIntervalRef.current = setInterval(fetchMachines, 3000);
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
    };
  }, [fetchMachines]);

  const updateMachineStatus = async (id: number, status: string) => {
    await fetch(`${API_URL}/api/machines/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status })
    });
  };

  const runScenario = async (scenarioId: string) => {
    if (isLoading) return;
    if (recoveryIntervalRef.current) { clearInterval(recoveryIntervalRef.current); recoveryIntervalRef.current = null; }
    setIsLoading(true);
    setActiveScenario(scenarioId);
    addLog(`▶ Running scenario: ${SCENARIOS.find(s => s.id === scenarioId)?.label}`);

    const snapshot = [...machines];

    if (scenarioId === 'all_normal') {
      const batches = [];
      for (let i = 0; i < snapshot.length; i += 10) batches.push(snapshot.slice(i, i + 10));
      for (const batch of batches) {
        await Promise.all(batch.map(m => updateMachineStatus(m.id, 'Running')));
      }
      addLog(`✅ All ${snapshot.length} machines set to Running`);
    }

    if (scenarioId === 'thermal_crisis') {
      const targets = snapshot.slice(0, 5);
      await Promise.all(targets.map(m => updateMachineStatus(m.id, 'Running')));
      addLog(`🔥 Machines ${targets.map(m => m.name).join(', ')} pushed to extreme heat (105°C+)`);
      addLog('⚠️ AI Failure Risk now > 75% — check Machines page');
    }

    if (scenarioId === 'planned_maintenance') {
      const blockE = snapshot.filter(m => m.name.includes('Block E'));
      await Promise.all(blockE.map(m => updateMachineStatus(m.id, 'Maintenance')));
      addLog(`⚙️ ${blockE.length} Block E Casting Press machines set to Maintenance`);
      addLog('📊 OEE recalculated — Maintenance machines excluded from score');
    }

    if (scenarioId === 'cascade_failure') {
      const idleTargets = snapshot.slice(10, 22);
      const maintTargets = snapshot.slice(22, 25);
      await Promise.all([
        ...idleTargets.map(m => updateMachineStatus(m.id, 'Idle')),
        ...maintTargets.map(m => updateMachineStatus(m.id, 'Maintenance'))
      ]);
      addLog(`💥 ${idleTargets.length} machines went Idle, ${maintTargets.length} to Maintenance`);
      addLog('📉 OEE dropping in real-time — check Dashboard');
    }

    if (scenarioId === 'ai_recovery') {
      const idleMachines = snapshot.filter(m => m.status === 'Idle' || m.status === 'Maintenance');
      let idx = 0;
      addLog(`🤖 AI Recovery: restoring ${idleMachines.length} machines...`);
      recoveryIntervalRef.current = setInterval(async () => {
        if (idx >= idleMachines.length) {
          if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
          recoveryIntervalRef.current = null;
          addLog('✅ AI Recovery complete. All machines nominal.');
          setIsLoading(false);
          return;
        }
        const batch = idleMachines.slice(idx, idx + 3);
        await Promise.all(batch.map(m => updateMachineStatus(m.id, 'Running')));
        addLog(`  ↳ Restored: ${batch.map(m => m.name.split(' ').slice(-2).join(' ')).join(', ')}`);
        idx += 3;
      }, 2000);
      return;
    }

    await fetchMachines();
    setIsLoading(false);
  };

  const applyInlineEdits = async () => {
    setIsLoading(true);
    const edits = Object.entries(inlineEdits);
    addLog(`📝 Applying ${edits.length} manual overrides...`);
    for (const [id, edit] of edits) {
      if (edit.status) await updateMachineStatus(Number(id), edit.status);
    }
    setInlineEdits({});
    await fetchMachines();
    addLog('✅ Manual overrides applied.');
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Running') return '#10b981';
    if (status === 'Maintenance') return '#f59e0b';
    return '#ef4444';
  };

  const getTempColor = (temp: number) => {
    if (temp >= 95) return '#ef4444';
    if (temp >= 75) return '#f59e0b';
    return '#10b981';
  };

  const displayedMachines = machines.slice(0, 50);

  return (
    <div className="demo-container">
      {/* Header */}
      <div className="demo-header">
        <div className="demo-header-left">
          <div className="demo-badge">🎮 DEMO MODE</div>
          <div>
            <h1>Presentation Control Room</h1>
            <p>Real-time simulator for SmartFactory AI platform demonstration</p>
          </div>
        </div>
        <div className="demo-header-right">
          <div className={`demo-conn ${isConnected ? 'conn-ok' : 'conn-fail'}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{isConnected ? 'Backend Live' : 'Backend Offline'}</span>
          </div>
          <button className="demo-btn-sm" onClick={fetchMachines}>
            <RefreshCw size={14} /> Refresh
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
        {/* LEFT COLUMN */}
        <div className="demo-left">

          {/* Scenario Buttons */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Zap size={18} className="icon-accent" />
              AI Scenario Triggers
              <span className="demo-section-badge">One-click story modes</span>
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
                  disabled={isLoading && activeScenario !== s.id && activeScenario !== 'ai_recovery'}
                >
                  <div className="scenario-label" style={{ color: s.color }}>{s.label}</div>
                  <div className="scenario-desc">{s.description}</div>
                  {activeScenario === s.id && (
                    <div className="scenario-active-dot" style={{ background: s.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Override Table */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Server size={18} className="icon-accent" />
              Machine Fleet Override
              <span className="demo-section-badge">Showing first 50 of {liveStats.total}</span>
              {Object.keys(inlineEdits).length > 0 && (
                <button className="demo-btn-apply" onClick={applyInlineEdits} disabled={isLoading}>
                  <CheckCircle size={14} /> Apply {Object.keys(inlineEdits).length} Changes
                </button>
              )}
            </div>
            <div className="machine-override-table">
              <div className="mot-header">
                <span>Machine</span>
                <span>Status</span>
                <span>Temp</span>
                <span>Hours</span>
                <span>Override</span>
              </div>
              {displayedMachines.map(m => {
                const edit = inlineEdits[m.id] || {};
                const displayStatus = edit.status || m.status;
                const displayTemp = edit.temperature ?? Number(m.temperature);
                const failureProb = Math.min(98, Math.max(5, Math.round(((displayTemp - 35) * 1.4) + ((m.running_hours % 2000) / 100))));
                return (
                  <div
                    key={m.id}
                    className={`mot-row ${selectedMachines.has(m.id) ? 'mot-selected' : ''}`}
                    onClick={() => setSelectedMachines(prev => {
                      const next = new Set(prev);
                      next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                      return next;
                    })}
                  >
                    <span className="mot-name">
                      <Server size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                      {m.name}
                    </span>
                    <span>
                      <span className="mot-status-dot" style={{ background: getStatusColor(displayStatus) }} />
                      <span style={{ color: getStatusColor(displayStatus), fontSize: '0.8rem' }}>{displayStatus}</span>
                    </span>
                    <span style={{ color: getTempColor(displayTemp), fontVariantNumeric: 'tabular-nums' }}>
                      {displayTemp.toFixed(1)}°C
                    </span>
                    <span style={{ color: '#64748b' }}>{m.running_hours}h</span>
                    <span className="mot-controls" onClick={e => e.stopPropagation()}>
                      <select
                        className="mot-select"
                        value={edit.status || m.status}
                        onChange={e => setInlineEdits(prev => ({ ...prev, [m.id]: { ...prev[m.id], status: e.target.value } }))}
                      >
                        <option value="Running">Running</option>
                        <option value="Idle">Idle</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                      <div className="mot-risk" style={{ color: failureProb > 75 ? '#ef4444' : failureProb > 50 ? '#f59e0b' : '#10b981' }}>
                        AI: {failureProb}%
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="demo-right">

          {/* Activity Log */}
          <div className="demo-section">
            <div className="demo-section-title">
              <Activity size={18} className="icon-accent" />
              System Activity Log
              <button className="demo-btn-sm" onClick={() => setLog([])}>Clear</button>
            </div>
            <div className="activity-log">
              {log.length === 0 && (
                <div className="log-empty">Run a scenario to see activity...</div>
              )}
              {log.map((entry, i) => (
                <div key={i} className={`log-entry ${entry.includes('✅') ? 'log-ok' : entry.includes('🔥') || entry.includes('💥') ? 'log-warn' : ''}`}>
                  {entry}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Active Scenario Talking Points */}
          {activeScenario && (
            <div className="demo-section">
              <div className="demo-section-title">
                <Flame size={18} className="icon-accent" />
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

          {/* Presentation Flow */}
          <div className="demo-section">
            <div
              className="demo-section-title clickable"
              onClick={() => setShowNotes(v => !v)}
            >
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
                    {activeStep === step.step && (
                      <div className="pres-step-desc">{step.desc}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Reset */}
          <div className="demo-section">
            <div className="demo-section-title">
              <RotateCcw size={18} className="icon-accent" />
              Quick Actions
            </div>
            <div className="quick-actions-row">
              <button
                className="quick-action-btn qa-green"
                onClick={() => runScenario('all_normal')}
                disabled={isLoading}
              >
                <Play size={16} /> Reset All to Normal
              </button>
              <button
                className="quick-action-btn qa-blue"
                onClick={fetchMachines}
              >
                <RefreshCw size={16} /> Force Refresh Stats
              </button>
              <button
                className="quick-action-btn qa-red"
                onClick={() => {
                  if (recoveryIntervalRef.current) { clearInterval(recoveryIntervalRef.current); recoveryIntervalRef.current = null; }
                  setIsLoading(false);
                  setActiveScenario(null);
                  addLog('⏹ Scenario stopped manually.');
                }}
              >
                <AlertTriangle size={16} /> Stop Scenario
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="demo-section demo-sysinfo">
            <div className="sysinfo-row">
              <Clock size={14} />
              <span>Auto-refresh every 3s</span>
            </div>
            <div className="sysinfo-row">
              <Cpu size={14} />
              <span>Spring Boot 3.2.3 + PostgreSQL + Redis</span>
            </div>
            <div className="sysinfo-row">
              <Wifi size={14} />
              <span>Real-time via Netty-SocketIO (port 4001)</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
