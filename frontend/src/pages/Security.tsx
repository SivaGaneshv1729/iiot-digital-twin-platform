import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, Video, ShieldAlert, Zap } from 'lucide-react';
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

      <div className="cctv-grid">
        <CCTVFeed 
          id="CAM_01" 
          title="Floor 1: Heavy Assembly Line" 
          imageSrc="/cctv_assembly.png" 
          isEmergency={isEmergencyMode} 
        />
        <CCTVFeed 
          id="CAM_02" 
          title="Floor 2: Main AI Server Core" 
          imageSrc="/cctv_server.png" 
          isEmergency={isEmergencyMode} 
        />
        <CCTVFeed 
          id="CAM_03" 
          title="Loading Dock / Logistics" 
          imageSrc="/cctv_dock.png" 
          isEmergency={isEmergencyMode} 
        />
        <CCTVFeed 
          id="CAM_04" 
          title="Autonomous Drone Charging Bay" 
          imageSrc="/cctv_drone.png" 
          isEmergency={isEmergencyMode} 
        />
      </div>
    </div>
  );
};
