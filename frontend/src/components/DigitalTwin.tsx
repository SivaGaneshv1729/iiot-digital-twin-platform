import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder } from '@react-three/drei';
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
}

// Complex Animated CNC Machine Component
const Machine3D = ({ machine, position, thermalMode, onClick }: { machine: Machine, position: [number, number, number], thermalMode?: boolean, onClick?: () => void }) => {
  const gantryRef = useRef<THREE.Group>(null);
  const spindleRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const thermalRef = useRef<THREE.Mesh>(null);

  // Kinematics: Animate the machine parts based on status
  useFrame((state) => {
    if (machine.status === 'Running') {
      // 1. Sliding Gantry Arm (Moves back and forth on X axis)
      if (gantryRef.current) {
        gantryRef.current.position.x = Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.4;
      }
      // 2. Spinning Spindle/Drill (Rotates rapidly on Y axis)
      if (spindleRef.current) {
        spindleRef.current.rotation.y += 0.5;
      }
      // 3. Pulsing Indicator Light
      if (indicatorRef.current) {
        (indicatorRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(state.clock.elapsedTime * 8) * 0.5;
      }
    } else {
      // If stopped, ensure the indicator is solid
      if (indicatorRef.current) {
        (indicatorRef.current.material as THREE.MeshBasicMaterial).opacity = 1;
      }
    }

    if (thermalMode && thermalRef.current) {
      // Pulse the thermal aura slightly
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      thermalRef.current.scale.set(scale, scale, scale);
    }
  });

  // Determine color and glow based on status
  let themeColor = '#3b82f6'; // Idle (Blue)
  let emissiveIntensity = 0.5;

  if (machine.status === 'Running') {
    themeColor = '#10b981'; // Green
    emissiveIntensity = 0.8;
  } else if (machine.status === 'Maintenance' || machine.temperature > 85) {
    themeColor = '#ef4444'; // Red (Warning/Maintenance)
    emissiveIntensity = 1.2;
  }

  // Thermal Aura Color
  let thermalColor = '#06b6d4'; // Cyan (Cool)
  if (machine.temperature > 65) thermalColor = '#f59e0b'; // Yellow (Warm)
  if (machine.temperature > 85) thermalColor = '#ef4444'; // Red (Hot)

  return (
    <group 
      position={position} 
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* 1. Base Chassis (Heavy Metal) */}
      <Box args={[2, 0.4, 1.5]} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </Box>

      {/* 2. Protective Glass Housing */}
      <Box args={[1.8, 1.2, 1.3]} position={[0, 1, 0]}>
        <meshPhysicalMaterial 
          color="#94a3b8" 
          transparent={true} 
          opacity={0.15} 
          roughness={0.1} 
          transmission={0.9} 
          thickness={0.1}
        />
      </Box>

      {/* 3. Animated Kinematic Gantry System inside the housing */}
      <group ref={gantryRef} position={[0, 1.2, 0]}>
        {/* Horizontal Rail */}
        <Box args={[1.6, 0.1, 0.2]} position={[0, 0, -0.2]} castShadow>
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </Box>
        {/* Vertical Spindle Mount */}
        <Box args={[0.2, 0.6, 0.3]} position={[0, -0.2, 0]} castShadow>
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </Box>
        {/* Spinning Drill / Toolhead */}
        <Cylinder args={[0.05, 0.01, 0.4]} position={[0, -0.6, 0]} ref={spindleRef} castShadow>
          <meshStandardMaterial color="#f8fafc" metalness={1} roughness={0.1} />
        </Cylinder>
      </group>

      {/* 4. Processing Bed (Where the part sits) */}
      <Box args={[1.2, 0.1, 0.8]} position={[0, 0.45, 0]} receiveShadow>
        <meshStandardMaterial color="#0f172a" />
      </Box>

      {/* 5. Emissive Status Indicator Light (Top corner) */}
      <mesh position={[0.8, 1.7, 0.5]} ref={indicatorRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={themeColor} transparent={true} />
      </mesh>
      
      {/* Soft Glow around the indicator */}
      <mesh position={[0.8, 1.7, 0.5]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={themeColor} transparent={true} opacity={0.3} />
      </mesh>

      {/* 6. Side Control Panel screen */}
      <Box args={[0.1, 0.6, 0.4]} position={[1.05, 0.8, 0.2]}>
        <meshStandardMaterial color="#0f172a" />
      </Box>
      <Box args={[0.02, 0.5, 0.3]} position={[1.1, 0.8, 0.2]}>
        <meshBasicMaterial color={themeColor} />
      </Box>

      {/* 7. Thermal Scan Aura (Only visible if thermalMode is true) */}
      {thermalMode && (
        <mesh ref={thermalRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.5, 32]} />
          <meshBasicMaterial color={thermalColor} transparent={true} opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const Floor = ({ level, height }: { level: number, height: number }) => {
  return (
    <group position={[0, height, 0]}>
      {/* Glass Floor */}
      <Box args={[14, 0.2, 14]} receiveShadow>
        <meshPhysicalMaterial 
          color="#1e293b" 
          transparent={true} 
          opacity={0.3} 
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </Box>
      <Grid 
        infiniteGrid={false}
        args={[14, 14]}
        position={[0, 0.11, 0]}
        sectionColor="#3b82f6" 
        cellColor="#1e293b" 
        sectionSize={2} 
        cellSize={0.5}
      />
      {/* Structural Pillars */}
      {level > 1 && (
        <>
          <Cylinder args={[0.2, 0.2, 5]} position={[-6.8, -2.5, -6.8]} material-color="#334155" />
          <Cylinder args={[0.2, 0.2, 5]} position={[6.8, -2.5, -6.8]} material-color="#334155" />
          <Cylinder args={[0.2, 0.2, 5]} position={[-6.8, -2.5, 6.8]} material-color="#334155" />
          <Cylinder args={[0.2, 0.2, 5]} position={[6.8, -2.5, 6.8]} material-color="#334155" />
        </>
      )}
    </group>
  );
};

export const DigitalTwin = ({ machines, onSelectMachine, thermalMode }: DigitalTwinProps) => {
  // Map machines to different floors (Y-axis = 0, 5, 10)
  const positions: [number, number, number][] = [
    [-3, 0.1, -3], // Floor 1
    [3, 0.1, 3],   // Floor 1
    [-3, 5.1, 2],  // Floor 2
    [3, 5.1, -2],  // Floor 2
    [0, 10.1, 0]   // Floor 3
  ];

  return (
    <div className="digital-twin-container glass-panel">
      <div className="panel-header" style={{ position: 'absolute', zIndex: 10, margin: '16px' }}>
        <h3>3-Story Factory Architecture</h3>
        <span className="badge" style={{ background: thermalMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)', color: thermalMode ? '#ef4444' : 'white', transition: 'all 0.3s' }}>
          {thermalMode ? 'Thermal Scan Active' : 'Multi-Floor 3D View'}
        </span>
      </div>
      
      <Canvas shadows camera={{ position: [20, 15, 20], fov: 45 }}>
        <color attach="background" args={['#0a0a0f']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[10, 15, -10]} intensity={0.5} color="#10b981" />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2}
          minDistance={10}
          maxDistance={50}
          target={[0, 5, 0]}
        />

        {/* Base Ground */}
        <Grid 
          infiniteGrid 
          fadeDistance={50} 
          sectionColor="#0f172a" 
          cellColor="#020617" 
          sectionSize={4} 
          cellSize={1}
          position={[0, -0.1, 0]}
        />

        {/* 3 Floors */}
        <Floor level={1} height={0} />
        <Floor level={2} height={5} />
        <Floor level={3} height={10} />

        {/* Central Elevator/Server Core */}
        <Box args={[3, 10, 3]} position={[0, 5, -5]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.2} />
        </Box>
        <Box args={[3, 5, 3]} position={[0, 2.5, -5]} castShadow receiveShadow>
          <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.2} />
        </Box>

        {/* Render Machines */}
        {machines.slice(0, 5).map((machine, index) => (
          <Machine3D 
            key={machine.id} 
            machine={machine} 
            position={positions[index % positions.length]} 
            thermalMode={thermalMode}
            onClick={() => onSelectMachine && onSelectMachine(machine.id)}
          />
        ))}
      </Canvas>
    </div>
  );
};
