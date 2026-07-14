import { useRef, useState } from 'react';
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
// Architectural Trusses & Catwalks
// --------------------------------------------------------------------------
const Architecture = () => {
  return (
    <group>
      {/* Main Pillars */}
      {[-12, 12].map(x => 
        [-12, 12].map(z => (
          <group key={`${x}-${z}`}>
            <Cylinder args={[0.4, 0.4, 15]} position={[x, 7.5, z]} castShadow receiveShadow>
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.5} />
            </Cylinder>
            <Box args={[1, 1, 1]} position={[x, 15, z]}>
               <meshBasicMaterial color="#3b82f6" /> {/* Glowing node */}
            </Box>
          </group>
        ))
      )}

      {/* Glass Catwalk Level 2 */}
      <group position={[0, 5, 0]}>
        <Box args={[24, 0.2, 24]} receiveShadow>
          <meshPhysicalMaterial color="#0f172a" transparent opacity={0.3} transmission={0.95} thickness={1} roughness={0.1} />
        </Box>
        {/* Support Beams for Catwalk */}
        <Box args={[24, 0.4, 0.4]} position={[0, -0.3, -12]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[24, 0.4, 0.4]} position={[0, -0.3, 12]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[0.4, 0.4, 24]} position={[-12, -0.3, 0]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[0.4, 0.4, 24]} position={[12, -0.3, 0]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
      </group>

      {/* Central Quantum Server Core */}
      <group position={[0, 7.5, 0]}>
        <Cylinder args={[2, 2, 15]} castShadow receiveShadow>
          <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.2} />
        </Cylinder>
        {/* Pulsing Data Rings */}
        <Cylinder args={[2.2, 2.2, 0.2]} position={[0, -5, 0]}><meshBasicMaterial color="#3b82f6" /></Cylinder>
        <Cylinder args={[2.2, 2.2, 0.2]} position={[0, 0, 0]}><meshBasicMaterial color="#10b981" /></Cylinder>
        <Cylinder args={[2.2, 2.2, 0.2]} position={[0, 5, 0]}><meshBasicMaterial color="#3b82f6" /></Cylinder>
      </group>

      {/* Exterior Environment: Loading Dock & Road */}
      <group position={[0, 0, 20]}>
        {/* Factory Exterior Wall with Bay Doors */}
        <Box args={[24, 15, 0.5]} position={[0, 7.5, -8]} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </Box>
        {/* Bay Door 1 */}
        <Box args={[4, 5, 0.6]} position={[-5, 2.5, -8]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.7} />
        </Box>
        {/* Bay Door 2 */}
        <Box args={[4, 5, 0.6]} position={[5, 2.5, -8]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.7} />
        </Box>

        {/* Loading Dock Platform */}
        <Box args={[24, 0.5, 4]} position={[0, 0.25, -6]} receiveShadow>
          <meshStandardMaterial color="#1e293b" />
        </Box>

        {/* Asphalt Road */}
        <Box args={[40, 0.1, 12]} position={[0, 0, 2]} receiveShadow>
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </Box>
        
        {/* Glowing Road Markings */}
        <Box args={[40, 0.15, 0.2]} position={[0, 0, 2]}>
          <meshBasicMaterial color="#eab308" />
        </Box>
      </group>
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

  // Layout: Floor 1 CNC Machines
  const f1_positions: [number, number, number][] = [
    [-6, 0, -8], [-2, 0, -8], [2, 0, -8], [6, 0, -8],
    [-6, 0, 8],  [-2, 0, 8],  [2, 0, 8],  [6, 0, 8]
  ];

  return (
    <div className="digital-twin-container glass-panel">
      <div className="panel-header" style={{ position: 'absolute', zIndex: 10, margin: '16px' }}>
        <h3>Gigafactory Digital Twin 3D</h3>
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

      <Canvas shadows camera={{ position: [30, 25, 30], fov: 45 }}>
        {/* Post-Processing for High-End Cinematic Look */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        <XR store={store}>
          <color attach="background" args={['#020617']} /> {/* Ultra dark slate */}
          <fog attach="fog" args={['#020617', 20, 100]} />

          {/* Cinematic Lighting */}
          <ambientLight intensity={isEmergencyMode ? 0.1 : 0.3} />
          
          {/* Main God Ray / Spotlight */}
          <spotLight 
            position={[0, 40, 0]} 
            angle={0.6} 
            penumbra={0.5} 
            intensity={isEmergencyMode ? 5 : 2} 
            color={isEmergencyMode ? "#ef4444" : "#ffffff"} 
            castShadow 
            shadow-bias={-0.0001}
          />

          <pointLight position={[-15, 10, -15]} intensity={1} color={isEmergencyMode ? "#ef4444" : "#3b82f6"} />
          <pointLight position={[15, 10, 15]} intensity={1} color={isEmergencyMode ? "#ef4444" : "#10b981"} />

          <OrbitControls 
            enablePan={true} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={10}
            maxDistance={80}
            target={[0, 5, 0]}
            autoRotate={!isEmergencyMode}
            autoRotateSpeed={0.5}
          />

          {/* Glowing Ground Grid */}
          <Grid 
            infiniteGrid 
            fadeDistance={80} 
            sectionColor={isEmergencyMode ? "#7f1d1d" : "#0f172a"} 
            cellColor={isEmergencyMode ? "#450a0a" : "#020617"} 
            sectionSize={10} 
            cellSize={2}
            position={[0, -0.05, 0]}
          />

          <Architecture />

          {/* Ground Floor Conveyor System */}
          <ConveyorLine position={[-8, 0, 0]} length={20} />
          <ConveyorLine position={[8, 0, 0]} length={20} />

          {/* Robotic Arms next to conveyors */}
          <RoboticArm position={[-6, 0, -3]} speedOffset={0} isEmergencyMode={isEmergencyMode} />
          <RoboticArm position={[-6, 0, 3]} speedOffset={1} isEmergencyMode={isEmergencyMode} />
          <RoboticArm position={[6, 0, -3]} speedOffset={2} isEmergencyMode={isEmergencyMode} />
          <RoboticArm position={[6, 0, 3]} speedOffset={3} isEmergencyMode={isEmergencyMode} />

          {/* Dynamic Machines */}
          {f1_positions.map((pos, idx) => {
            // Distribute the state data across the visual array
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

          {/* AGV Swarm */}
          <AGV3D waypoints={[[-10, 0, -10], [10, 0, -10], [10, 0, -5], [-10, 0, -5]]} speed={2} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[10, 0, 10], [-10, 0, 10], [-10, 0, 5], [10, 0, 5]]} speed={2.5} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[0, 5.2, 10], [-10, 5.2, 10], [-10, 5.2, -10], [0, 5.2, -10]]} speed={3} isEmergencyMode={isEmergencyMode} />

        </XR>
      </Canvas>
    </div>
  );
};
