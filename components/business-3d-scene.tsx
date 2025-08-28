"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Float, Text3D, Environment } from "@react-three/drei"
import { useRef } from "react"
import type { Mesh } from "three"

function BusinessObjects() {
  const laptopRef = useRef<Mesh>(null)
  const documentRef = useRef<Mesh>(null)
  const envelopeRef = useRef<Mesh>(null)

  return (
    <>
      {/* Laptop/Computer */}
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5} position={[-3, 1, 0]}>
        <mesh ref={laptopRef}>
          <boxGeometry args={[2, 1.2, 0.1]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.6, -0.05]}>
          <boxGeometry args={[1.8, 1, 0.05]} />
          <meshStandardMaterial color="#1f2937" emissive="#6366f1" emissiveIntensity={0.1} />
        </mesh>
      </Float>

      {/* Document/Notebook */}
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8} position={[2, 0, 1]}>
        <mesh ref={documentRef}>
          <boxGeometry args={[1.5, 2, 0.2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.11]}>
          <boxGeometry args={[1.3, 1.8, 0.01]} />
          <meshStandardMaterial color="#6366f1" opacity={0.8} transparent />
        </mesh>
      </Float>

      {/* Envelope */}
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.6} position={[0, -1, 2]}>
        <mesh ref={envelopeRef}>
          <boxGeometry args={[2.5, 1.5, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.2} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.8, 1.8, 0.02]} />
          <meshStandardMaterial color="#6366f1" opacity={0.7} transparent />
        </mesh>
      </Float>

      {/* Chart/Graph */}
      <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.4} position={[3, -1, -1]}>
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 1.5, 0.1]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[-0.5, 0.2, 0.06]}>
            <boxGeometry args={[0.2, 0.8, 0.05]} />
            <meshStandardMaterial color="#34d399" />
          </mesh>
          <mesh position={[0, 0.4, 0.06]}>
            <boxGeometry args={[0.2, 1.2, 0.05]} />
            <meshStandardMaterial color="#6366f1" />
          </mesh>
          <mesh position={[0.5, 0.1, 0.06]}>
            <boxGeometry args={[0.2, 0.6, 0.05]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        </group>
      </Float>

      {/* Business Card */}
      <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.7} position={[-2, -2, 0]}>
        <mesh>
          <boxGeometry args={[1.8, 1, 0.05]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
        </mesh>
      </Float>

      {/* Floating Text */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3} position={[0, 3, -2]}>
        <Text3D font="/fonts/Inter_Bold.json" size={0.5} height={0.1} curveSegments={12}>
          BUSINESS
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
        </Text3D>
      </Float>
    </>
  )
}

export function Business3DScene() {
  return (
    <div className="fixed inset-0 -z-10 opacity-20">
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#d97706" />
        <Environment preset="city" />
        <BusinessObjects />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}
