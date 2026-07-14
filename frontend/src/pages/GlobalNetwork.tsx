import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

export const GlobalNetwork = () => {
  const { t } = useTranslation('translation');
  const navigate = useNavigate();
  const globeEl = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 250, height: window.innerHeight - 100 });
  const [isEmergency, setIsEmergency] = useState(false);

  // Expanded Global Network Nodes
  const locations = [
    // Tier 1 Hubs
    { name: 'Tokyo HQ', lat: 35.6762, lng: 139.6503, size: 0.15, color: isEmergency ? '#ef4444' : '#10b981', tier: 1 },
    { name: 'Berlin Manufacturing', lat: 52.5200, lng: 13.4050, size: 0.15, color: '#10b981', tier: 1 },
    { name: 'New York Distribution', lat: 40.7128, lng: -74.0060, size: 0.15, color: '#10b981', tier: 1 },
    { name: 'Singapore Assembly', lat: 1.3521, lng: 103.8198, size: 0.15, color: '#10b981', tier: 1 },
    // Tier 2 & 3 Facilities
    { name: 'London Finance', lat: 51.5074, lng: -0.1278, size: 0.08, color: '#3b82f6', tier: 2 },
    { name: 'Dubai Logistics', lat: 25.2048, lng: 55.2708, size: 0.1, color: '#f59e0b', tier: 2 },
    { name: 'São Paulo Plant', lat: -23.5505, lng: -46.6333, size: 0.1, color: '#10b981', tier: 2 },
    { name: 'Mumbai Tech Center', lat: 19.0760, lng: 72.8777, size: 0.08, color: '#8b5cf6', tier: 2 },
    { name: 'Sydney Hub', lat: -33.8688, lng: 151.2093, size: 0.08, color: '#3b82f6', tier: 2 },
    { name: 'Johannesburg Depot', lat: -26.2041, lng: 28.0473, size: 0.05, color: '#14b8a6', tier: 3 },
    { name: 'Los Angeles Port', lat: 34.0522, lng: -118.2437, size: 0.1, color: '#f59e0b', tier: 2 },
    { name: 'Seoul Robotics', lat: 37.5665, lng: 126.9780, size: 0.08, color: '#8b5cf6', tier: 2 },
    { name: 'Paris Design', lat: 48.8566, lng: 2.3522, size: 0.05, color: '#ec4899', tier: 3 },
    { name: 'Toronto Data', lat: 43.6510, lng: -79.3470, size: 0.05, color: '#3b82f6', tier: 3 }
  ];

  // Complex Arcs: Hubs connect to each other and their regional depots
  const arcsData = [
    // Trans-Pacific
    { startLat: 35.6762, startLng: 139.6503, endLat: 34.0522, endLng: -118.2437, color: isEmergency ? ['#ef4444', '#ef4444'] : ['#10b981', '#f59e0b'] },
    // Trans-Atlantic
    { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: ['#10b981', '#3b82f6'] },
    // Europe to Asia
    { startLat: 52.5200, startLng: 13.4050, endLat: 25.2048, endLng: 55.2708, color: ['#10b981', '#f59e0b'] },
    { startLat: 25.2048, startLng: 55.2708, endLat: 1.3521, endLng: 103.8198, color: ['#f59e0b', '#10b981'] },
    // Intra-Asia
    { startLat: 1.3521, startLng: 103.8198, endLat: 35.6762, endLng: 139.6503, color: isEmergency ? ['#ef4444', '#ef4444'] : ['#10b981', '#10b981'] },
    { startLat: 19.0760, startLng: 72.8777, endLat: 1.3521, endLng: 103.8198, color: ['#8b5cf6', '#10b981'] },
    { startLat: 37.5665, startLng: 126.9780, endLat: 35.6762, endLng: 139.6503, color: isEmergency ? ['#ef4444', '#ef4444'] : ['#8b5cf6', '#10b981'] },
    // North/South America
    { startLat: 40.7128, startLng: -74.0060, endLat: -23.5505, endLng: -46.6333, color: ['#10b981', '#10b981'] },
    // Europe to Africa
    { startLat: 52.5200, startLng: 13.4050, endLat: -26.2041, endLng: 28.0473, color: ['#10b981', '#14b8a6'] },
    // Asia to Australia
    { startLat: 1.3521, startLng: 103.8198, endLat: -33.8688, endLng: 151.2093, color: ['#10b981', '#3b82f6'] }
  ];

  // Pulsating Rings for Tier 1 Hubs
  const ringsData = locations.filter(loc => loc.tier === 1).map(loc => ({
    lat: loc.lat,
    lng: loc.lng,
    maxR: loc.name === 'Tokyo HQ' && isEmergency ? 8 : 4,
    propagationSpeed: loc.name === 'Tokyo HQ' && isEmergency ? 5 : 2,
    repeatPeriod: loc.name === 'Tokyo HQ' && isEmergency ? 400 : 1000,
    color: loc.color
  }));

  // Floating Labels
  const labelsData = locations.map(loc => ({
    lat: loc.lat,
    lng: loc.lng,
    text: loc.name,
    color: 'rgba(255, 255, 255, 0.8)',
    size: loc.tier === 1 ? 1.5 : 0.8
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth - 250, height: window.innerHeight - 100 });
    };
    window.addEventListener('resize', handleResize);

    // Socket for emergency state
    const socket = io('http://localhost:4000');
    socket.on('emergency_stop', () => setIsEmergency(true));
    
    // Auto-rotate the globe slightly
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 1;
      // Focus on Tokyo initially
      globeEl.current.pointOfView({ lat: 35, lng: 139, altitude: 2 }, 2000);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} className="glass-panel">
      
      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>{t('Global Supply Chain')}</h2>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Live Multi-Region Factory Network</p>
        
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {locations.map((loc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isEmergency && loc.name === 'Tokyo HQ' ? (
                 <ShieldAlert size={18} color="#ef4444" />
              ) : (
                 <CheckCircle size={18} color={loc.color} />
              )}
              <span style={{ fontSize: '0.9rem', color: isEmergency && loc.name === 'Tokyo HQ' ? '#ef4444' : '#e2e8f0', fontWeight: 'bold' }}>
                {loc.name} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>(T{loc.tier})</span>
              </span>
              <button 
                onClick={() => navigate(`/?factory=${encodeURIComponent(loc.name)}`)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                title="View Digital Twin"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={locations}
        pointAltitude="size"
        pointColor="color"
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelDotRadius={0.5}
        labelColor="color"
        labelResolution={2}
        onPointClick={(point: any) => navigate(`/?factory=${encodeURIComponent(point.name)}`)}
        pointLabel="name"
      />
    </div>
  );
};
