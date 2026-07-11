import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box } from '@react-three/drei';
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
}

// Reusable 3D Machine component
const Machine3D = ({ machine, position }: { machine: Machine, position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate the machine slightly (bobbing up and down)
  useFrame((state) => {
    if (meshRef.current && machine.status === 'Running') {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  // Determine color and glow based on status
  let color = '#3b82f6'; // Idle (Blue)
  let emissiveIntensity = 0.5;

  if (machine.status === 'Running') {
    color = '#10b981'; // Green
    emissiveIntensity = 0.8;
  } else if (machine.status === 'Maintenance' || machine.temperature > 85) {
    color = '#ef4444'; // Red (Warning/Maintenance)
    emissiveIntensity = 1.2;
  }

  return (
    <group position={position}>
      {/* The main body of the machine */}
      <Box args={[1.5, 2, 1.5]} ref={meshRef} position={[0, 1, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </Box>
      {/* Label/Indicator floating above */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

export const DigitalTwin = ({ machines }: DigitalTwinProps) => {
  // Map machines to fixed positions on the grid
  const positions: [number, number, number][] = [
    [-3, 0, -3],
    [3, 0, -3],
    [-3, 0, 3],
    [3, 0, 3],
    [0, 0, 0]
  ];

  return (
    <div className="digital-twin-container glass-panel">
      <div className="panel-header" style={{ position: 'absolute', zIndex: 10, margin: '16px' }}>
        <h3>3D Factory Floor</h3>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Live Digital Twin</span>
      </div>
      
      <Canvas shadows camera={{ position: [8, 6, 8], fov: 45 }}>
        <color attach="background" args={['#0a0a0f']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#3b82f6" />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={5}
          maxDistance={20}
        />

        {/* Floor Grid */}
        <Grid 
          infiniteGrid 
          fadeDistance={30} 
          sectionColor="#3b82f6" 
          cellColor="#1e293b" 
          sectionSize={2} 
          cellSize={0.5}
        />

        {/* Render Machines */}
        {machines.slice(0, 5).map((machine, index) => (
          <Machine3D 
            key={machine.id} 
            machine={machine} 
            position={positions[index % positions.length]} 
          />
        ))}
      </Canvas>
    </div>
  );
};
