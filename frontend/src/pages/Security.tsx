import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import './Security.css';

interface CCTVFeedProps {
  id: string;
  title: string;
  imageSrc: string;
  isEmergency: boolean;
}

const CCTVFeed = ({ id, title, imageSrc, isEmergency }: CCTVFeedProps) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').substring(0, 19));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`cctv-feed ${isEmergency ? 'emergency' : ''}`}>
      <div className="cctv-video-container">
        <div className="cctv-overlay"></div>
        <div className="cctv-scanline"></div>
        <img src={imageSrc} alt={title} className="cctv-image" />
        
        {/* UI Overlays */}
        <div className="cctv-top-left">
          <div className="rec-indicator">
            <div className="rec-dot"></div> REC
          </div>
          <div className="cctv-id">{id}</div>
        </div>
        
        <div className="cctv-bottom-left">
          <div className="cctv-title">{title}</div>
        </div>
        
        <div className="cctv-top-right">
          <div className="cctv-time">{time}</div>
        </div>

        {isEmergency && (
          <div className="cctv-emergency-overlay">
            <AlertOctagon size={48} className="pulse-fast" />
            <span>CRITICAL LOCKDOWN</span>
            <small>JIDOKA EMERGENCY PROTOCOL ENGAGED</small>
          </div>
        )}
      </div>
    </div>
  );
};

const CyberThreatMonitor = () => {
  const [threats, setThreats] = useState<{ id: number; type: string; ip: string; status: string; time: string }[]>([]);

  useEffect(() => {
    let idCounter = 0;
    const interval = setInterval(() => {
      const threatTypes = ['DDoS Attempt', 'Unauthorized Port Scan', 'SQL Injection Probe', 'Failed SSH Login', 'Malware Signature Detected'];
      const statuses = ['BLOCKED', 'BLOCKED', 'QUARANTINED', 'DROPPED', 'ANALYZING'];
      const newThreat = {
        id: idCounter++,
        type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        time: new Date().toISOString().substring(11, 19)
      };
      
      setThreats(prev => [newThreat, ...prev].slice(0, 8));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-threat-monitor">
      <div className="cyber-header">
        <ShieldAlert size={18} className="cyber-icon" />
        <h3>CYBER THREAT INTELLIGENCE (IDS/IPS)</h3>
        <div className="live-badge">ACTIVE</div>
      </div>
      <div className="cyber-terminal">
        {threats.length === 0 ? (
          <div className="terminal-line">Initializing Intrusion Detection System...</div>
        ) : (
          threats.map(t => (
            <div key={t.id} className="terminal-line">
              <span className="term-time">[{t.time}]</span> 
              <span className="term-ip">{t.ip}</span> 
              <span className="term-type">{t.type}</span>
              <span className={`term-status ${t.status.toLowerCase()}`}>{t.status}</span>
            </div>
          ))
        )}
        <div className="terminal-cursor">_</div>
      </div>
    </div>
  );
};

export const Security = () => {
  const { t } = useTranslation();
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:4000');
    
    socket.on('emergency_stop', () => {
      setIsEmergencyMode(true);
    });

    return () => { socket.disconnect(); };
  }, []);

  const triggerEmergencyStop = async () => {
    if (!window.confirm("CRITICAL WARNING: This will immediately halt all factory production lines. Are you absolutely sure?")) return;
    
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

  return (
    <div className="security-dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>{t('Global Security Network')}</h1>
          <p className="subtitle">{t('Live CCTV Monitoring & Facility Security')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={triggerEmergencyStop}
            className="btn-danger glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', background: 'rgba(220, 38, 38, 0.2)', color: '#ef4444', border: '2px solid #dc2626', fontWeight: 'bold' }}
          >
            <AlertOctagon size={16} />
            <span>{t('ENGAGE LOCKDOWN')}</span>
          </button>
          
          <div className="connection-badge connected" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981' }}>
            <ShieldAlert size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('Security Systems Active')}</span>
          </div>
        </div>
      </div>

      <div className="security-content-grid">
        {/* Cyber Security Column */}
        <div className="cyber-column">
          <CyberThreatMonitor />
          
          <div className="security-stats glass-panel">
            <h3>Firewall Status</h3>
            <div className="stat-row"><span>Inbound Traffic</span> <span className="stat-value safe">14.2 GB/s</span></div>
            <div className="stat-row"><span>Threats Blocked (24h)</span> <span className="stat-value warning">8,492</span></div>
            <div className="stat-row"><span>Encryption Level</span> <span className="stat-value safe">AES-256-GCM</span></div>
            <div className="stat-row"><span>Zero-Trust Network</span> <span className="stat-value safe">ENFORCED</span></div>
          </div>
        </div>

        {/* Physical Security CCTV Column */}
        <div className="cctv-column">
          <div className="cctv-grid">
            <CCTVFeed 
              id="CAM_01" 
              title="Floor 1: Heavy Assembly Line" 
              imageSrc="/cctv/cctv_assembly_floor_1783936023913.png" 
              isEmergency={isEmergencyMode} 
            />
            <CCTVFeed 
              id="CAM_02" 
              title="Floor 2: Main AI Server Core" 
              imageSrc="/cctv/cctv_server_core_1783936034747.png" 
              isEmergency={isEmergencyMode} 
            />
            <CCTVFeed 
              id="CAM_03" 
              title="Loading Dock / Logistics" 
              imageSrc="/cctv/cctv_loading_dock_1783936045989.png" 
              isEmergency={isEmergencyMode} 
            />
            <CCTVFeed 
              id="CAM_04" 
              title="Autonomous Drone Charging Bay" 
              imageSrc="/cctv/cctv_drone_bay_1783936057618.png" 
              isEmergency={isEmergencyMode} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
