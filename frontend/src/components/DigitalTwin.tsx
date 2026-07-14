import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder } from '@react-three/drei';
import { XR, ARButton, createXRStore } from '@react-three/xr';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import './DigitalTwin.css';

interface Machine {
  id: number;
  name: string;
  status: string;
  temperature: number;
  running_hours: number;
}

interface DigitalTwinProps {
  machines: Machine[];
  onSelectMachine?: (id: number) => void;
  thermalMode?: boolean;
  isEmergencyMode?: boolean;
}

// --------------------------------------------------------------------------
// Robotic Arm Component (Articulated Kinematics)
// --------------------------------------------------------------------------
const RoboticArm = ({ position, speedOffset = 0, isEmergencyMode }: { position: [number, number, number], speedOffset?: number, isEmergencyMode?: boolean }) => {
  const baseRef = useRef<THREE.Group>(null);
  const joint1Ref = useRef<THREE.Group>(null);
  const joint2Ref = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isEmergencyMode) return;
    const t = state.clock.elapsedTime + speedOffset;
    
    if (baseRef.current) baseRef.current.rotation.y = Math.sin(t * 1.2) * 1.5;
    if (joint1Ref.current) joint1Ref.current.rotation.z = Math.sin(t * 1.5) * 0.8 + 0.5;
    if (joint2Ref.current) joint2Ref.current.rotation.z = Math.cos(t * 2) * 0.8 - 0.5;
    
    // Pulse laser head
    if (headRef.current) {
      (headRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 10) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Base Pedestal */}
      <Cylinder args={[0.4, 0.5, 0.4]} position={[0, 0.2, 0]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </Cylinder>
      
      {/* Swivel Base */}
      <group ref={baseRef} position={[0, 0.4, 0]}>
        <Box args={[0.3, 0.6, 0.3]} position={[0, 0.3, 0]} castShadow>
          <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.2} /> {/* Orange Industrial */}
        </Box>
        
        {/* Arm Segment 1 */}
        <group ref={joint1Ref} position={[0, 0.6, 0]}>
          <Cylinder args={[0.15, 0.15, 0.3]} rotation={[Math.PI/2, 0, 0]}>
            <meshStandardMaterial color="#1e293b" />
          </Cylinder>
          <Box args={[0.2, 1.2, 0.2]} position={[0, 0.6, 0]} castShadow>
             <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </Box>
          
          {/* Arm Segment 2 */}
          <group ref={joint2Ref} position={[0, 1.2, 0]}>
            <Cylinder args={[0.12, 0.12, 0.25]} rotation={[Math.PI/2, 0, 0]}>
              <meshStandardMaterial color="#1e293b" />
            </Cylinder>
            <Box args={[0.15, 1, 0.15]} position={[0, 0.5, 0]} castShadow>
              <meshStandardMaterial color="#f59e0b" metalness={0.5} />
            </Box>
            
            {/* Toolhead / Laser Welder */}
            <group position={[0, 1, 0]}>
              <Box args={[0.2, 0.3, 0.2]}>
                 <meshStandardMaterial color="#0f172a" />
              </Box>
              <mesh position={[0, 0.2, 0]} ref={headRef}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// --------------------------------------------------------------------------
// Complex High-End CNC Machine
// --------------------------------------------------------------------------
const HighEndMachine = ({ machine, position, onClick }: { machine: Machine, position: [number, number, number], onClick?: () => void }) => {
  const spindleRef = useRef<THREE.Mesh>(null);
  const dataStreamRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (machine.status === 'Running' && spindleRef.current) {
      spindleRef.current.rotation.y += 0.8;
      spindleRef.current.position.x = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.3;
    }
    if (dataStreamRef.current) {
      (dataStreamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(state.clock.elapsedTime * 5 + position[2]) * 0.3;
    }
  });

  let statusColor = '#3b82f6';
  if (machine.status === 'Running') statusColor = '#10b981';
  if (machine.status === 'Maintenance' || machine.temperature > 85) statusColor = '#ef4444';

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      {/* Heavy Steel Chassis */}
      <Box args={[2.2, 0.6, 1.8]} position={[0, 0.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} />
      </Box>

      {/* Transparent Plasma Shield */}
      <Box args={[2, 1.5, 1.6]} position={[0, 1.35, 0]}>
        <meshPhysicalMaterial color="#94a3b8" transparent opacity={0.15} transmission={0.9} thickness={0.5} roughness={0} />
      </Box>

      {/* Internal Machining Bed */}
      <Box args={[1.6, 0.2, 1.2]} position={[0, 0.7, 0]} receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </Box>

      {/* Animated Spindle */}
      <group position={[0, 1.8, 0]}>
        <Cylinder args={[0.08, 0.02, 0.6]} position={[0, -0.3, 0]} ref={spindleRef} castShadow>
          <meshStandardMaterial color="#f8fafc" metalness={1} roughness={0} />
        </Cylinder>
      </group>

      {/* Holographic Status Screen */}
      <Box args={[0.05, 0.8, 0.6]} position={[1.15, 1.4, 0]}>
         <meshStandardMaterial color="#020617" />
      </Box>
      <mesh position={[1.18, 1.4, 0]} rotation={[0, Math.PI/2, 0]} ref={dataStreamRef}>
         <planeGeometry args={[0.5, 0.7]} />
         <meshBasicMaterial color={statusColor} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Neon Base Strip (Bloom target) */}
      <Box args={[2.3, 0.05, 1.9]} position={[0, 0.02, 0]}>
         <meshBasicMaterial color={statusColor} />
      </Box>
    </group>
  );
};

// --------------------------------------------------------------------------
// Campus Structures (Buildings, Roads, Silos)
// --------------------------------------------------------------------------
const Building = ({ position, args, theme, isGlass = false }: any) => (
  <group position={position}>
    {isGlass ? (
      <Box args={args} castShadow receiveShadow>
        <meshPhysicalMaterial color={theme === 'light' ? "#e2e8f0" : "#0f172a"} transparent opacity={0.2} transmission={0.9} thickness={0.5} roughness={0.1} />
      </Box>
    ) : (
      <Box args={args} castShadow receiveShadow>
        <meshStandardMaterial color={theme === 'light' ? "#f1f5f9" : "#1e293b"} metalness={0.5} roughness={0.8} />
      </Box>
    )}
    {/* Outline/Frame */}
    <Box args={[args[0] + 0.5, args[1] + 0.5, args[2] + 0.5]}>
      <meshBasicMaterial color={theme === 'light' ? "#cbd5e1" : "#334155"} wireframe />
    </Box>
  </group>
);

const CampusEnvironment = ({ theme }: { theme: string }) => {
  return (
    <group>
      {/* Massive Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={theme === 'light' ? "#f8fafc" : "#020617"} roughness={1} />
      </mesh>

      {/* Main Intersecting Roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[400, 16]} />
        <meshStandardMaterial color={theme === 'light' ? "#94a3b8" : "#0f172a"} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <planeGeometry args={[16, 400]} />
        <meshStandardMaterial color={theme === 'light' ? "#94a3b8" : "#0f172a"} roughness={0.9} />
      </mesh>
      
      {/* Road Markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[400, 0.4]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Buildings */}
      {/* Unit 1: Assembly (Glass Roof to see inside) */}
      <Building position={[-50, 15, -50]} args={[80, 30, 80]} theme={theme} isGlass={true} />
      
      {/* Unit 2: Logistics (Opaque with glass accents) */}
      <Building position={[60, 20, -50]} args={[70, 40, 70]} theme={theme} isGlass={true} />

      {/* R&D / Admin Tower */}
      <Building position={[0, 50, 60]} args={[40, 100, 40]} theme={theme} isGlass={true} />
      <Building position={[0, 5, 80]} args={[60, 10, 20]} theme={theme} isGlass={false} />

      {/* Industrial Silos / Cooling Towers */}
      {[-80, -65, -50].map((z) => (
        <group key={`silo-${z}`} position={[-110, 20, z]}>
          <Cylinder args={[8, 8, 40]} castShadow receiveShadow>
             <meshStandardMaterial color={theme === 'light' ? "#e2e8f0" : "#1e293b"} metalness={0.6} />
          </Cylinder>
          <Cylinder args={[8.2, 8.2, 0.5]} position={[0, 15, 0]}>
             <meshBasicMaterial color="#3b82f6" />
          </Cylinder>
        </group>
      ))}

      {/* Solar Panels on Unit 2 Roof */}
      <group position={[60, 40.5, -50]}>
         {[-20, 0, 20].map(x => 
           [-20, 0, 20].map(z => (
             <mesh key={`solar-${x}-${z}`} position={[x, 0, z]} rotation={[-Math.PI / 2 + 0.2, 0, 0]} castShadow>
                <planeGeometry args={[15, 10]} />
                <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.1} />
             </mesh>
           ))
         )}
      </group>
    </group>
  );
};

// --------------------------------------------------------------------------
// Warehouse Racks (Logistics Zone)
// --------------------------------------------------------------------------
const WarehouseRacks = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Rack Framework */}
      <Box args={[30, 15, 4]} position={[0, 7.5, 0]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.8} wireframe />
      </Box>
      {/* Shelves & Crates */}
      {[2, 6, 10, 14].map((y) => (
        <group key={`shelf-${y}`} position={[0, y, 0]}>
          <Box args={[30, 0.2, 4]}><meshStandardMaterial color="#1e293b" /></Box>
          {/* Crates */}
          {[-12, -6, 0, 6, 12].map((x) => (
             <Box key={`crate-${x}`} args={[3, 2.5, 3]} position={[x, 1.35, 0]} castShadow>
               <meshStandardMaterial color={Math.random() > 0.8 ? '#f59e0b' : '#0ea5e9'} roughness={0.6} />
             </Box>
          ))}
        </group>
      ))}
    </group>
  );
};

// --------------------------------------------------------------------------
// Conveyor Belts
// --------------------------------------------------------------------------
const ConveyorLine = ({ position, length }: { position: [number, number, number], length: number }) => {
  return (
    <group position={position}>
      <Box args={[length, 0.4, 1.2]} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </Box>
      {/* Conveyor Belt Surface */}
      <Box args={[length, 0.05, 1]} position={[0, 0.42, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </Box>
      <Box args={[length, 0.05, 0.05]} position={[0, 0.2, 0.65]}><meshBasicMaterial color="#f59e0b" /></Box>
      <Box args={[length, 0.05, 0.05]} position={[0, 0.2, -0.65]}><meshBasicMaterial color="#f59e0b" /></Box>
    </group>
  );
};

// --------------------------------------------------------------------------
// Supply Chain & Logistics Truck
// --------------------------------------------------------------------------
const LogisticsTruck = ({ startPosition, delay, isEmergencyMode }: { startPosition: [number, number, number], delay: number, isEmergencyMode?: boolean }) => {
  const truckRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!truckRef.current || isEmergencyMode) return;
    const t = state.clock.elapsedTime + delay;
    
    // Move along X axis on the main road (z = 4)
    const cycle = t % 30;
    if (cycle < 15) {
      // Driving left to right
      truckRef.current.position.x = -150 + (cycle * 20);
      truckRef.current.position.z = 4;
      truckRef.current.rotation.y = Math.PI / 2;
    } else {
      // Driving right to left on other lane
      truckRef.current.position.x = 150 - ((cycle - 15) * 20);
      truckRef.current.position.z = -4;
      truckRef.current.rotation.y = -Math.PI / 2;
    }
  });

  return (
    <group ref={truckRef} position={startPosition}>
      {/* Truck Cab */}
      <Box args={[1.5, 1.2, 1.2]} position={[0, 0.6, 2.5]} castShadow>
        <meshStandardMaterial color="#3b82f6" metalness={0.8} />
      </Box>
      {/* Truck Trailer */}
      <Box args={[1.8, 1.8, 4.5]} position={[0, 0.9, 0]} castShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </Box>
      {/* Tail Lights (Bloom target) */}
      <Box args={[1.6, 0.2, 0.1]} position={[0, 0.4, -2.25]}>
        <meshBasicMaterial color="#ef4444" />
      </Box>
    </group>
  );
};

// --------------------------------------------------------------------------
// AGV Drone
// --------------------------------------------------------------------------
const AGV3D = ({ waypoints, speed, isEmergencyMode }: { waypoints: [number, number, number][], speed: number, isEmergencyMode?: boolean }) => {
  const agvRef = useRef<THREE.Group>(null);
  const scannerRef = useRef<THREE.Mesh>(null);
  const [targetIndex, setTargetIndex] = useState(1);

  useFrame((state, delta) => {
    if (!agvRef.current) return;
    if (scannerRef.current) {
      const color = isEmergencyMode ? '#ef4444' : '#06b6d4';
      (scannerRef.current.material as THREE.MeshBasicMaterial).color.set(color);
      (scannerRef.current.material as THREE.MeshBasicMaterial).opacity = isEmergencyMode ? 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5 : 0.8;
    }

    if (isEmergencyMode) return;
    const currentPos = agvRef.current.position;
    const targetPos = new THREE.Vector3(...waypoints[targetIndex]);
    const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
    const distance = direction.length();

    if (distance < 0.1) {
      setTargetIndex((prev) => (prev + 1) % waypoints.length);
    } else {
      direction.normalize();
      currentPos.add(direction.multiplyScalar(speed * delta));
      agvRef.current.lookAt(targetPos);
    }
  });

  return (
    <group ref={agvRef} position={waypoints[0]}>
      <Box args={[0.8, 0.3, 1.2]} position={[0, 0.15, 0]} castShadow>
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </Box>
      <Box args={[0.6, 0.05, 0.8]} position={[0, 0.32, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Box>
      <mesh ref={scannerRef} position={[0, 0.2, 0.61]}>
        <planeGeometry args={[0.6, 0.1]} />
        <meshBasicMaterial transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// --------------------------------------------------------------------------
// Main Composition
// --------------------------------------------------------------------------
export const DigitalTwin = ({ machines, onSelectMachine, thermalMode, isEmergencyMode }: DigitalTwinProps) => {
  const [store] = useState(() => createXRStore());
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Expanded Machine Positions
  const f1_positions: [number, number, number][] = [];
  for (let x = -30; x <= 30; x += 15) {
    for (let z = -20; z <= 20; z += 10) {
      if (Math.abs(x) > 5) f1_positions.push([x, 0, z]); // Leave center aisle open
    }
  }

  return (
    <div className="digital-twin-container glass-panel">
      <div className="panel-header" style={{ position: 'absolute', zIndex: 10, margin: '16px' }}>
        <h3>Gigafactory Digital Twin 3D (2-Acre Scale)</h3>
        <span className="badge" style={{ background: thermalMode || isEmergencyMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)', color: thermalMode || isEmergencyMode ? '#ef4444' : 'white', transition: 'all 0.3s' }}>
          {isEmergencyMode ? 'EMERGENCY LOCKDOWN' : thermalMode ? 'Thermal Scan Active' : 'Live Operations'}
        </span>
      </div>
      
      <ARButton 
        store={store}
        className="glass-panel" 
        style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, padding: '8px 16px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Enter AR
      </ARButton>

      <Canvas shadows camera={{ position: [0, 150, 150], fov: 45 }}>
        {/* Post-Processing for High-End Cinematic Look */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        <XR store={store}>
          <color attach="background" args={[theme === 'light' ? '#f1f5f9' : '#020617']} />
          <fog attach="fog" args={[theme === 'light' ? '#f1f5f9' : '#020617', 200, 800]} />

          {/* Cinematic Lighting: Sun & Ambient */}
          <ambientLight intensity={isEmergencyMode ? 0.2 : theme === 'light' ? 1.0 : 0.6} />
          
          <directionalLight 
            position={[100, 150, 50]} 
            intensity={isEmergencyMode ? 2 : theme === 'light' ? 2 : 1.5}
            color={isEmergencyMode ? "#ef4444" : theme === 'light' ? "#ffffff" : "#60a5fa"}
            castShadow 
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
          />

          <OrbitControls 
            enablePan={true} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={40}
            maxDistance={500}
            target={[0, 0, 0]}
            autoRotate={!isEmergencyMode}
            autoRotateSpeed={0.3}
          />

          {/* Core Terrain and Campus Buildings */}
          <CampusEnvironment theme={theme} />

          {/* Unit 1: Manufacturing Assembly Interior */}
          <group position={[-50, 0, -50]}>
            <Grid infiniteGrid={false} args={[75, 75]} sectionColor="#3b82f6" cellColor="#0ea5e9" position={[0, 0.1, 0]} />
            
            {/* Dynamic Machines */}
            {f1_positions.map((pos, idx) => {
              const machineData = machines[idx % machines.length] || { id: idx, name: `CNC-${idx}`, status: 'Idle', temperature: 40, running_hours: 0 };
              return (
                <HighEndMachine 
                  key={idx}
                  machine={machineData}
                  position={pos}
                  onClick={() => onSelectMachine && onSelectMachine(machineData.id)}
                />
              );
            })}

            {/* Conveyor Systems & Arms */}
            {[-20, 0, 20].map((z, i) => (
               <group key={`conv-${z}`}>
                 <ConveyorLine position={[-10, 0, z]} length={40} />
                 <RoboticArm position={[-15, 0, z - 3]} speedOffset={i*0.5} isEmergencyMode={isEmergencyMode} />
                 <RoboticArm position={[-5, 0, z + 3]} speedOffset={i*0.5+1} isEmergencyMode={isEmergencyMode} />
               </group>
            ))}
          </group>

          {/* Unit 2: Warehouse & Logistics Interior */}
          <group position={[60, 0, -50]}>
            <Grid infiniteGrid={false} args={[65, 65]} sectionColor="#10b981" cellColor="#34d399" position={[0, 0.1, 0]} />
            <WarehouseRacks position={[-15, 0, -20]} />
            <WarehouseRacks position={[15, 0, -20]} />
            <WarehouseRacks position={[-15, 0, 0]} />
            <WarehouseRacks position={[15, 0, 0]} />
            <WarehouseRacks position={[-15, 0, 20]} />
            <WarehouseRacks position={[15, 0, 20]} />
          </group>

          {/* Massive AGV Swarm traveling between buildings */}
          <AGV3D waypoints={[[-50, 0, -10], [60, 0, -10], [60, 0, 20], [-50, 0, 20]]} speed={15} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[60, 0, -5], [-50, 0, -5], [-50, 0, 15], [60, 0, 15]]} speed={18} isEmergencyMode={isEmergencyMode} />
          
          {/* Expanded Logistics Trucks on Main Road */}
          <LogisticsTruck startPosition={[-120, 0, 4]} delay={0} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-60, 0, 4]} delay={5} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[0, 0, 4]} delay={10} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[60, 0, 4]} delay={15} isEmergencyMode={isEmergencyMode} />

        </XR>
      </Canvas>
    </div>
  );
};
