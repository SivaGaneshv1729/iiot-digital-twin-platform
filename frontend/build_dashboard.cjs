const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const returnIndex = content.indexOf('  return (');
let beforeReturn = content.substring(0, returnIndex);

if (!beforeReturn.includes('const [showDVR, setShowDVR] = useState(false);')) {
  beforeReturn = beforeReturn.replace('const [isListening, setIsListening] = useState(false);', 'const [isListening, setIsListening] = useState(false);\n  const [showDVR, setShowDVR] = useState(false);');
}
if (!beforeReturn.includes('LineChart')) {
  beforeReturn = beforeReturn.replace('ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer', 'ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart');
}
if (!beforeReturn.includes('Database')) {
  beforeReturn = beforeReturn.replace('Power', 'Power, Database, Target, ShieldCheck, ArrowRight');
}

const newReturn = `  return (
    <div className={\`dashboard-container \${isEmergencyMode ? 'emergency-mode-active' : ''}\`}>
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
            className={\`glass-panel \${showDVR ? 'listening-pulse' : ''}\`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: showDVR ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid #38bdf8', fontWeight: 'bold' }}
            title="Toggle DVR Time-Travel"
          >
            <Clock size={16} />
            <span>DVR Time-Travel</span>
          </button>
          
          <button 
            onClick={() => setAiHeatmapMode(!aiHeatmapMode)}
            className={\`glass-panel \${aiHeatmapMode ? 'listening-pulse' : ''}\`}
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

          <div className={\`connection-badge \${isConnected ? 'connected' : 'disconnected'}\`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#10b981' : '#ef4444', border: \`1px solid \${isConnected ? '#10b981' : '#ef4444'}\` }}>
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
            {dvrTime === 0 ? 'LIVE NOW' : \`\${Math.abs(dvrTime)} HOURS AGO\`}
          </div>
        </div>
      )}

      <div className="dashboard-layout">
        
        {/* Left Sidebar */}
        <div className="dashboard-sidebar-left">
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Factory Overview</h3>
            <ul className="sidebar-menu">
              <li className="active"><Activity size={16} /> Overview</li>
              <li><Zap size={16} /> Energy Monitor</li>
              <li><Leaf size={16} /> Sustainability</li>
              <li><Database size={16} /> Inventory</li>
              <li><Target size={16} /> Quality</li>
              <li><ShieldCheck size={16} /> Safety</li>
            </ul>
          </div>
          
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', alignSelf: 'flex-start' }}>Campus Status</h3>
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
        </div>

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
           <div className="glass-panel" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
             <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                AI Assistant <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>BETA</span>
             </h3>
             
             <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '4px' }}>Hello! 👋</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>How can I help you today?</div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
               <button className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><AlertOctagon size={16} color="#ef4444"/> Show me machines with highest failure risk</div>
                  <ArrowRight size={14} style={{ opacity: 0.5 }} />
               </button>
               <button className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><DollarSign size={16} color="#f59e0b"/> What is the revenue at risk today?</div>
                  <ArrowRight size={14} style={{ opacity: 0.5 }} />
               </button>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <button onClick={toggleListening} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isListening ? '#ec4899' : '#94a3b8' }}>
                 {isListening ? <Mic size={18} className="listening-pulse" /> : <Mic size={18} />}
               </button>
               <input type="text" placeholder="Ask anything about your factory..." style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' }} />
             </div>
           </div>

           <div className="glass-panel" style={{ padding: '20px' }}>
             <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Revenue At Risk</h3>
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
           
           <div className="event-stream-section glass-panel" style={{ flex: 1 }}>
              <div className="event-stream-header">
                <h2><div className="live-dot"></div> AI Prescriptions</h2>
              </div>
              <div className="event-list">
                {actions.map(action => (
                  <div className={\`action-card \${action.status === 'pending' ? \`\${action.priority}-priority\` : ''}\`} key={action.id} style={{ opacity: action.status !== 'pending' ? 0.6 : 1, padding: '12px' }}>
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
`;

fs.writeFileSync('src/pages/Dashboard.tsx', beforeReturn + newReturn);
