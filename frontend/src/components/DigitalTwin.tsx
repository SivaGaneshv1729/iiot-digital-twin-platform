import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder, Text, FlyControls, Environment, Html, Instances, Instance } from '@react-three/drei';
import { XR, ARButton, createXRStore } from '@react-three/xr';
// import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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
// Campus Structures (High-Fidelity Buildings, Roads, Silos)
// --------------------------------------------------------------------------
const Building = ({ position, args, theme, isGlass = false, label = "" }: any) => {
  const [w, h, d] = args;
  return (
    <group position={position}>
      {/* Concrete Foundation Base */}
      <Box args={[w + 2, 2, d + 2]} position={[0, -h/2 + 1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={theme === 'light' ? "#cbd5e1" : "#1e293b"} roughness={0.9} />
      </Box>

      {/* Main Body */}
      {isGlass ? (
        <group>
          {/* Glass Shell - Using StandardMaterial instead of expensive PhysicalMaterial transmission */}
          <Box args={args} castShadow receiveShadow>
            <meshStandardMaterial color={theme === 'light' ? "#f8fafc" : "#0f172a"} transparent opacity={0.5} roughness={0.1} metalness={0.8} />
          </Box>
          {/* Internal Support Columns */}
          <Box args={[w - 1, h - 2, 1]} position={[0, 0, d/2 - 1]}>
             <meshStandardMaterial color="#334155" />
          </Box>
          <Box args={[w - 1, h - 2, 1]} position={[0, 0, -d/2 + 1]}>
             <meshStandardMaterial color="#334155" />
          </Box>
          {/* Segmented Window Grid (Wireframe over body) */}
          <Box args={[w + 0.1, h + 0.1, d + 0.1]}>
            <meshBasicMaterial color={theme === 'light' ? "#94a3b8" : "#334155"} wireframe />
          </Box>
        </group>
      ) : (
        <Box args={args} castShadow receiveShadow>
          <meshStandardMaterial color={theme === 'light' ? "#f1f5f9" : "#1e293b"} metalness={0.5} roughness={0.8} />
        </Box>
      )}

      {/* Roof Parapet */}
      <Box args={[w + 0.5, 1.5, d + 0.5]} position={[0, h/2 + 0.75, 0]} castShadow>
        <meshStandardMaterial color={theme === 'light' ? "#94a3b8" : "#0f172a"} roughness={0.8} />
      </Box>

      {/* Floating Hologram Label */}
      {label && (
        <Text 
          position={[0, h/2 + 10, 0]} 
          fontSize={8} 
          color={theme === 'light' ? "#2563eb" : "#38bdf8"} 
          anchorX="center" 
          anchorY="middle"
          outlineWidth={0.2}
          outlineColor={theme === 'light' ? "#ffffff" : "#000000"}
        >
          {label}
        </Text>
      )}
    </group>
  );
};

// --------------------------------------------------------------------------
// Campus Environment (Optimized)
// --------------------------------------------------------------------------
const CampusEnvironment = ({ theme, oee, throughput }: { theme: string, oee: number, throughput: number }) => {
  return (
    <group>
      {/* Massive Terrain Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={theme === 'light' ? "#e2e8f0" : "#020617"} roughness={0.8} />
      </mesh>
      
      {/* Grid Helper (Cyber map feel) */}
      <Grid infiniteGrid fadeDistance={200} cellColor={theme === 'light' ? "#94a3b8" : "#334155"} sectionColor={theme === 'light' ? "#64748b" : "#475569"} />

      {/* Buildings */}
      {/* Unit 1: Assembly (Glass Roof to see inside) */}
      <group position={[-50, 15, -50]}>
        <Building position={[0, 0, 0]} args={[80, 30, 80]} theme={theme} isGlass={true} label="UNIT 1: ASSEMBLY" />
        <Html position={[0, 35, 0]} center zIndexRange={[100, 0]}>
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.5)', padding: '10px 15px', borderRadius: '8px', color: 'white', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', gap: '5px', pointerEvents: 'none', minWidth: '150px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Metrics</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>OEE:</span>
              <span style={{ color: oee > 80 ? '#4ade80' : '#f59e0b' }}>{oee}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>Output:</span>
              <span style={{ color: '#38bdf8' }}>{throughput} UPH</span>
            </div>
          </div>
        </Html>
      </group>
      
      {/* Unit 2: Logistics (Opaque with glass accents) */}
      <group position={[60, 20, -50]}>
        <Building position={[0, 0, 0]} args={[70, 40, 70]} theme={theme} isGlass={true} label="UNIT 2: LOGISTICS" />
        <Html position={[0, 40, 0]} center zIndexRange={[100, 0]}>
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(245, 158, 11, 0.5)', padding: '10px 15px', borderRadius: '8px', color: 'white', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', gap: '5px', pointerEvents: 'none', minWidth: '150px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Inventory Status</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>Capacity:</span>
              <span style={{ color: '#f59e0b' }}>87%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>Active AGVs:</span>
              <span style={{ color: '#38bdf8' }}>24</span>
            </div>
          </div>
        </Html>
      </group>

      {/* R&D / Admin Tower */}
      <Building position={[0, 50, 60]} args={[40, 100, 40]} theme={theme} isGlass={true} label="R&D HQ" />
      <Building position={[0, 5, 80]} args={[60, 10, 20]} theme={theme} isGlass={false} />

      {/* Landscaping Trees (Optimized rendering manually or via instances) */}
      <Instances range={16}>
        <cylinderGeometry args={[0.5, 0.5, 4]} />
        <meshStandardMaterial color={theme === 'light' ? "#78350f" : "#451a03"} roughness={1} />
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`trunk-t-${i}`} position={[x, 2, -100]} />)}
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`trunk-m-${i}`} position={[x, 2, -20]} />)}
      </Instances>
      <Instances range={16}>
        <cylinderGeometry args={[0, 3, 8]} />
        <meshStandardMaterial color={theme === 'light' ? "#22c55e" : "#064e3b"} roughness={0.9} />
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`leaf1-t-${i}`} position={[x, 7, -100]} />)}
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`leaf1-m-${i}`} position={[x, 7, -20]} />)}
      </Instances>
      <Instances range={16}>
        <cylinderGeometry args={[0, 2.5, 6]} />
        <meshStandardMaterial color={theme === 'light' ? "#4ade80" : "#065f46"} roughness={0.9} />
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`leaf2-t-${i}`} position={[x, 10, -100]} />)}
        {[-80, -60, -40, -20, 20, 40, 60, 80].map((x, i) => <Instance key={`leaf2-m-${i}`} position={[x, 10, -20]} />)}
      </Instances>

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

      {/* Solar Panel Arrays (Unit 2 Roof) */}
      <OptimizedSolarGrid position={[40, 40, -70]} theme={theme} />
      <OptimizedSolarGrid position={[80, 40, -70]} theme={theme} />
      <OptimizedSolarGrid position={[60, 40, -30]} theme={theme} />
    </group>
  );
};

const SolarPanel = ({ position, rotation, theme }: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const time = useMemo(() => Math.random() * 100, []);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.position.y = Math.sin(state.clock.elapsedTime + time) * 0.1;
  });
  const yOffset = Math.sin(time * 2) * 0.1;
  const panelColor = Math.random() > 0.5 ? (theme === 'light' ? "#3b82f6" : "#0ea5e9") : (theme === 'light' ? "#8b5cf6" : "#6366f1");

  return (
    <group position={position} rotation={rotation} ref={groupRef}>
      <Box args={[1.8, 0.1, 1.2]} position={[0, yOffset + 0.5, 0]}>
        <meshStandardMaterial color={panelColor} metalness={0.8} roughness={0.2} />
      </Box>
      <Cylinder args={[0.05, 0.05, 0.5]} position={[0, yOffset + 0.25, 0]}>
        <meshStandardMaterial color="#64748b" />
      </Cylinder>
    </group>
  );
};

const OptimizedSolarGrid = ({ position, theme }: any) => {
  return (
    <group position={position}>
      {[-20, 0, 20].map((x) => 
        [-20, 0, 20].map((z) => (
          <SolarPanel key={`sp-${x}-${z}`} position={[x, 0, z]} rotation={[0.2, 0, 0]} theme={theme} />
        ))
      )}
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
// Cinematic Camera Controller
// --------------------------------------------------------------------------
const CameraController = ({ viewMode }: { viewMode: string }) => {
  const { controls } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 150, 180));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef(false);
  
  useEffect(() => {
    if (viewMode === 'Drone') return;
    isTransitioning.current = true;
    
    switch (viewMode) {
      case 'Unit1':
        targetPos.current.set(-50, 40, 10);
        targetLookAt.current.set(-50, 10, -50);
        break;
      case 'Unit2':
        targetPos.current.set(60, 60, 20);
        targetLookAt.current.set(60, 10, -50);
        break;
      case 'Tower':
        targetPos.current.set(-60, 20, 120);
        targetLookAt.current.set(0, 50, 60);
        break;
      case 'Global':
      default:
        targetPos.current.set(0, 150, 180);
        targetLookAt.current.set(0, 0, 0);
        break;
    }
  }, [viewMode]);

  useFrame((state, delta) => {
    if (viewMode === 'Drone' || !isTransitioning.current) return;

    // Smoothly interpolate camera position
    state.camera.position.lerp(targetPos.current, 3 * delta);
    
    // Smoothly interpolate orbit controls target
    if ((controls as any)?.target) {
      (controls as any).target.lerp(targetLookAt.current, 3 * delta);
    }

    // Stop lerping when close to target (use a very forgiving threshold so it doesn't get stuck)
    if (state.camera.position.distanceTo(targetPos.current) < 2.0) {
      isTransitioning.current = false;
    }
  });

  return null;
};

// --------------------------------------------------------------------------
// Live Factory Machinery (Unit 1 Interior)
// --------------------------------------------------------------------------
const CNCMachine = ({ position, machine, theme, onClick }: { position: [number, number, number], machine: any, theme: string, onClick?: () => void }) => {
  const spindleRef = useRef<THREE.Group>(null);
  const isRunning = machine?.status === 'Running';
  const isWarning = machine?.status === 'Maintenance' || machine?.status === 'Offline';
  
  const statusColor = isRunning ? '#10b981' : isWarning ? '#ef4444' : '#f59e0b';

  useFrame((state, delta) => {
    if (spindleRef.current && isRunning) {
      spindleRef.current.rotation.y += 15 * delta; // Spin fast when running
      spindleRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.5 + 12; // Move up and down
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      {/* Machine Base */}
      <Box args={[12, 6, 8]} position={[0, 3, 0]}>
        <meshStandardMaterial color={theme === 'light' ? "#cbd5e1" : "#1e293b"} metalness={0.7} roughness={0.3} />
      </Box>
      {/* Enclosure / Glass viewing area */}
      <Box args={[10, 8, 6]} position={[0, 10, 0]}>
        <meshStandardMaterial color={theme === 'light' ? "#94a3b8" : "#0f172a"} transparent opacity={0.4} />
      </Box>
      
      {/* Active Spindle / Drill */}
      <group position={[0, 12, 0]} ref={spindleRef}>
        <Cylinder args={[0.5, 0.1, 4]} position={[0, -2, 0]}>
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </Cylinder>
      </group>

      {/* Status Light Indicator */}
      <Cylinder args={[0.3, 0.3, 1]} position={[4, 14.5, 2]}>
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
      </Cylinder>

      {/* Floating UI */}
      <Html position={[0, 16, 0]} center zIndexRange={[100, 0]}>
        <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${statusColor}`, color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {machine?.id || 'CNC-XX'} <span style={{ color: statusColor }}>●</span>
        </div>
      </Html>
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
          {/* Crates - Shadows disabled for performance */}
          {[-12, -6, 0, 6, 12].map((x) => (
             <Box key={`crate-${x}`} args={[3, 2.5, 3]} position={[x, 1.35, 0]}>
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
// Main Composition
// --------------------------------------------------------------------------
export const DigitalTwin = ({ machines, onSelectMachine, thermalMode, isEmergencyMode }: DigitalTwinProps) => {
  const [store] = useState(() => createXRStore());
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [viewMode, setViewMode] = useState('Global');

  // Calculate live metrics from props
  const oee = useMemo(() => {
    if (!machines || machines.length === 0) return 92;
    const running = machines.filter(m => m.status === 'Running').length;
    return Math.round((running / machines.length) * 100);
  }, [machines]);

  const throughput = useMemo(() => {
    if (!machines || machines.length === 0) return 450;
    const running = machines.filter(m => m.status === 'Running').length;
    return running * 45;
  }, [machines]);

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
    <div className="digital-twin-wrapper" style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      
      {/* Cinematic View Control Panel */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '12px', background: 'var(--bg-glass)', padding: '8px 16px', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <button 
          onClick={() => setViewMode('Global')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Global' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Global' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Global Map</button>
        <button 
          onClick={() => setViewMode('Unit1')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Unit1' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Unit1' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Unit 1: Assembly</button>
        <button 
          onClick={() => setViewMode('Unit2')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Unit2' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Unit2' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Unit 2: Logistics</button>
        <button 
          onClick={() => setViewMode('Tower')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Tower' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Tower' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >R&D Tower</button>
        <button 
          onClick={() => setViewMode('Drone')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Drone' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Drone' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
        >🚁 Drone</button>
      </div>

      {viewMode === 'Drone' && (
        <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '12px 24px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#38bdf8' }}>DRONE EXPLORATION ACTIVE</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <li><strong>W A S D</strong> - Fly Forward/Left/Back/Right</li>
            <li><strong>R / F</strong> - Fly Up / Down</li>
            <li><strong>Click & Drag</strong> - Look Around</li>
          </ul>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10 }}>
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

      <Canvas shadows camera={{ position: [0, 150, 150], fov: 45, near: 0.1, far: 2000 }}>
        {/* Post-Processing disabled to massively improve framerates on lower-end machines */}
        {/* <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer> */}

        <CameraController viewMode={viewMode} />

        <XR store={store}>
          <color attach="background" args={[theme === 'light' ? '#f1f5f9' : '#020617']} />
          <fog attach="fog" args={[theme === 'light' ? '#f1f5f9' : '#020617', 200, 800]} />
          
          {/* HDR Environment Lighting */}
          <Environment preset={theme === 'light' ? "city" : "night"} background={false} />

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

          {viewMode === 'Drone' ? (
             <FlyControls movementSpeed={50} rollSpeed={0.5} dragToLook={true} />
          ) : (
            <OrbitControls 
              makeDefault
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minPolarAngle={0} 
              maxPolarAngle={Math.PI / 2 - 0.05}
              minDistance={10}
              maxDistance={500}
              autoRotate={!isEmergencyMode && viewMode === 'Global'}
              autoRotateSpeed={0.3}
            />
          )}

          {/* Core Terrain and Campus Buildings */}
          <CampusEnvironment theme={theme} oee={oee} throughput={throughput} />

          {/* Unit 1: Manufacturing Assembly Interior (Live Machines) */}
          <group position={[-50, 0, -50]}>
            <Grid infiniteGrid={false} args={[75, 75]} sectionColor="#3b82f6" cellColor="#0ea5e9" position={[0, 0.1, 0]} />
            
            {machines && machines.map((machine: any, index: number) => {
               // Render 2 columns, 3 rows of machines inside Unit 1
               const x = (index % 2) * 25 - 12.5;
               const z = Math.floor(index / 2) * 20 - 20;
               return (
                  <CNCMachine 
                    key={machine.id || index} 
                    position={[x, 0, z]} 
                    machine={machine} 
                    theme={theme} 
                    onClick={() => onSelectMachine && onSelectMachine(machine.id)} 
                  />
               )
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
