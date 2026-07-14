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
// Architectural Trusses & Catwalks (Massive Scale)
// --------------------------------------------------------------------------
const Architecture = () => {
  // Generate a massive grid of structural pillars (-40 to +40)
  const pillars = [];
  for (let x = -40; x <= 40; x += 20) {
    for (let z = -40; z <= 40; z += 20) {
      pillars.push([x, z]);
    }
  }

  return (
    <group>
      {/* Massive Pillar Grid */}
      {pillars.map(([x, z]) => (
        <group key={`${x}-${z}`}>
          <Cylinder args={[0.6, 0.6, 20]} position={[x, 10, z]} castShadow receiveShadow>
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.5} />
          </Cylinder>
          {/* High-bay Lighting Node */}
          <Box args={[1.5, 0.5, 1.5]} position={[x, 20, z]}>
             <meshBasicMaterial color="#3b82f6" opacity={0.8} transparent />
          </Box>
          <pointLight position={[x, 19, z]} intensity={0.5} distance={30} color="#e0f2fe" />
        </group>
      ))}

      {/* Epic Glass Mezzanine Control Room */}
      <group position={[0, 10, 0]}>
        <Box args={[40, 0.5, 30]} receiveShadow>
          <meshPhysicalMaterial color="#0f172a" transparent opacity={0.4} transmission={0.95} thickness={1} roughness={0.1} />
        </Box>
        {/* Support Beams for Mezzanine */}
        <Box args={[40, 0.8, 0.8]} position={[0, -0.6, -15]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[40, 0.8, 0.8]} position={[0, -0.6, 15]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[0.8, 0.8, 30]} position={[-20, -0.6, 0]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        <Box args={[0.8, 0.8, 30]} position={[20, -0.6, 0]}><meshStandardMaterial color="#334155" metalness={0.8}/></Box>
        
        {/* Central Quantum Server Core on Mezzanine */}
        <group position={[0, 5, 0]}>
          <Cylinder args={[3, 3, 10]} castShadow receiveShadow>
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.2} />
          </Cylinder>
          {/* Pulsing Data Rings */}
          <Cylinder args={[3.2, 3.2, 0.3]} position={[0, -3, 0]}><meshBasicMaterial color="#3b82f6" /></Cylinder>
          <Cylinder args={[3.2, 3.2, 0.3]} position={[0, 0, 0]}><meshBasicMaterial color="#10b981" /></Cylinder>
          <Cylinder args={[3.2, 3.2, 0.3]} position={[0, 3, 0]}><meshBasicMaterial color="#3b82f6" /></Cylinder>
        </group>
      </group>

      {/* Exterior Environment: Massive Loading Dock & Road */}
      <group position={[0, 0, 50]}>
        {/* Factory Exterior Wall */}
        <Box args={[80, 20, 1]} position={[0, 10, -8]} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </Box>
        {/* Multiple Bay Doors */}
        {[-30, -15, 0, 15, 30].map((x) => (
          <Box key={`bay-${x}`} args={[6, 8, 1.2]} position={[x, 4, -8]}>
            <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.7} />
          </Box>
        ))}

        {/* Loading Dock Platform */}
        <Box args={[80, 1, 6]} position={[0, 0.5, -5]} receiveShadow>
          <meshStandardMaterial color="#1e293b" />
        </Box>

        {/* Asphalt Road */}
        <Box args={[100, 0.1, 20]} position={[0, 0, 8]} receiveShadow>
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </Box>
        
        {/* Glowing Road Markings */}
        <Box args={[100, 0.15, 0.4]} position={[0, 0, 8]}>
          <meshBasicMaterial color="#eab308" />
        </Box>
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
    
    // Simple looping animation along the Z-axis road
    // Move from Z = 25 to Z = -2, wait, then leave
    const cycle = t % 20;
    if (cycle < 8) {
      // Arriving
      truckRef.current.position.z = 60 - (cycle * 6.25);
    } else if (cycle < 13) {
      // Loading at dock
      truckRef.current.position.z = 10;
    } else {
      // Departing
      truckRef.current.position.z = 10 + ((cycle - 13) * 7);
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

      <Canvas shadows camera={{ position: [80, 50, 80], fov: 45 }}>
        {/* Post-Processing for High-End Cinematic Look */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        <XR store={store}>
          <color attach="background" args={['#020617']} /> {/* Ultra dark slate */}
          <fog attach="fog" args={['#020617', 50, 200]} /> {/* Increased fog distance */}

          {/* Cinematic Lighting */}
          <ambientLight intensity={isEmergencyMode ? 0.1 : 0.3} />
          
          {/* Main God Ray / Spotlight */}
          <spotLight 
            position={[0, 80, 0]} 
            angle={0.8} 
            penumbra={0.5} 
            intensity={isEmergencyMode ? 8 : 4} 
            color={isEmergencyMode ? "#ef4444" : "#ffffff"} 
            castShadow 
            shadow-bias={-0.0001}
          />

          <OrbitControls 
            enablePan={true} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={10}
            maxDistance={150}
            target={[0, 10, 0]}
            autoRotate={!isEmergencyMode}
            autoRotateSpeed={0.3}
          />

          {/* Massive Ground Grid */}
          <Grid 
            infiniteGrid 
            fadeDistance={200} 
            sectionColor={isEmergencyMode ? "#7f1d1d" : "#0f172a"} 
            cellColor={isEmergencyMode ? "#450a0a" : "#020617"} 
            sectionSize={20} 
            cellSize={4}
            position={[0, -0.05, 0]}
          />

          <Architecture />

          {/* Massive Warehouse Racks Zone */}
          <WarehouseRacks position={[-30, 0, -35]} />
          <WarehouseRacks position={[0, 0, -35]} />
          <WarehouseRacks position={[30, 0, -35]} />

          {/* Expanded Conveyor Systems */}
          {[-20, 0, 20].map(z => (
             <ConveyorLine key={`conv-${z}`} position={[-15, 0, z]} length={40} />
          ))}

          {/* Dense Robotic Arm Swarm */}
          {[-20, 0, 20].map((z, i) => (
             <group key={`arms-${z}`}>
               <RoboticArm position={[-18, 0, z - 3]} speedOffset={i*0.5} isEmergencyMode={isEmergencyMode} />
               <RoboticArm position={[-12, 0, z + 3]} speedOffset={i*0.5+1} isEmergencyMode={isEmergencyMode} />
               <RoboticArm position={[12, 0, z - 3]} speedOffset={i*0.5+2} isEmergencyMode={isEmergencyMode} />
               <RoboticArm position={[18, 0, z + 3]} speedOffset={i*0.5+3} isEmergencyMode={isEmergencyMode} />
             </group>
          ))}

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

          {/* Massive AGV Swarm */}
          <AGV3D waypoints={[[-35, 0, -25], [35, 0, -25], [35, 0, -15], [-35, 0, -15]]} speed={4} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[35, 0, 25], [-35, 0, 25], [-35, 0, 15], [35, 0, 15]]} speed={5} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[-5, 10.2, 25], [-25, 10.2, 25], [-25, 10.2, -25], [-5, 10.2, -25]]} speed={6} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[5, 10.2, -25], [25, 10.2, -25], [25, 10.2, 25], [5, 10.2, 25]]} speed={6} isEmergencyMode={isEmergencyMode} />

          {/* Expanded Logistics Trucks */}
          <LogisticsTruck startPosition={[-30, 0.1, 58]} delay={0} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-15, 0.1, 58]} delay={5} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[0, 0.1, 58]} delay={10} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[15, 0.1, 58]} delay={15} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[30, 0.1, 58]} delay={20} isEmergencyMode={isEmergencyMode} />

        </XR>
      </Canvas>
    </div>
  );
};
