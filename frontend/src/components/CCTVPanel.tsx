import React, { useState, useEffect } from 'react';
import './CCTVPanel.css';

interface CCTVPanelProps {
  isEmergencyMode: boolean;
}

const FEEDS = [
  { id: 'CAM-01', name: 'Assembly Floor', src: '/cctv/cctv_assembly_floor_1783936023913.png' },
  { id: 'CAM-02', name: 'Server Core', src: '/cctv/cctv_server_core_1783936034747.png' },
  { id: 'CAM-03', name: 'Loading Dock', src: '/cctv/cctv_loading_dock_1783936045989.png' },
  { id: 'CAM-04', name: 'Drone Bay', src: '/cctv/cctv_drone_bay_1783936057618.png' }
];

export const CCTVPanel: React.FC<CCTVPanelProps> = ({ isEmergencyMode }) => {
  const [activeFeed, setActiveFeed] = useState(0);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(`${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`cctv-panel glass-panel ${isEmergencyMode ? 'emergency-cctv' : ''}`}>
      <div className="cctv-header">
        <div className="cctv-title">
          <div className="live-indicator"></div>
          SECURITY_FEED // {FEEDS[activeFeed].id}
        </div>
        <div className="cctv-tabs">
          {FEEDS.map((feed, idx) => (
            <button 
              key={feed.id} 
              className={`cctv-tab ${activeFeed === idx ? 'active' : ''}`}
              onClick={() => setActiveFeed(idx)}
            >
              {feed.id}
            </button>
          ))}
        </div>
      </div>

      <div className="cctv-viewfinder">
        <img src={FEEDS[activeFeed].src} alt={FEEDS[activeFeed].name} className="cctv-image" />
        
        {/* Overlay Effects */}
        <div className="cctv-scanlines"></div>
        
        {/* OSD Overlay */}
        <div className="cctv-osd top-left">{FEEDS[activeFeed].name}</div>
        <div className="cctv-osd top-right">REC <div className="live-indicator small"></div></div>
        <div className="cctv-osd bottom-left">CH: {activeFeed + 1}</div>
        <div className="cctv-osd bottom-right">{timeStr}</div>

        {isEmergencyMode && (
          <div className="cctv-emergency-overlay">
            <span>SECURITY LOCKDOWN</span>
          </div>
        )}
      </div>
    </div>
  );
};
