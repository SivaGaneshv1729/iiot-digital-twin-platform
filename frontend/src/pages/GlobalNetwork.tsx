import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { io } from 'socket.io-client';

export const GlobalNetwork = () => {
  const { t } = useTranslation();
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 250, height: window.innerHeight - 100 });
  const [isEmergency, setIsEmergency] = useState(false);

  // Hardcoded locations for demo
  const locations = [
    { name: 'Tokyo HQ', lat: 35.6762, lng: 139.6503, size: 0.1, color: isEmergency ? '#ef4444' : '#10b981' },
    { name: 'Berlin Manufacturing', lat: 52.5200, lng: 13.4050, size: 0.1, color: '#10b981' },
    { name: 'New York Distribution', lat: 40.7128, lng: -74.0060, size: 0.1, color: '#10b981' },
    { name: 'Singapore Assembly', lat: 1.3521, lng: 103.8198, size: 0.1, color: '#10b981' }
  ];

  // Arcs between HQ and others
  const arcsData = locations.slice(1).map(loc => ({
    startLat: locations[0].lat,
    startLng: locations[0].lng,
    endLat: loc.lat,
    endLng: loc.lng,
    color: isEmergency ? ['#ef4444', '#ef4444'] : ['#3b82f6', '#10b981']
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
        
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {locations.map((loc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isEmergency && loc.name === 'Tokyo HQ' ? (
                 <ShieldAlert size={18} color="#ef4444" />
              ) : (
                 <CheckCircle size={18} color="#10b981" />
              )}
              <span style={{ fontSize: '0.9rem', color: isEmergency && loc.name === 'Tokyo HQ' ? '#ef4444' : '#e2e8f0', fontWeight: 'bold' }}>
                {loc.name}
              </span>
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
      />
    </div>
  );
};
