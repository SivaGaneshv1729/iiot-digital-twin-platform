import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Grid, Box, Cylinder, Cone, Text, FlyControls, Environment, Html } from '@react-three/drei';
import { XR, ARButton, createXRStore } from '@react-three/xr';
// import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import './DigitalTwin.css';

// --------------------------------------------------------------------------
// Procedural Canvas Texture Generators
// --------------------------------------------------------------------------
function makeConcreteTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8a9099';
  ctx.fillRect(0, 0, size, size);
  // Noise overlay
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const g = Math.floor(Math.random() * 40 - 20);
    const c = 138 + g;
    ctx.fillStyle = `rgb(${c},${c+2},${c+4})`;
    ctx.fillRect(x, y, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }
  // Crack lines
  ctx.strokeStyle = 'rgba(50,55,65,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    for (let j = 0; j < 6; j++) {
      ctx.lineTo(Math.random() * size, Math.random() * size);
    }
    ctx.stroke();
  }
  // Expansion joints (grid)
  ctx.strokeStyle = 'rgba(60,65,75,0.5)';
  ctx.lineWidth = 2;
  for (let i = 128; i < size; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function makeBrushedMetalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, 0, size, size);
  // Horizontal brushed lines
  for (let y = 0; y < size; y += 2) {
    const brightness = 90 + Math.floor(Math.random() * 30);
    ctx.strokeStyle = `rgb(${brightness},${brightness},${brightness+5})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

function makeHazardStripeTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#1e293b';
  const stripe = 40;
  for (let i = -size; i < size * 2; i += stripe * 2) {
    ctx.save();
    ctx.translate(i, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(0, -size * 2, stripe, size * 4);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

function makeGratingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  for (let i = 16; i < size; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

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
  aiHeatmapMode?: boolean;
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
      <group scale={4}>
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
    </group>
  );
};


// --------------------------------------------------------------------------
// Campus Structures (High-Fidelity Buildings, Roads, Silos)
// --------------------------------------------------------------------------
const Building = ({ position, args, theme, isGlass = false, label = "", showLabels = false }: any) => {
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
      {showLabels && label && (
        <Text 
          position={[0, h/2 + 10, 0]} 
          fontSize={5} 
          color={theme === 'light' ? "#2563eb" : "#38bdf8"} 
          anchorX="center" 
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor={theme === 'light' ? "#ffffff" : "#000000"}
        >
          {label}
        </Text>
      )}
    </group>
  );
};

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Heavy Factory Block — Multi-Floor Industrial Building
// --------------------------------------------------------------------------
const FactoryBlock = ({ position, theme, label, args = [120, 60, 100], colorScheme = "blue", showLabels = false }: any) => {
  const [w, , d] = args;
  const isLight = theme === 'light';
  const mainColor = isLight ? "#e8ecef" : "#d0d7de";
  const concreteColor = isLight ? "#c8cfd8" : "#9ea8b3";
  const accentColor = colorScheme === "blue" ? "#1d4ed8" : "#047857";
  const glassColor = "#93c5fd";
  
  // Floor heights: 3 floors, each 20 units tall
  const floorH = 20;
  const floors = 3;
  const totalH = floorH * floors;
  
  return (
    <group position={position}>
      {/* === FOUNDATION === */}
      <Box args={[w + 12, 3, d + 12]} position={[0, 1.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#6b7280" roughness={0.95} />
      </Box>
      
      {/* === 3 STACKED FLOORS === */}
      {[0, 1, 2].map((fl) => {
        const floorY = fl * floorH + floorH / 2 + 3;
        return (
          <group key={fl}>
            {/* Main concrete walls (REMOVED to keep machinery visible) */}
            
            {/* Glass window panels on front face (REMOVED) */}

            {/* Window frame strips between panels (REMOVED) */}
            
            {/* Floor slab band — concrete line between floors */}
            <Box args={[w + 2, 1, d + 2]} position={[0, floorY + floorH/2, 0]}>
              <meshStandardMaterial color={concreteColor} roughness={0.9} />
            </Box>
            
            {/* Vertical columns at corners and mid-span */}
            {[-w/2 + 4, 0, w/2 - 4].map((cx, ci) => (
              <Box key={`col-${ci}`} args={[4, floorH, 4]} position={[cx, floorY, -d/2 + 4]} castShadow>
                <meshStandardMaterial color={concreteColor} roughness={0.85} />
              </Box>
            ))}
          </group>
        );
      })}
      
      {/* === ROOF / PENTHOUSE === */}
      <Box args={[w + 4, 3, d + 4]} position={[0, totalH + 4.5, 0]} castShadow>
        <meshStandardMaterial color={concreteColor} roughness={0.9} />
      </Box>
      {/* Roof parapet edge detail */}
      <Box args={[w + 5, 1.5, 1]} position={[0, totalH + 7, d/2 + 2]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      <Box args={[w + 5, 1.5, 1]} position={[0, totalH + 7, -d/2 - 2]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      <Box args={[1, 1.5, d + 5]} position={[-w/2 - 2, totalH + 7, 0]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      <Box args={[1, 1.5, d + 5]} position={[w/2 + 2, totalH + 7, 0]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      
      {/* === ACCENT STRIPE across building === */}
      <Box args={[w + 3, 3, d + 3]} position={[0, totalH * 0.33 + 3, 0]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      <Box args={[w + 3, 3, d + 3]} position={[0, totalH * 0.66 + 3, 0]}>
        <meshStandardMaterial color={accentColor} />
      </Box>
      
      {/* Label */}
      {showLabels && (
        <Html position={[0, totalH + 20, d/2]} center>
           <div style={{ color: '#0f172a', background: 'rgba(255,255,255,0.95)', padding: '4px 10px', fontSize: '0.9rem', border: `2px solid ${accentColor}`, borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>{label}</div>
        </Html>
      )}
    </group>
  );
};

// --------------------------------------------------------------------------
// Utility Bridge / Pipelines
// --------------------------------------------------------------------------
const UtilityBridge = ({ start, end, theme }: any) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  const position = [
    start[0] + dx / 2,
    start[1] + dy / 2,
    start[2] + dz / 2
  ] as [number, number, number];
  
  const angleY = Math.atan2(dx, dz);
  
  return (
    <group position={position} rotation={[0, angleY, 0]}>
      {/* Bridge structure */}
      <Box args={[4, 4, length]} position={[0, 0, 0]}>
        <meshStandardMaterial color={theme === 'light' ? "#94a3b8" : "#334155"} wireframe />
      </Box>
      {/* Thick Pipelines inside */}
      <Cylinder args={[0.8, 0.8, length]} position={[-1, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#3b82f6" metalness={0.8} />
      </Cylinder>
      <Cylinder args={[0.5, 0.5, length]} position={[1, -1, 0]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#ef4444" metalness={0.8} />
      </Cylinder>
    </group>
  );
};

// --------------------------------------------------------------------------
// Industrial Silo / Cooling Tower
// --------------------------------------------------------------------------
const IndustrialSilo = ({ position, theme }: any) => {
  return (
    <group position={position}>
      <Cylinder args={[15, 18, 60]} position={[0, 30, 0]} castShadow>
        <meshStandardMaterial color={theme === 'light' ? "#cbd5e1" : "#1e293b"} roughness={0.6} metalness={0.3} />
      </Cylinder>
      {/* Top cap */}
      <Cylinder args={[15.5, 15, 2]} position={[0, 61, 0]}>
        <meshStandardMaterial color="#0ea5e9" />
      </Cylinder>
      {/* Vapor / Steam light emitting from top */}
      <Cylinder args={[10, 15, 10]} position={[0, 66, 0]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </Cylinder>
    </group>
  );
};

// --------------------------------------------------------------------------
// Purpose-Built 3D Structures (visually communicate function)
// --------------------------------------------------------------------------

// Welding Station: sparking yellow booth with electrode arms
const WeldingBooth = ({ position }: { position: [number, number, number] }) => {
  const sparkRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (sparkRef.current) {
      const flicker = 0.8 + Math.abs(Math.sin(state.clock.elapsedTime * 20)) * 0.6;
      (sparkRef.current.material as THREE.MeshBasicMaterial).opacity = flicker;
    }
  });
  return (
    <group position={position}>
      {/* Booth frame (4 corner pillars + roof) */}
      {[[-5,-5],[5,-5],[-5,5],[5,5]].map(([x,z],i) => (
        <Box key={i} args={[1, 10, 1]} position={[x, 5, z]} castShadow>
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </Box>
      ))}
      <Box args={[12, 0.5, 12]} position={[0, 10, 0]}>
        <meshStandardMaterial color="#1e293b" />
      </Box>
      {/* Yellow safety curtain rods */}
      <Box args={[12, 0.3, 0.3]} position={[0, 8, -5]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
      <Box args={[12, 0.3, 0.3]} position={[0, 8, 5]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
      {/* Welding electrode arm */}
      <Box args={[0.5, 6, 0.5]} position={[0, 7, 0]} castShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.9} />
      </Box>
      {/* Welding tip - glowing yellow-white */}
      <Cylinder args={[0.5, 0.5, 1]} position={[0, 4, 0]}>
        <meshBasicMaterial color="#fde68a" />
      </Cylinder>
      {/* Arc flash - flickering */}
      <mesh ref={sparkRef} position={[0, 3.5, 0]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} />
      </mesh>
      {/* Sparks scattered */}
      {[[-1,1],[1,-1],[1.5,0.5],[-1.5,-0.5]].map(([sx,sz],i) => (
        <mesh key={i} position={[sx, 3 + Math.random(), sz]}>
          <sphereGeometry args={[0.2, 4, 4]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      ))}
    </group>
  );
};

// QC Inspection Frame: gantry-style frame with overhead scanner arm
const QCInspectionFrame = ({ position }: { position: [number, number, number] }) => {
  const scanRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (scanRef.current) {
      scanRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.8) * 6;
    }
  });
  return (
    <group position={position}>
      {/* Gantry pillars */}
      <Box args={[1, 18, 1]} position={[-10, 9, 0]} castShadow>
        <meshStandardMaterial color="#f8fafc" metalness={0.5} />
      </Box>
      <Box args={[1, 18, 1]} position={[10, 9, 0]} castShadow>
        <meshStandardMaterial color="#f8fafc" metalness={0.5} />
      </Box>
      {/* Cross beam */}
      <Box args={[20, 1.5, 2]} position={[0, 18, 0]}>
        <meshStandardMaterial color="#f8fafc" metalness={0.6} />
      </Box>
      {/* Scanning head - moves left/right */}
      <mesh ref={scanRef} position={[0, 16, 0]}>
        <boxGeometry args={[4, 2, 3]} />
        <meshStandardMaterial color="#1e40af" metalness={0.8} />
      </mesh>
      {/* Scan beam (green laser line) */}
      <Box args={[0.2, 14, 0.2]} position={[0, 8, 0]}>
        <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
      </Box>
      {/* Base platform with green outline */}
      <Box args={[22, 0.5, 16]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#065f46" />
      </Box>
    </group>
  );
};

// Loading Dock: raised concrete platform with access ramp
const LoadingDock = ({ position }: { position: [number, number, number] }) => {
  const gratingTex = useMemo(() => makeGratingTexture(), []);
  return (
    <group position={position}>
      {/* Raised concrete platform with metal grating top */}
      <Box args={[40, 5, 20]} position={[0, 2.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={gratingTex} color="#64748b" roughness={0.7} metalness={0.5} />
      </Box>
      {/* Dock ramp with grating */}
      <Box args={[10, 0.5, 12]} position={[15, 0.5, 0]} rotation={[0.35, 0, 0]}>
        <meshStandardMaterial map={gratingTex} color="#475569" roughness={0.7} metalness={0.5} />
      </Box>
      {/* Yellow dock edge stripe */}
      <Box args={[42, 0.3, 1]} position={[0, 5.2, -9]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
      {/* Dock bumpers */}
      {[-15, -5, 5, 15].map((x, i) => (
        <Box key={i} args={[3, 4, 2]} position={[x, 5, -8]} castShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </Box>
      ))}
    </group>
  );
};

// Paint Booth: enclosed yellow-edged box with exhaust fans on top
const PaintBooth = ({ position }: { position: [number, number, number] }) => {
  const fanRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (fanRef.current) fanRef.current.rotation.y += delta * 6;
  });
  return (
    <group position={position}>
      {/* Main enclosure */}
      <Box args={[18, 14, 12]} position={[0, 7, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.4} roughness={0.1} />
      </Box>
      {/* Frame wireframe */}
      <Box args={[18.2, 14.2, 12.2]} position={[0, 7, 0]}>
        <meshBasicMaterial color="#f59e0b" wireframe />
      </Box>
      {/* Exhaust fan housing */}
      <Cylinder args={[2, 2, 3]} position={[-4, 15, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
      <Cylinder args={[2, 2, 3]} position={[4, 15, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
      {/* Spinning fan blades */}
      <group ref={fanRef} position={[-4, 14, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} args={[3.5, 0.3, 0.5]} position={[0, 0, 0]} rotation={[0, (Math.PI / 2) * i, 0]}>
            <meshStandardMaterial color="#94a3b8" />
          </Box>
        ))}
      </group>
      {/* Purple paint mist glow */}
      <Box args={[16, 12, 10]} position={[0, 7, 0]}>
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.06} />
      </Box>
    </group>
  );
};

// Testing Rig: hydraulic press frame with piston arm
const TestingRig = ({ position }: { position: [number, number, number] }) => {
  const pistonRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (pistonRef.current) {
      pistonRef.current.position.y = 8 - Math.abs(Math.sin(state.clock.elapsedTime * 1.2)) * 6;
    }
  });
  return (
    <group position={position}>
      {/* Heavy base plate */}
      <Box args={[16, 2, 12]} position={[0, 1, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.9} />
      </Box>
      {/* Two vertical uprights */}
      <Box args={[2, 22, 2]} position={[-6, 12, 0]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </Box>
      <Box args={[2, 22, 2]} position={[6, 12, 0]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </Box>
      {/* Top crosshead */}
      <Box args={[14, 3, 6]} position={[0, 23, 0]}>
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </Box>
      {/* Hydraulic piston - moves up-down */}
      <mesh ref={pistonRef} position={[0, 8, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Red warning indicator on crosshead */}
      <Box args={[3, 0.5, 3]} position={[0, 25, 0]}>
        <meshBasicMaterial color="#ef4444" />
      </Box>
    </group>
  );
};

// --------------------------------------------------------------------------
const IndustrialFurnace = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <Cylinder args={[10, 12, 20]} position={[0, 10, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </Cylinder>
      <Cylinder args={[8, 8, 4]} position={[0, 5, 11]}>
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} />
      </Cylinder>
      <Box args={[14, 2, 14]} position={[0, 21, 0]}>
        <meshStandardMaterial color="#334155" />
      </Box>
      <Cylinder args={[3, 3, 15]} position={[0, 28, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Cylinder>
    </group>
  );
};

const ElectricSubstation = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <Box args={[15, 8, 10]} position={[0, 4, 0]} castShadow>
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </Box>
      {[-5, 0, 5].map((x) => (
        <group key={`insulator-${x}`} position={[x, 10, 0]}>
          <Cylinder args={[0.5, 1, 4]}><meshStandardMaterial color="#94a3b8" /></Cylinder>
          <Cylinder args={[1.5, 1.5, 0.2]} position={[0, 1, 0]}><meshStandardMaterial color="#e2e8f0" /></Cylinder>
          <Cylinder args={[1.5, 1.5, 0.2]} position={[0, 0, 0]}><meshStandardMaterial color="#e2e8f0" /></Cylinder>
          <Cylinder args={[1.5, 1.5, 0.2]} position={[0, -1, 0]}><meshStandardMaterial color="#e2e8f0" /></Cylinder>
        </group>
      ))}
      <Box args={[18, 0.5, 12]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
    </group>
  );
};

// --------------------------------------------------------------------------
// Ambient Density & Clutter Objects
// --------------------------------------------------------------------------
const ShippingContainer = ({ position, color = "#1e40af", rotation = [0, 0, 0] }: any) => {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[12, 5, 5]} position={[0, 2.5, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.7} />
      </Box>
      <Box args={[12.1, 4.8, 5.1]} position={[0, 2.5, 0]}>
        <meshBasicMaterial color="#0f172a" wireframe />
      </Box>
    </group>
  );
};

const PalletStack = ({ position }: any) => {
  return (
    <group position={position}>
      {/* Pallet 1 */}
      <Box args={[4, 0.5, 4]} position={[0, 0.25, 0]} castShadow>
        <meshStandardMaterial color="#b45309" roughness={0.9} />
      </Box>
      <Box args={[3.8, 3, 3.8]} position={[0, 2, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} /> {/* Cargo */}
      </Box>
    </group>
  );
};

const SafetyBarrier = ({ position, length = 20, rotation = [0,0,0] }: any) => {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[length, 1.5, 0.5]} position={[0, 0.75, 0]} castShadow>
        <meshStandardMaterial color="#facc15" />
      </Box>
      <Box args={[length + 0.1, 0.5, 0.6]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Box>
    </group>
  );
};

// Overhead Crane: gantry beam that traverses the factory ceiling
const OverheadCrane = ({ position, span = 130 }: { position: [number, number, number], span?: number }) => {
  const trolleyRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (trolleyRef.current) {
      trolleyRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.4) * (span / 2 - 10);
    }
  });
  return (
    <group position={position}>
      {/* Two end trucks on rails */}
      <Box args={[4, 4, 6]} position={[-span/2, 0, 0]} castShadow>
        <meshStandardMaterial color="#374151" metalness={0.9} />
      </Box>
      <Box args={[4, 4, 6]} position={[span/2, 0, 0]} castShadow>
        <meshStandardMaterial color="#374151" metalness={0.9} />
      </Box>
      {/* Main girder beam */}
      <Box args={[span, 3, 3]} position={[0, -2, 0]} castShadow>
        <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
      </Box>
      {/* Trolley + hoist that slides along */}
      <group ref={trolleyRef} position={[0, -2, 0]}>
        <Box args={[8, 5, 6]}>
          <meshStandardMaterial color="#1f2937" metalness={0.8} />
        </Box>
        {/* Hoist cable */}
        <Cylinder args={[0.3, 0.3, 18]} position={[0, -12, 0]}>
          <meshStandardMaterial color="#94a3b8" />
        </Cylinder>
        {/* Hook block */}
        <Box args={[4, 3, 4]} position={[0, -21, 0]}>
          <meshStandardMaterial color="#ef4444" metalness={0.8} />
        </Box>
      </group>
    </group>
  );
};

// Control Panel Rack: tall electrical cabinet array
const ControlPanelRack = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {[0, 5, 10, 15].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Cabinet body */}
          <Box args={[4, 12, 3]} position={[0, 6, 0]} castShadow>
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </Box>
          {/* Door panel */}
          <Box args={[3.5, 11, 0.3]} position={[0, 6, 1.7]}>
            <meshStandardMaterial color="#334155" metalness={0.5} />
          </Box>
          {/* Status indicator lights */}
          <Box args={[0.5, 0.5, 0.4]} position={[1.2, 10, 1.9]}>
            <meshBasicMaterial color="#22c55e" />
          </Box>
          <Box args={[0.5, 0.5, 0.4]} position={[1.2, 9, 1.9]}>
            <meshBasicMaterial color="#f59e0b" />
          </Box>
          {/* Display screen */}
          <Box args={[2.5, 3, 0.2]} position={[0, 7, 1.8]}>
            <meshBasicMaterial color="#0f172a" />
          </Box>
          <Box args={[2.2, 2.6, 0.15]} position={[0, 7, 1.85]}>
            <meshBasicMaterial color="#064e3b" />
          </Box>
        </group>
      ))}
      {/* Cable tray above */}
      <Box args={[22, 1, 3]} position={[7.5, 13.5, 0]}>
        <meshStandardMaterial color="#475569" metalness={0.7} />
      </Box>
    </group>
  );
};

// --------------------------------------------------------------------------
const WarehouseRacks = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <Box args={[30, 20, 4]} position={[0, 10, 0]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.8} wireframe />
      </Box>
      {[3, 8, 13, 18].map((y) => (
        <group key={`shelf-${y}`} position={[0, y, 0]}>
          <Box args={[30, 0.2, 4]}><meshStandardMaterial color="#1e293b" /></Box>
          {[-12, -6, 0, 6, 12].map((x) => (
             <Box key={`crate-${x}`} args={[3, 4, 3]} position={[x, 2, 0]}>
               <meshStandardMaterial color={Math.random() > 0.5 ? '#f59e0b' : '#3b82f6'} roughness={0.6} />
             </Box>
          ))}
        </group>
      ))}
    </group>
  );
};

const ConveyorLine = ({ position, length }: { position: [number, number, number], length: number }) => {
  return (
    <group position={position}>
      <Box args={[length, 2, 3]} position={[0, 1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} />
      </Box>
      <Box args={[length, 0.2, 2.5]} position={[0, 2.1, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </Box>
      <Box args={[length, 0.2, 0.2]} position={[0, 2.2, 1.3]}><meshBasicMaterial color="#f59e0b" /></Box>
      <Box args={[length, 0.2, 0.2]} position={[0, 2.2, -1.3]}><meshBasicMaterial color="#f59e0b" /></Box>
    </group>
  );
};

// --------------------------------------------------------------------------
// Massive Transformer
// --------------------------------------------------------------------------
const MassiveTransformer = ({ position }: { position: [number, number, number] }) => {
  const metalTex = useMemo(() => makeBrushedMetalTexture(), []);
  return (
    <group position={position}>
      <Box args={[30, 25, 20]} position={[0, 12.5, 0]} castShadow>
        <meshStandardMaterial map={metalTex} color="#475569" metalness={0.85} roughness={0.2} />
      </Box>
      {/* Cooling fins */}
      {[-12, -6, 0, 6, 12].map(x => (
        <Box key={`fin-${x}`} args={[2, 20, 22]} position={[x, 12.5, 0]}>
          <meshStandardMaterial color="#334155" metalness={0.5} />
        </Box>
      ))}
      {/* Top cylinders */}
      {[-10, 0, 10].map(x => (
        <Cylinder key={`top-${x}`} args={[2, 2, 8]} position={[x, 29, 0]}>
          <meshStandardMaterial color="#94a3b8" />
        </Cylinder>
      ))}
    </group>
  );
};

// --------------------------------------------------------------------------
// Communication Tower
// --------------------------------------------------------------------------
const CommunicationTower = ({ position }: { position: [number, number, number] }) => {
  const [t] = useState(() => Math.random() * 100);
  const lightRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (lightRef.current) {
      (lightRef.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(state.clock.elapsedTime * 4 + t) > 0 ? 1 : 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Tower base structure */}
      <Cylinder args={[5, 10, 100]} position={[0, 50, 0]} castShadow>
        <meshStandardMaterial color="#334155" wireframe />
      </Cylinder>
      <Cylinder args={[2, 5, 80]} position={[0, 140, 0]}>
        <meshStandardMaterial color="#475569" wireframe />
      </Cylinder>
      {/* Antennas */}
      <Cylinder args={[0.5, 0.5, 40]} position={[0, 200, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Cylinder>
      {/* Blinking Red Light */}
      <mesh ref={lightRef} position={[0, 222, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={1} />
      </mesh>
    </group>
  );
};

// --------------------------------------------------------------------------
// Environmental Infrastructure (Solar & Water)
// --------------------------------------------------------------------------
const SolarArray = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {[-30, -10, 10, 30].map((x) => (
         <group key={`solar-${x}`} position={[x, 5, 0]}>
           <Box args={[18, 0.5, 40]} rotation={[0.2, 0, 0]}>
             <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
           </Box>
           <Cylinder args={[0.5, 0.5, 5]} position={[0, -2.5, 0]}>
             <meshStandardMaterial color="#94a3b8" />
           </Cylinder>
         </group>
      ))}
    </group>
  );
};

const WaterTreatmentPlant = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Massive cylindrical clarifiers */}
      <Cylinder args={[30, 30, 10]} position={[-40, 5, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} />
      </Cylinder>
      <Cylinder args={[28, 28, 9]} position={[-40, 9.5, 0]}>
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} /> {/* Water */}
      </Cylinder>
      
      <Cylinder args={[30, 30, 10]} position={[40, 5, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} />
      </Cylinder>
      <Cylinder args={[28, 28, 9]} position={[40, 9.5, 0]}>
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} /> {/* Water */}
      </Cylinder>
      
      {/* Connecting pipes */}
      <Cylinder args={[2, 2, 80]} position={[0, 8, 0]} rotation={[0, 0, Math.PI/2]}>
        <meshStandardMaterial color="#94a3b8" />
      </Cylinder>
    </group>
  );
};

// --------------------------------------------------------------------------
// New Heavy Machinery
// --------------------------------------------------------------------------

// Hydraulic Press: massive frame with animated ram and textured base
const HydraulicPress = ({ position }: { position: [number, number, number] }) => {
  const ramRef = useRef<THREE.Mesh>(null);
  const metalTex = useMemo(() => makeBrushedMetalTexture(), []);
  useFrame((state) => {
    if (ramRef.current) {
      ramRef.current.position.y = 6 - Math.abs(Math.sin(state.clock.elapsedTime * 0.8)) * 8;
    }
  });
  return (
    <group position={position}>
      {/* Base bed plate */}
      <Box args={[20, 4, 18]} position={[0, 2, 0]} castShadow>
        <meshStandardMaterial map={metalTex} color="#374151" metalness={0.9} roughness={0.2} />
      </Box>
      {/* C-frame uprights */}
      <Box args={[3, 36, 8]} position={[-8, 20, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.85} />
      </Box>
      <Box args={[3, 36, 8]} position={[8, 20, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.85} />
      </Box>
      {/* Top crown */}
      <Box args={[22, 5, 10]} position={[0, 38, 0]} castShadow>
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </Box>
      {/* Hydraulic cylinder */}
      <Cylinder args={[3, 3, 18]} position={[0, 28, 0]} castShadow>
        <meshStandardMaterial color="#6b7280" metalness={0.95} roughness={0.05} />
      </Cylinder>
      {/* Animated ram/platen */}
      <mesh ref={ramRef} position={[0, 6, 0]}>
        <boxGeometry args={[16, 5, 14]} />
        <meshStandardMaterial map={metalTex} color="#d97706" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Red warning stripe on base */}
      <Box args={[21, 0.4, 19]} position={[0, 4.2, 0]}>
        <meshStandardMaterial map={useMemo(() => makeHazardStripeTexture(), [])} />
      </Box>
    </group>
  );
};

// Air Compressor: cylindrical tank + motor housing
const AirCompressor = ({ position }: { position: [number, number, number] }) => {
  const metalTex = useMemo(() => makeBrushedMetalTexture(), []);
  return (
    <group position={position}>
      {/* Pressure tank - horizontal */}
      <Cylinder args={[5, 5, 22]} rotation={[0, 0, Math.PI/2]} position={[0, 6, 0]} castShadow>
        <meshStandardMaterial map={metalTex} color="#dc2626" metalness={0.7} roughness={0.3} />
      </Cylinder>
      {/* End caps */}
      <Cylinder args={[5, 5, 1]} rotation={[0, 0, Math.PI/2]} position={[-11, 6, 0]}>
        <meshStandardMaterial color="#991b1b" metalness={0.8} />
      </Cylinder>
      <Cylinder args={[5, 5, 1]} rotation={[0, 0, Math.PI/2]} position={[11, 6, 0]}>
        <meshStandardMaterial color="#991b1b" metalness={0.8} />
      </Cylinder>
      {/* Motor housing */}
      <Box args={[8, 8, 8]} position={[0, 10, -8]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </Box>
      {/* Outlet pipe */}
      <Cylinder args={[0.8, 0.8, 10]} position={[6, 11, 0]} rotation={[0, 0, Math.PI/2]}>
        <meshStandardMaterial color="#94a3b8" metalness={0.9} />
      </Cylinder>
      {/* Support legs */}
      {[-8, 8].map((x, i) => (
        <Box key={i} args={[2, 5, 2]} position={[x, 2, 0]}>
          <meshStandardMaterial color="#334155" />
        </Box>
      ))}
    </group>
  );
};

// Overhead Pipe Rack: a network of large industrial pipes at height
const PipeRack = ({ position, length = 140 }: { position: [number, number, number], length?: number }) => {
  return (
    <group position={position}>
      {/* Support stanchions */}
      {[-length/2 + 20, 0, length/2 - 20].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <Box args={[2, 22, 2]} position={[0, 11, -5]}>
            <meshStandardMaterial color="#374151" metalness={0.8} />
          </Box>
          <Box args={[2, 22, 2]} position={[0, 11, 5]}>
            <meshStandardMaterial color="#374151" metalness={0.8} />
          </Box>
          {/* Cross-bracing */}
          <Box args={[1, 1, 12]} position={[0, 20, 0]}>
            <meshStandardMaterial color="#475569" />
          </Box>
          <Box args={[1, 1, 12]} position={[0, 10, 0]}>
            <meshStandardMaterial color="#475569" />
          </Box>
        </group>
      ))}
      {/* Three large pipes running along length */}
      <Cylinder args={[2, 2, length]} rotation={[0, 0, Math.PI/2]} position={[0, 20, -4]}>
        <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
      </Cylinder>
      <Cylinder args={[1.5, 1.5, length]} rotation={[0, 0, Math.PI/2]} position={[0, 20, 0]}>
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.15} />
      </Cylinder>
      <Cylinder args={[1.2, 1.2, length]} rotation={[0, 0, Math.PI/2]} position={[0, 20, 4]}>
        <meshStandardMaterial color="#ef4444" metalness={0.8} roughness={0.2} />
      </Cylinder>
    </group>
  );
};

// Drum Storage: rows of industrial chemical/fuel drums
const DrumStorage = ({ position }: { position: [number, number, number] }) => {
  const colors = ['#dc2626', '#2563eb', '#d97706', '#059669', '#7c3aed'];
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((row) => (
        [0, 1, 2, 3, 4].map((col) => (
          <Cylinder
            key={`drum-${row}-${col}`}
            args={[2, 2, 6]}
            position={[col * 5 - 10, 3, row * 5 - 8]}
            castShadow
          >
            <meshStandardMaterial color={colors[(row + col) % colors.length]} roughness={0.5} metalness={0.4} />
          </Cylinder>
        ))
      ))}
      {/* Drum tops (lighter cap) */}
      {[0, 1, 2, 3].map((row) => (
        [0, 1, 2, 3, 4].map((col) => (
          <Cylinder
            key={`cap-${row}-${col}`}
            args={[2, 2, 0.5]}
            position={[col * 5 - 10, 6.3, row * 5 - 8]}
          >
            <meshStandardMaterial color="#e2e8f0" metalness={0.6} />
          </Cylinder>
        ))
      ))}
      {/* Containment berm around drums */}
      <Box args={[30, 0.5, 26]} position={[2, 0.25, 2]}>
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </Box>
    </group>
  );
};

// Large Storage Tank with piping connections
const LargeStorageTank = ({ position, color = "#475569" }: { position: [number, number, number], color?: string }) => {
  return (
    <group position={position}>
      {/* Main vertical tank */}
      <Cylinder args={[12, 12, 35]} position={[0, 17.5, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
      {/* Conical roof */}
      <Cylinder args={[0, 12, 8]} position={[0, 39, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
      {/* Horizontal banding rings */}
      {[8, 16, 24, 32].map((y, i) => (
        <Cylinder key={i} args={[12.4, 12.4, 1.5]} position={[0, y, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </Cylinder>
      ))}
      {/* Access ladder */}
      <Box args={[0.5, 35, 0.5]} position={[12.5, 17.5, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      {[-5, 0, 5, 10, 15, 20, 25, 30].map((y, i) => (
        <Box key={`rung-${i}`} args={[3, 0.4, 0.4]} position={[13.5, y + 2, 0]}>
          <meshStandardMaterial color="#94a3b8" />
        </Box>
      ))}
      {/* Outlet pipes */}
      <Cylinder args={[1, 1, 20]} rotation={[0, 0, Math.PI/2]} position={[-22, 5, 0]}>
        <meshStandardMaterial color="#475569" metalness={0.9} />
      </Cylinder>
      {/* Support skirt */}
      <Cylinder args={[10, 13, 4]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#374151" metalness={0.8} />
      </Cylinder>
    </group>
  );
};

// Steel Roof Truss: exposed structural roof visible inside the factory
const RoofTruss = ({ position, span = 130 }: { position: [number, number, number], span?: number }) => {
  return (
    <group position={position}>
      {/* Top chord */}
      <Box args={[span, 1.5, 1.5]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#374151" metalness={0.85} />
      </Box>
      {/* Bottom chord */}
      <Box args={[span, 1.5, 1.5]} position={[0, -8, 0]}>
        <meshStandardMaterial color="#374151" metalness={0.85} />
      </Box>
      {/* Vertical members + diagonals */}
      {[-50, -25, 0, 25, 50].map((x, i) => (
        <group key={i}>
          <Box args={[1, 8, 1]} position={[x, -4, 0]}>
            <meshStandardMaterial color="#4b5563" metalness={0.8} />
          </Box>
          {i < 4 && (
            <Box args={[1, 10, 1]} position={[x + 12, -4, 0]} rotation={[0, 0, -0.5]}>
              <meshStandardMaterial color="#4b5563" metalness={0.8} />
            </Box>
          )}
        </group>
      ))}
    </group>
  );
};

// Perimeter Wall enclosing the massive campus
const PerimeterWall = ({ width, depth }: { width: number, depth: number }) => {
  const wallHeight = 15;
  const wallThickness = 4;
  return (
    <group>
      {/* North Wall */}
      <Box args={[width, wallHeight, wallThickness]} position={[0, wallHeight/2, -depth/2]} castShadow receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </Box>
      {/* South Wall */}
      <Box args={[width, wallHeight, wallThickness]} position={[0, wallHeight/2, depth/2]} castShadow receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </Box>
      {/* East Wall */}
      <Box args={[wallThickness, wallHeight, depth]} position={[width/2, wallHeight/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </Box>
      {/* West Wall */}
      <Box args={[wallThickness, wallHeight, depth]} position={[-width/2, wallHeight/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </Box>
      {/* Warning stripe on inside of wall */}
      <Box args={[width-1, 1, 0.5]} position={[0, 4, -depth/2 + wallThickness/2]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
    </group>
  );
};

// Security Gate / Checkpoint
const SecurityGate = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Guard house */}
      <Box args={[12, 10, 8]} position={[15, 5, 0]} castShadow>
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </Box>
      {/* Windows */}
      <Box args={[1, 4, 6]} position={[9, 6, 0]}>
        <meshStandardMaterial color="#38bdf8" metalness={0.5} roughness={0.1} />
      </Box>
      {/* Boom barriers */}
      <Cylinder args={[0.3, 0.3, 20]} rotation={[0, 0, Math.PI/2]} position={[0, 4, 0]}>
        <meshStandardMaterial color="#ef4444" />
      </Cylinder>
      {/* Canopy */}
      <Box args={[35, 2, 20]} position={[0, 15, 0]} castShadow>
        <meshStandardMaterial color="#0f172a" />
      </Box>
      <Cylinder args={[1, 1, 15]} position={[-15, 7.5, 0]}>
         <meshStandardMaterial color="#475569" />
      </Cylinder>
    </group>
  );
};

// Fuel Station for campus logistics vehicles
const FuelStation = ({ position }: { position: [number, number, number] }) => {
  const stripeTex = useMemo(() => makeHazardStripeTexture(), []);
  return (
    <group position={position}>
      {/* Base platform */}
      <Box args={[50, 1, 30]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#475569" />
      </Box>
      {/* Overhead Canopy */}
      <Box args={[60, 3, 40]} position={[0, 20, 0]} castShadow>
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </Box>
      {/* Canopy Pillars */}
      {[-20, 0, 20].map((x) => (
        <group key={x}>
          <Box args={[2, 20, 2]} position={[x, 10, -10]} castShadow><meshStandardMaterial color="#f8fafc" /></Box>
          <Box args={[2, 20, 2]} position={[x, 10, 10]} castShadow><meshStandardMaterial color="#f8fafc" /></Box>
          <Box args={[2, 4, 2.1]} position={[x, 2, -10]}><meshStandardMaterial map={stripeTex} /></Box>
          <Box args={[2, 4, 2.1]} position={[x, 2, 10]}><meshStandardMaterial map={stripeTex} /></Box>
        </group>
      ))}
      {/* Fuel Pumps */}
      {[-10, 10].map((x) => (
        <group key={x}>
          <Box args={[3, 6, 2]} position={[x, 3.5, 0]} castShadow><meshStandardMaterial color="#1e293b" /></Box>
          <Box args={[1.5, 2, 0.2]} position={[x, 5, 1.1]}><meshBasicMaterial color="#0ea5e9" /></Box>
        </group>
      ))}
      {/* Underground Tank Access */}
      <Cylinder args={[4, 4, 0.2]} position={[20, 1.1, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Cylinder>
    </group>
  );
};

// Road Network Segment
const RoadSegment = ({ position, args, rotation = [0, 0, 0] }: { position: [number, number, number], args: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      <Box args={args} position={[0, 0.2, 0]} receiveShadow>
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </Box>
      {/* Center line */}
      <Box args={[args[0], 0.3, args[2] < args[0] ? 2 : args[2]]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
    </group>
  );
};

// Power Flow Animated Line (Using Tube for 3D visibility and avoiding SVG line conflicts)
const PowerFlowLine = ({ start, end, active }: { start: [number, number, number], end: [number, number, number], active: boolean }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const curve = useMemo(() => {
    return new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end));
  }, [start, end]);

  useFrame((_, delta) => {
    if (active && materialRef.current && materialRef.current.map) {
      materialRef.current.map.offset.x -= 2 * delta;
    }
  });

  const dashTex = useMemo(() => makeHazardStripeTexture(), []);

  if (!active) return null;

  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.5, 8, false]} />
      <meshStandardMaterial 
        ref={materialRef}
        color="#38bdf8" 
        emissive="#0ea5e9"
        emissiveIntensity={1}
        map={dashTex}
        transparent 
        opacity={0.8}
      />
    </mesh>
  );
};

// --------------------------------------------------------------------------
// Detailing Components (Greenery, Emergency, Data Center)
// --------------------------------------------------------------------------
const PineTree = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
  <group position={position} scale={scale}>
    <Cylinder args={[0.5, 0.8, 4]} position={[0, 2, 0]} castShadow><meshStandardMaterial color="#5d4037" roughness={0.9} /></Cylinder>
    <Cone args={[3, 5]} position={[0, 6, 0]} castShadow><meshStandardMaterial color="#2e7d32" roughness={0.8} /></Cone>
    <Cone args={[2.5, 4]} position={[0, 8.5, 0]} castShadow><meshStandardMaterial color="#388e3c" roughness={0.8} /></Cone>
    <Cone args={[1.5, 3]} position={[0, 11, 0]} castShadow><meshStandardMaterial color="#4caf50" roughness={0.8} /></Cone>
  </group>
);

const ForestPatch = ({ position, count, radius }: { position: [number, number, number], count: number, radius: number }) => {
  const trees = useMemo(() => {
    const t = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      t.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, scale: 0.8 + Math.random() * 0.6 });
    }
    return t;
  }, [count, radius]);
  return (
    <group position={position}>
      {trees.map((t, i) => <PineTree key={i} position={[t.x, 0, t.z]} scale={t.scale} />)}
    </group>
  );
};

const FireStation = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[60, 25, 40]} position={[0, 12.5, 0]} castShadow receiveShadow><meshStandardMaterial color="#b91c1c" roughness={0.8} /></Box>
    {[-15, 0, 15].map(x => <Box key={x} args={[10, 15, 1]} position={[x, 7.5, 20]}><meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} /></Box>)}
    <Cylinder args={[10, 10, 1]} position={[0, 25.5, 0]}><meshStandardMaterial color="#1e293b" /></Cylinder>
    <Box args={[8, 1, 2]} position={[0, 25.6, 0]}><meshBasicMaterial color="#facc15" /></Box>
    <Box args={[2, 1, 8]} position={[0, 25.6, 0]}><meshBasicMaterial color="#facc15" /></Box>
  </group>
);

const FireTruck = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[12, 4, 4]} position={[0, 3, 0]} castShadow><meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} /></Box>
    <Box args={[4, 3, 3.8]} position={[4, 6.5, 0]}><meshStandardMaterial color="#ef4444" /></Box>
    <Box args={[3.8, 2, 3.9]} position={[4, 6.5, 0]}><meshStandardMaterial color="#0f172a" metalness={0.8} /></Box>
    <Cylinder args={[1.5, 1.5, 10]} rotation={[0, 0, Math.PI/2]} position={[-2, 6, 0]}><meshStandardMaterial color="#94a3b8" metalness={0.8} /></Cylinder>
    <Box args={[0.5, 0.5, 0.5]} position={[5, 8.2, 1]}><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></Box>
    <Box args={[0.5, 0.5, 0.5]} position={[5, 8.2, -1]}><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} /></Box>
    {[-4, 4].map(x => [-2, 2].map(z => <Cylinder key={`${x}-${z}`} args={[1.2, 1.2, 0.6]} rotation={[Math.PI/2, 0, 0]} position={[x, 1.2, z]}><meshStandardMaterial color="#1e293b" roughness={0.9} /></Cylinder>))}
  </group>
);

const DataCenter = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[140, 40, 100]} position={[0, 20, 0]} castShadow receiveShadow><meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} /></Box>
    {[-40, 0, 40].map(x => [-20, 20].map(z => (
      <group key={`${x}-${z}`} position={[x, 40.5, z]}>
        <Box args={[15, 4, 15]}><meshStandardMaterial color="#334155" /></Box>
        <Cylinder args={[6, 6, 4.1]}><meshStandardMaterial color="#1e293b" /></Cylinder>
      </group>
    )))}
    <Box args={[141, 1, 101]} position={[0, 38, 0]}><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.5} /></Box>
    <Box args={[141, 1, 101]} position={[0, 2, 0]}><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.5} /></Box>
  </group>
);

const EntryArchway = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[4, 30, 4]} position={[-25, 15, 0]} castShadow><meshStandardMaterial color="#475569" /></Box>
    <Box args={[4, 30, 4]} position={[25, 15, 0]} castShadow><meshStandardMaterial color="#475569" /></Box>
    <Box args={[54, 8, 4]} position={[0, 34, 0]} castShadow><meshStandardMaterial color="#1e293b" /></Box>
    <Box args={[45, 6, 4.2]} position={[0, 34, 0]}><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} /></Box>
  </group>
);

// --------------------------------------------------------------------------
// Campus Environment (Dense 4x Scale with Layers)
// --------------------------------------------------------------------------
const CampusEnvironment = ({ theme, showLabels, activeLayer }: { theme: string, showLabels: boolean, activeLayer: string }) => {
  const concreteTex = useMemo(() => makeConcreteTexture(), []);
  return (
    <group>
      {/* Massive Terrain Plane with procedural concrete texture - Dense 4x (2400x2400) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <planeGeometry args={[2400, 2400, 16, 16]} />
        <meshStandardMaterial map={concreteTex} color={theme === 'light' ? "#b0b8c4" : "#5a6270"} roughness={0.95} />
      </mesh>
      
      {/* Grid Helper - Expanded fadeDistance */}
      <Grid infiniteGrid fadeDistance={2000} cellColor={theme === 'light' ? "#cbd5e1" : "#334155"} sectionColor={theme === 'light' ? "#94a3b8" : "#475569"} />

      {/* Perimeter Compound Wall - Shrunk to encircle the dense core */}
      <PerimeterWall width={1400} depth={1400} />

      {/* Security Checkpoints at N/S/E/W */}
      <SecurityGate position={[0, 0, 700]} />
      <SecurityGate position={[0, 0, -700]} rotation={[0, Math.PI, 0]} />
      <SecurityGate position={[700, 0, 0]} rotation={[0, -Math.PI/2, 0]} />
      <SecurityGate position={[-700, 0, 0]} rotation={[0, Math.PI/2, 0]} />

      {/* Main Entry Archways at North and South Gates */}
      <EntryArchway position={[0, 0, 750]} />
      <EntryArchway position={[0, 0, -750]} rotation={[0, Math.PI, 0]} />

      {/* Lush Outer Greenery (Procedural Forests filling empty 2400x2400 terrain) */}
      <ForestPatch position={[-900, 0, -900]} count={150} radius={250} />
      <ForestPatch position={[900, 0, -900]} count={150} radius={250} />
      <ForestPatch position={[-900, 0, 900]} count={150} radius={250} />
      <ForestPatch position={[900, 0, 900]} count={150} radius={250} />
      <ForestPatch position={[0, 0, -1000]} count={80} radius={150} />
      <ForestPatch position={[0, 0, 1000]} count={80} radius={150} />
      <ForestPatch position={[-1000, 0, 0]} count={80} radius={150} />
      <ForestPatch position={[1000, 0, 0]} count={80} radius={150} />
      
      {/* Manicured inner parks */}
      <ForestPatch position={[-150, 0, 150]} count={12} radius={30} />
      <ForestPatch position={[150, 0, 150]} count={12} radius={30} />

      {/* Main Arterial Road Network (Condensed) */}
      <RoadSegment position={[0, 0, 0]} args={[20, 1, 1400]} />
      <RoadSegment position={[0, 0, 0]} args={[1400, 1, 20]} />
      
      {/* Inner ring road */}
      <RoadSegment position={[-300, 0, 0]} args={[20, 1, 800]} />
      <RoadSegment position={[300, 0, 0]} args={[20, 1, 800]} />
      <RoadSegment position={[0, 0, -400]} args={[600, 1, 20]} />
      <RoadSegment position={[0, 0, 400]} args={[600, 1, 20]} />

      {/* Ambient Density - Shipping Containers around Logistics Hub */}
      <ShippingContainer position={[-150, 0, 450]} color="#b91c1c" />
      <ShippingContainer position={[-150, 5, 450]} color="#1e40af" />
      <ShippingContainer position={[-135, 0, 450]} color="#047857" />
      <ShippingContainer position={[-150, 0, 435]} color="#1e40af" />
      
      <ShippingContainer position={[150, 0, 450]} color="#047857" />
      <ShippingContainer position={[150, 5, 450]} color="#b91c1c" />
      <ShippingContainer position={[135, 0, 450]} color="#b91c1c" />

      {/* Massive Automated Warehouse Complex */}
      <group position={[-250, 0, 400]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <WarehouseRacks key={`wh1-${i}`} position={[0, 0, i * 20 - 70]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <WarehouseRacks key={`wh2-${i}`} position={[50, 0, i * 20 - 70]} />
        ))}
      </group>
      
      <group position={[250, 0, 400]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <WarehouseRacks key={`wh3-${i}`} position={[0, 0, i * 20 - 70]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <WarehouseRacks key={`wh4-${i}`} position={[-50, 0, i * 20 - 70]} />
        ))}
      </group>

      {/* Inter-Block Transfer Conveyors */}
      {/* Block A to Block B */}
      <ConveyorLine position={[50, 0, -150]} length={150} />
      {/* Block E to Block A */}
      <ConveyorLine position={[-225, 0, -200]} length={150} rotation={[0, Math.PI / 2, 0]} />
      {/* Block G to Block F */}
      <ConveyorLine position={[0, 0, -250]} length={700} />

      {/* Dedicated Fuel Stations */}
      <FuelStation position={[-100, 0, 600]} />
      <FuelStation position={[100, 0, 600]} />

      {/* === BLOCK A: RAW MATERIAL PROCESSING & HEAVY MACHINING === */}
      <FactoryBlock position={[-150, 0, -100]} theme={theme} label="Block A: Raw Processing & Machining" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'blue'} args={[120, 60, 100]} showLabels={showLabels} />
      <SolarArray position={[-150, 65, -100]} />

      {/* === BLOCK B: PRECISION ASSEMBLY & ROBOTICS === */}
      <FactoryBlock position={[150, 0, -100]} theme={theme} label="Block B: Precision Assembly & Testing" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'orange'} args={[120, 50, 100]} showLabels={showLabels} />
      <SolarArray position={[150, 55, -100]} />

      {/* === BLOCK E: HEAVY CASTING & FORGING (NEW) === */}
      <FactoryBlock position={[-350, 0, -100]} theme={theme} label="Block E: Heavy Casting" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'blue'} args={[150, 70, 120]} showLabels={showLabels} />
      
      {/* === BLOCK F: AUTOMOTIVE BODY ASSEMBLY (NEW) === */}
      <FactoryBlock position={[350, 0, -100]} theme={theme} label="Block F: Auto Body Assembly" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'orange'} args={[180, 60, 130]} showLabels={showLabels} />
      
      {/* EMERGENCY SERVICES: Fire Station (East Wing) */}
      <FireStation position={[550, 0, -100]} rotation={[0, -Math.PI/2, 0]} />
      <FireTruck position={[520, 0, -120]} rotation={[0, Math.PI/2, 0]} />
      <FireTruck position={[520, 0, -80]} rotation={[0, Math.PI/2, 0]} />
      
      {/* === BLOCK G: CHEMICAL PROCESSING (NEW) === */}
      <FactoryBlock position={[-350, 0, -300]} theme={theme} label="Block G: Chemical Processing" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'orange'} args={[120, 40, 120]} showLabels={showLabels} />
      <DrumStorage position={[-380, 0, -230]} />
      <DrumStorage position={[-320, 0, -230]} />
      
      {/* === BLOCK H: ADVANCED MATERIALS (NEW) === */}
      <FactoryBlock position={[350, 0, -300]} theme={theme} label="Block H: Advanced Materials" colorScheme={activeLayer === 'manufacturing' ? 'orange' : 'blue'} args={[140, 50, 120]} showLabels={showLabels} />
      
      {/* === BLOCK C: HIGH-VOLTAGE POWER DISTRIBUTION & TESTING === */}
      <FactoryBlock position={[0, 0, -250]} theme={theme} label="Block C: Power Distribution & Testing" colorScheme="blue" args={[160, 70, 110]} showLabels={showLabels} />
      {/* Expanded Substation Grid (Northeast Corner) */}
      <ElectricSubstation position={[-100, 0, -400]} />
      <ElectricSubstation position={[-30, 0, -400]} />
      <ElectricSubstation position={[40, 0, -400]} />
      <ElectricSubstation position={[110, 0, -400]} />

      {/* MAIN EQUIPMENT DATA CENTER */}
      <DataCenter position={[-450, 0, -450]} />
      
      {/* Power Flow Lines */}
      <PowerFlowLine start={[0, 2, -400]} end={[-150, 2, -100]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[150, 2, -100]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[-350, 2, -100]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[350, 2, -100]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[-350, 2, -300]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[350, 2, -300]} active={activeLayer === 'power'} />
      <PowerFlowLine start={[0, 2, -400]} end={[0, 2, 400]} active={activeLayer === 'power'} />
      
      {/* Safety Barriers for High Voltage Zone */}
      <SafetyBarrier position={[0, 0, -350]} length={300} />
      <SafetyBarrier position={[-150, 0, -400]} length={150} rotation={[0, Math.PI/2, 0]} />
      <SafetyBarrier position={[150, 0, -400]} length={150} rotation={[0, Math.PI/2, 0]} />

      {/* Infrastructure Connectivity */}
      <UtilityBridge start={[-350, 30, -180]} end={[-150, 30, -180]} theme={theme} />
      <UtilityBridge start={[-150, 30, -180]} end={[150, 30, -180]} theme={theme} />
      <UtilityBridge start={[150, 30, -180]} end={[350, 30, -180]} theme={theme} />
      <UtilityBridge start={[0, 30, -250]} end={[0, 30, -180]} theme={theme} />

      {/* Heavy Industrial Silos */}
      <IndustrialSilo position={[-150, 0, -200]} theme={theme} />
      <IndustrialSilo position={[-110, 0, -200]} theme={theme} />
      <IndustrialSilo position={[150, 0, -200]} theme={theme} />
      
      {/* Water Treatment Plant (Environmental Goal) */}
      <WaterTreatmentPlant position={[250, 0, -200]} />

      {/* Massive Transformers near Substation */}
      <MassiveTransformer position={[-80, 0, -500]} />
      <MassiveTransformer position={[80, 0, -500]} />

      {/* Main Comm Tower - moved further back */}
      <CommunicationTower position={[-250, 0, -450]} />
      
      {/* === BLOCK D: ENGINEERING HQ & CONTROL CENTER === */}
      <Building position={[0, 50, 100]} args={[60, 120, 60]} theme={theme} isGlass={true} label="Block D: Engineering HQ & Control" showLabels={showLabels} />

      {/* Large Storage Tanks near Block G */}
      <LargeStorageTank position={[-430, 0, -250]} color="#475569" />
      <LargeStorageTank position={[-400, 0, -250]} color="#dc2626" />
      <LargeStorageTank position={[-370, 0, -250]} color="#475569" />

      {/* === BLOCK I: MASSIVE LOGISTICS HUB (NEW) === */}
      <FactoryBlock position={[0, 0, 400]} theme={theme} label="Block I: Global Logistics Hub" colorScheme="orange" args={[260, 40, 120]} showLabels={showLabels} />
      {/* Loading Docks flanking the Logistics Hub */}
      <LoadingDock position={[-120, 0, 480]} />
      <LoadingDock position={[-50, 0, 480]} />
      <LoadingDock position={[50, 0, 480]} />
      <LoadingDock position={[120, 0, 480]} />
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
        targetPos.current.set(-200, 80, 200);
        targetLookAt.current.set(-200, 10, 0); // Block A
        break;
      case 'Unit2':
        targetPos.current.set(200, 80, 200);
        targetLookAt.current.set(200, 10, 0); // Block B
        break;
      case 'Tower':
        targetPos.current.set(0, 100, -50);
        targetLookAt.current.set(0, 40, -250); // Block C
        break;
      case 'Global':
      default:
        targetPos.current.set(0, 1500, 2000);
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
const CNCMachine = ({ position, machine, theme, aiHeatmapMode, onClick }: { position: [number, number, number], machine: any, theme: string, aiHeatmapMode?: boolean, onClick?: () => void }) => {
  const gantryRef = useRef<THREE.Group>(null);
  const spindleRef = useRef<THREE.Group>(null);
  const drillRef = useRef<THREE.Mesh>(null);
  const workpieceRef = useRef<THREE.Mesh>(null);
  const anomalyPulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const isRunning = machine?.status === 'Running';
  const isWarning = machine?.status === 'Maintenance' || machine?.status === 'Offline';
  const hasAnomaly = isWarning || machine?.temperature > 85;
  
  const statusColor = isRunning ? '#10b981' : isWarning ? '#ef4444' : '#f59e0b';
  
  // Andon Lights logic
  const redOn = isWarning || machine?.temperature > 90;
  const yellowOn = machine?.status === 'Idle' || (machine?.temperature > 75 && machine?.temperature <= 90);
  const greenOn = isRunning && !redOn;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (isRunning) {
      // Complex multi-axis movement for the CNC gantry and spindle
      if (gantryRef.current) gantryRef.current.position.x = Math.sin(t * 2) * 3;
      if (spindleRef.current) spindleRef.current.position.z = Math.cos(t * 1.5) * 2;
      
      // Drill spinning and plunging
      if (drillRef.current) {
        drillRef.current.rotation.y += 20 * delta;
        drillRef.current.position.y = Math.sin(t * 4) * 1.5; 
      }
      // Workpiece glowing/processing
      if (workpieceRef.current) {
        (workpieceRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.5;
      }
    }
    
    if (anomalyPulseRef.current && hasAnomaly && aiHeatmapMode) {
      const scale = 1 + Math.sin(t * 3) * 0.2;
      anomalyPulseRef.current.scale.set(scale, scale, scale);
      (anomalyPulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 6) * 0.3;
    }
  });

  return (
    <group 
      position={position} 
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Detailed Data HUD on Hover */}
      {hovered && machine && <MachineHUD machine={machine} hasAnomaly={hasAnomaly} />}

      {/* AI Anomaly Heatmap Overlay */}
      {aiHeatmapMode && hasAnomaly && (
        <group position={[0, 0.5, 0]}>
           <pointLight color="#ef4444" intensity={5} distance={30} decay={2} />
           <mesh rotation={[-Math.PI / 2, 0, 0]} ref={anomalyPulseRef}>
             <circleGeometry args={[14, 32]} />
             <meshBasicMaterial color="#ef4444" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
           </mesh>
        </group>
      )}

      {/* Main Heavy Base */}
      <Box args={[12, 4, 8]} position={[0, 2, 0]}>
        <meshStandardMaterial color={theme === 'light' ? "#cbd5e1" : "#1e293b"} metalness={0.8} roughness={0.2} />
      </Box>
      
      {/* Control Panel Console */}
      <group position={[4, 5, 4.2]} rotation={[-0.3, 0, 0]}>
        <Box args={[3, 2, 0.5]}>
          <meshStandardMaterial color="#0f172a" />
        </Box>
        {/* Screen */}
        <Box args={[2.5, 1.2, 0.1]} position={[0, 0.2, 0.26]}>
          <meshStandardMaterial color={isRunning ? "#0369a1" : "#7f1d1d"} emissive={isRunning ? "#0284c7" : "#b91c1c"} emissiveIntensity={0.5} />
        </Box>
        {/* Buttons */}
        <Box args={[0.3, 0.3, 0.1]} position={[-1, -0.6, 0.26]}>
           <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={greenOn ? 1 : 0} />
        </Box>
        <Box args={[0.3, 0.3, 0.1]} position={[1, -0.6, 0.26]}>
           <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={redOn ? 1 : 0} />
        </Box>
      </group>

      {/* Milling Bed */}
      <Box args={[10, 0.5, 6]} position={[0, 4.25, 0]}>
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.5} />
      </Box>
      
      {/* Workpiece */}
      <mesh ref={workpieceRef} position={[0, 5, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#38bdf8" metalness={1} roughness={0.1} emissive="#0ea5e9" emissiveIntensity={0.2} />
      </mesh>

      {/* Glass Enclosure */}
      <mesh position={[0, 9, 0]}>
        <boxGeometry args={[11, 9, 7]} />
        <meshPhysicalMaterial 
          color={theme === 'light' ? "#f1f5f9" : "#0f172a"} 
          transmission={0.9} 
          opacity={1} 
          metalness={0.1} 
          roughness={0.1} 
          ior={1.5} 
          thickness={0.5} 
          transparent 
        />
      </mesh>
      
      {/* Structural Pillars for Enclosure */}
      {[-5.2, 5.2].map(x => 
        [-3.2, 3.2].map(z => (
          <Box key={`pillar-${x}-${z}`} args={[0.6, 9, 0.6]} position={[x, 9, z]}>
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </Box>
        ))
      )}
      
      {/* Multi-Axis Gantry & Spindle */}
      <group position={[0, 12.5, 0]} ref={gantryRef}>
        {/* X-Axis Bridge */}
        <Box args={[11, 0.8, 1.5]} position={[0, 0, 0]}>
           <meshStandardMaterial color="#ef4444" metalness={0.6} roughness={0.4} />
        </Box>
        
        {/* Z-Axis Carriage */}
        <group ref={spindleRef} position={[0, -1, 0]}>
          <Box args={[2, 1.5, 2]}>
             <meshStandardMaterial color="#64748b" metalness={0.8} />
          </Box>
          
          {/* Y-Axis Drill */}
          <group ref={drillRef} position={[0, -1, 0]}>
            {/* Spindle Housing */}
            <Cylinder args={[0.6, 0.4, 2]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </Cylinder>
            {/* Drill Bit */}
            <Cylinder args={[0.1, 0.05, 1.5]} position={[0, -1.5, 0]}>
              <meshStandardMaterial color="#f8fafc" metalness={1} roughness={0} />
            </Cylinder>
          </group>
        </group>
      </group>

      {/* Andon Indicator Lights (Factory Tower) */}
      <group position={[-5, 16, -3]}>
        <Cylinder args={[0.1, 0.1, 4]} position={[0, -2, 0]}>
           <meshStandardMaterial color="#475569" metalness={0.8} />
        </Cylinder>
        {/* Green */}
        <Cylinder args={[0.3, 0.3, 0.6]} position={[0, 0.8, 0]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={greenOn ? 2 : 0} opacity={greenOn ? 1 : 0.3} transparent />
        </Cylinder>
        {/* Yellow */}
        <Cylinder args={[0.3, 0.3, 0.6]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={yellowOn ? 2 : 0} opacity={yellowOn ? 1 : 0.3} transparent />
        </Cylinder>
        {/* Red */}
        <Cylinder args={[0.3, 0.3, 0.6]} position={[0, 2.2, 0]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={redOn ? 2 : 0} opacity={redOn ? 1 : 0.3} transparent />
        </Cylinder>
      </group>

      {/* Floating UI */}
      <Html position={[0, 19, 0]} center zIndexRange={[100, 0]}>
        <div style={{ background: 'rgba(15,23,42,0.9)', border: `1px solid ${statusColor}`, color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: `0 0 10px ${statusColor}40` }}>
          {machine?.name || 'CNC-XX'} <span style={{ color: statusColor, marginLeft: '6px', textShadow: `0 0 5px ${statusColor}` }}>●</span>
        </div>
      </Html>
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

const MachineHUD = ({ machine, hasAnomaly }: { machine: any, hasAnomaly: boolean }) => (
  <Html position={[0, 18, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: `1px solid ${hasAnomaly ? '#ef4444' : '#3b82f6'}`,
      padding: '12px 16px',
      borderRadius: '8px',
      color: 'white',
      width: '240px',
      backdropFilter: 'blur(8px)',
      boxShadow: hasAnomaly ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #334155', paddingBottom: '4px', color: '#38bdf8' }}>{machine.name}</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#94a3b8' }}>STATUS:</span>
        <span style={{ color: machine.status === 'Running' ? '#10b981' : machine.status === 'Idle' ? '#f59e0b' : '#ef4444', fontWeight: 'bold' }}>{machine.status.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#94a3b8' }}>TEMP:</span>
        <span style={{ color: machine.temperature > 85 ? '#ef4444' : '#fff' }}>{machine.temperature}°C</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>UPTIME:</span>
        <span>{machine.running_hours} hrs</span>
      </div>
    </div>
  </Html>
);

const DynamicHydraulicPress = ({ position, machine, onClick }: any) => {
  const [hovered, setHovered] = useState(false);
  const isRunning = machine?.status === 'Running';
  const hasAnomaly = machine?.temperature > 85 || machine?.status === 'Maintenance';
  const pressRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isRunning && pressRef.current) {
      pressRef.current.position.y = 5 + Math.sin(state.clock.elapsedTime * 4) * 3;
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}>
      <Box args={[12, 2, 8]} position={[0, 1, 0]}><meshStandardMaterial color="#334155" /></Box>
      <Box args={[2, 16, 2]} position={[-5, 9, 0]}><meshStandardMaterial color="#ef4444" /></Box>
      <Box args={[2, 16, 2]} position={[5, 9, 0]}><meshStandardMaterial color="#ef4444" /></Box>
      <Box args={[14, 4, 10]} position={[0, 19, 0]}><meshStandardMaterial color="#1e293b" /></Box>
      <Box ref={pressRef as any} args={[8, 4, 6]} position={[0, 8, 0]}><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} /></Box>
      {hovered && machine && <MachineHUD machine={machine} hasAnomaly={hasAnomaly} />}
    </group>
  );
};

const AutoWeldingArm = ({ position, machine, onClick }: any) => {
  const [hovered, setHovered] = useState(false);
  const isRunning = machine?.status === 'Running';
  const hasAnomaly = machine?.temperature > 85 || machine?.status === 'Maintenance';
  const armRef = useRef<THREE.Group>(null);
  const sparkRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (isRunning && armRef.current) {
      armRef.current.rotation.y = Math.sin(t * 3) * Math.PI / 4;
      if (sparkRef.current) {
        (sparkRef.current.material as THREE.MeshBasicMaterial).opacity = Math.random() > 0.5 ? 1 : 0.2;
      }
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}>
      <Cylinder args={[2, 3, 2]} position={[0, 1, 0]}><meshStandardMaterial color="#f59e0b" /></Cylinder>
      <group ref={armRef} position={[0, 2, 0]}>
        <Box args={[1.5, 8, 1.5]} position={[0, 4, 0]} rotation={[0, 0, 0.2]}><meshStandardMaterial color="#fbbf24" /></Box>
        <Box args={[1, 6, 1]} position={[1.5, 9, 0]} rotation={[0, 0, -1]}><meshStandardMaterial color="#f59e0b" /></Box>
        <Box ref={sparkRef as any} args={[0.5, 0.5, 0.5]} position={[4.5, 6, 0]}><meshBasicMaterial color="#38bdf8" transparent opacity={0} /></Box>
      </group>
      {hovered && machine && <MachineHUD machine={machine} hasAnomaly={hasAnomaly} />}
    </group>
  );
};

const ChemicalVat = ({ position, machine, onClick }: any) => {
  const [hovered, setHovered] = useState(false);
  const isRunning = machine?.status === 'Running';
  const hasAnomaly = machine?.temperature > 85 || machine?.status === 'Maintenance';
  const liquidRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isRunning && liquidRef.current) {
      liquidRef.current.position.y = 5 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}>
      <Cylinder args={[5, 5, 12]} position={[0, 6, 0]}>
        <meshPhysicalMaterial color="#94a3b8" transmission={0.9} roughness={0.1} transparent opacity={0.6} />
      </Cylinder>
      <Cylinder ref={liquidRef as any} args={[4.8, 4.8, 10]} position={[0, 5, 0]}><meshStandardMaterial color={hasAnomaly ? "#ef4444" : "#10b981"} /></Cylinder>
      <Box args={[12, 1, 12]} position={[0, 0.5, 0]}><meshStandardMaterial color="#475569" /></Box>
      {hovered && machine && <MachineHUD machine={machine} hasAnomaly={hasAnomaly} />}
    </group>
  );
};

// --------------------------------------------------------------------------
// Main Composition
// --------------------------------------------------------------------------
export const DigitalTwin = ({ machines, onSelectMachine, thermalMode, isEmergencyMode, aiHeatmapMode }: DigitalTwinProps) => {
  const [store] = useState(() => createXRStore());
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [viewMode, setViewMode] = useState('Global');
  const [showLabels, setShowLabels] = useState(false);
  const [activeLayer, setActiveLayer] = useState('none');


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
      
      
      {/* Map Layers Panel (Google Maps Style) */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Map Layers</h3>
        <button 
          onClick={() => setActiveLayer(activeLayer === 'power' ? 'none' : 'power')}
          style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: activeLayer === 'power' ? 'rgba(56, 189, 248, 0.2)' : 'transparent', color: activeLayer === 'power' ? '#38bdf8' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', borderLeft: activeLayer === 'power' ? '3px solid #38bdf8' : '3px solid transparent' }}
        >⚡ Power Supply Flow</button>
        <button 
          onClick={() => setActiveLayer(activeLayer === 'manufacturing' ? 'none' : 'manufacturing')}
          style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: activeLayer === 'manufacturing' ? 'rgba(249, 115, 22, 0.2)' : 'transparent', color: activeLayer === 'manufacturing' ? '#f97316' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', borderLeft: activeLayer === 'manufacturing' ? '3px solid #f97316' : '3px solid transparent' }}
        >🏭 Manufacturing Zones</button>
        <button 
          onClick={() => setActiveLayer(activeLayer === 'logistics' ? 'none' : 'logistics')}
          style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: activeLayer === 'logistics' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: activeLayer === 'logistics' ? '#10b981' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', borderLeft: activeLayer === 'logistics' ? '3px solid #10b981' : '3px solid transparent' }}
        >🚚 Supply Chain Routes</button>
      </div>

      {/* Cinematic View Control Panel */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: '12px', background: 'var(--bg-glass)', padding: '8px 16px', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <button 
          onClick={() => setShowLabels(!showLabels)}
          style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--accent-primary)', background: showLabels ? 'var(--accent-primary)' : 'transparent', color: showLabels ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >🏷️ Labels</button>
        <button 
          onClick={() => setViewMode('Global')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Global' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Global' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Global Map</button>
        <button 
          onClick={() => setViewMode('Unit1')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Unit1' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Unit1' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Block A: Machining</button>
        <button 
          onClick={() => setViewMode('Unit2')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Unit2' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Unit2' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Block B: Assembly</button>
        <button 
          onClick={() => setViewMode('Tower')}
          style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', background: viewMode === 'Tower' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'Tower' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >Block C: Testing</button>
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
        <h3>Industrial Digital Twin — IIoT Platform</h3>
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

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 180, 220], fov: 40, near: 0.05, far: 20000 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        {/* Post-Processing disabled to massively improve framerates on lower-end machines */}
        {/* <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer> */}

        <CameraController viewMode={viewMode} />

        <XR store={store}>
          <color attach="background" args={[theme === 'light' ? '#f1f5f9' : '#020617']} />
          
          {/* HDR Environment Lighting (Dim in Heatmap mode) */}
          <Environment preset={theme === 'light' ? "city" : "night"} background={false} />

          {/* Cinematic Lighting: Sun & Ambient. Dim drastically during AI Heatmap to highlight glowing zones */}
          <ambientLight intensity={isEmergencyMode ? 0.2 : aiHeatmapMode ? 0.1 : theme === 'light' ? 1.0 : 0.6} />
          
          <directionalLight 
            position={[100, 150, 50]} 
            intensity={isEmergencyMode ? 2 : aiHeatmapMode ? 0.2 : theme === 'light' ? 2 : 1.5}
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
            <MapControls 
              makeDefault
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minPolarAngle={0} 
              maxPolarAngle={Math.PI} // Unrestricted looking
              minDistance={1}
              maxDistance={10000} // Unrestricted zoom out
              panSpeed={2.0}
              zoomSpeed={1.5}
              autoRotate={!isEmergencyMode && viewMode === 'Global'}
              autoRotateSpeed={0.3}
            />
          )}

          {/* Core Terrain and Campus Buildings */}
          <CampusEnvironment theme={theme} showLabels={showLabels} activeLayer={activeLayer} />

          {/* Dynamic Machinery Seeding from Database */}
          {machines && machines.map((machine: any, index: number) => {
             const name = machine.name || '';
             
             if (name.includes('Block A') || (!name.includes('Block') && index < 5)) {
               const bayX = -150 + ((index % 5) * 25);
               const bayZ = -100 + (Math.floor(index / 5) * 20);
               return (
                 <group key={machine.id || index} position={[bayX, 2, bayZ]}>
                   <CNCMachine position={[0, 0, 0]} machine={machine} theme={theme} aiHeatmapMode={aiHeatmapMode} onClick={() => { setViewMode('BlockA'); onSelectMachine?.(machine); }} />
                   <RoboticArm position={[8, 0, 15]} speedOffset={index*0.5} isEmergencyMode={isEmergencyMode} />
                 </group>
               );
             }
             
             if (name.includes('Block B') || (!name.includes('Block') && index >= 5 && index < 10)) {
               const bayX = 150 + ((index % 5) * 25);
               const bayZ = -100 + (Math.floor(index / 5) * 20);
               return (
                 <CNCMachine key={machine.id || index} position={[bayX, 2, bayZ]} machine={machine} theme={theme} aiHeatmapMode={aiHeatmapMode} onClick={() => { setViewMode('BlockB'); onSelectMachine?.(machine); }} />
               );
             }

             if (name.includes('Block E')) {
               const bayX = -350 + ((index % 4) * 30);
               const bayZ = -100 + (Math.floor(index / 4) * 25);
               return <DynamicHydraulicPress key={machine.id || index} position={[bayX, 0, bayZ]} machine={machine} onClick={() => onSelectMachine?.(machine)} />;
             }

             if (name.includes('Block F')) {
               const bayX = 350 + ((index % 5) * 25);
               const bayZ = -100 + (Math.floor(index / 5) * 25);
               return <AutoWeldingArm key={machine.id || index} position={[bayX, 0, bayZ]} machine={machine} onClick={() => onSelectMachine?.(machine)} />;
             }

             if (name.includes('Block G')) {
               const bayX = -350 + ((index % 4) * 25);
               const bayZ = -300 + (Math.floor(index / 4) * 25);
               return <ChemicalVat key={machine.id || index} position={[bayX, 0, bayZ]} machine={machine} onClick={() => onSelectMachine?.(machine)} />;
             }
             
             return null;
          })}

          {/* AI & Heatmap Context Overlays */}

          {/* ================================================================
              BLOCK A: RAW MATERIAL PROCESSING & HEAVY MACHINING
              Electric Arc Furnaces → CNC Machining Bays → Conveyor output
          ================================================================ */}
          <group position={[-100, 0, -100]}>
            <Grid infiniteGrid={false} args={[155, 115]} sectionColor="#3b82f6" cellColor="#0ea5e9" position={[0, 2.1, 0]} />
            
            {/* Smelting zone: two furnaces */}
            <IndustrialFurnace position={[-40, 0, -30]} />
            <IndustrialFurnace position={[40, 0, -30]} />
            
            {/* Welding stations between furnaces and conveyors */}
            <WeldingBooth position={[-20, 0, -10]} />
            <WeldingBooth position={[20, 0, -10]} />

            {/* Main conveyor lines transporting parts through machining bays */}
            <ConveyorLine position={[0, 0, 0]} length={140} />
            <ConveyorLine position={[0, 0, 10]} length={140} />
            
            {/* Overhead Crane spanning the width of Block A at ceiling height */}
            <OverheadCrane position={[0, 62, -10]} span={130} />
            
            {/* Electrical Control Panels along back wall */}
            <ControlPanelRack position={[-55, 0, -45]} />
            
            {/* Raw material storage at back of plant */}
            <WarehouseRacks position={[-60, 0, 45]} />
            <WarehouseRacks position={[0, 0, 45]} />
            <WarehouseRacks position={[60, 0, 45]} />
            
            {/* Incoming raw material pallets */}
            <PalletStack position={[-40, 0, 35]} />
            <PalletStack position={[-20, 0, 35]} />
            <PalletStack position={[20, 0, 25]} />
            <PalletStack position={[40, 0, 25]} />

            {/* Dynamic machines are now handled globally above CampusEnvironment */}

            {/* Hydraulic Press bay — heavy forming station */}
            <HydraulicPress position={[55, 0, -40]} />

            {/* Air Compressor cluster — supplies pneumatic tools */}
            <AirCompressor position={[60, 0, 35]} />
            <AirCompressor position={[45, 0, 35]} />

            {/* Overhead Pipe Rack — supplies coolant, hydraulic fluid, compressed air */}
            <PipeRack position={[0, 0, -50]} length={130} />

            {/* Drum Storage — lubricants, cutting fluids, chemicals */}
            <DrumStorage position={[-60, 0, 20]} />

            {/* Roof trusses visible at ceiling level */}
            <RoofTruss position={[0, 60, -20]} span={130} />
            <RoofTruss position={[0, 60, 10]} span={130} />
          </group>

          {/* ================================================================
              BLOCK B: PRECISION ASSEMBLY, ROBOTICS & QUALITY TESTING
              Robotic Welding → Component Assembly → QC Gantry → Paint Booth → Testing Rig → Dispatch
          ================================================================ */}
          <group position={[200, 0, -200]}>
            <Grid infiniteGrid={false} args={[155, 115]} sectionColor="#10b981" cellColor="#34d399" position={[0, 2.1, 0]} />
            
            {/* Incoming conveyor from Block A bridge */}
            <ConveyorLine position={[0, 0, -30]} length={140} />
            
            {/* Overhead Crane for Block B — carries assembled units to dispatch */}
            <OverheadCrane position={[0, 55, -15]} span={130} />
            
            {/* Control Panels & Electrical Racks on side wall */}
            <ControlPanelRack position={[55, 0, 30]} />
            
            {/* QC Inspection gantry frame scanning finished assemblies */}
            <QCInspectionFrame position={[-50, 0, -45]} />
            
            {/* Paint Booth: enclosed spraying chamber */}
            <PaintBooth position={[40, 0, -45]} />
            
            {/* Testing Rig: hydraulic press for load/stress testing */}
            <TestingRig position={[60, 0, 20]} />
            
            {/* Finished goods storage behind assembly line */}
            <WarehouseRacks position={[-60, 0, -45]} />
            <WarehouseRacks position={[0, 0, -45]} />
            
            <PalletStack position={[-30, 0, -35]} />
            <PalletStack position={[30, 0, -35]} />


            {/* Additional Block B machinery */}
            {/* Pipe rack delivering coolant and air to all assembly stations */}
            <PipeRack position={[0, 0, 50]} length={130} />

            {/* Drum storage for paint, solvents, and coatings */}
            <DrumStorage position={[55, 0, -20]} />

            {/* Roof trusses at ceiling of assembly hall */}
            <RoofTruss position={[0, 55, -30]} span={130} />
            <RoofTruss position={[0, 55, 5]} span={130} />
          </group>

          {/* Massive AGV Swarm traveling along expanded road network */}
          <AGV3D waypoints={[[-200, 0, -100], [200, 0, -100], [200, 0, 100], [-200, 0, 100]]} speed={15} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[200, 0, -90], [-200, 0, -90], [-200, 0, 90], [200, 0, 90]]} speed={18} isEmergencyMode={isEmergencyMode} />
          <AGV3D waypoints={[[-600, 0, -100], [600, 0, -100], [600, 0, -300], [-600, 0, -300]]} speed={20} isEmergencyMode={isEmergencyMode} />
          
          {/* Expanded Logistics Trucks on Extended Main Roads */}
          <LogisticsTruck startPosition={[-800, 0, 15]} delay={0} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-400, 0, 15]} delay={5} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[0, 0, 15]} delay={10} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[400, 0, 15]} delay={15} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[800, 0, 15]} delay={20} isEmergencyMode={isEmergencyMode} />
          
          <LogisticsTruck startPosition={[-15, 0, -800]} delay={2} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-15, 0, -400]} delay={8} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-15, 0, 400]} delay={14} isEmergencyMode={isEmergencyMode} />
          <LogisticsTruck startPosition={[-15, 0, 800]} delay={20} isEmergencyMode={isEmergencyMode} />

        </XR>
      </Canvas>
    </div>
  );
};
