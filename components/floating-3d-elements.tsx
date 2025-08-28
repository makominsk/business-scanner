"use client"

import { Canvas } from "@react-three/fiber"
import { Float, Sphere, Box, Torus, Environment, OrbitControls } from "@react-three/drei"
import { useRef } from "react"
import type { Mesh } from "three"

function FloatingShape({
  position,
  color,
  shape = "sphere",
}: { position: [number, number, number]; color: string; shape?: "sphere" | "box" | "torus" }) {
  const meshRef = useRef<Mesh>(null)

  const ShapeComponent = shape === "sphere" ? Sphere : shape === "box" ? Box : Torus

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <ShapeComponent ref={meshRef} position={position} args={shape === "torus" ? [0.5, 0.2, 8, 16] : [0.8]}>
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </ShapeComponent>
    </Float>
  )
}

export function Floating3DElements() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <Environment preset="night" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        <FloatingShape position={[-4, 2, -2]} color="#8b5cf6" shape="sphere" />
        <FloatingShape position={[4, -2, -3]} color="#06b6d4" shape="box" />
        <FloatingShape position={[-2, -3, -1]} color="#ec4899" shape="torus" />
        <FloatingShape position={[3, 3, -4]} color="#10b981" shape="sphere" />
        <FloatingShape position={[-5, -1, -2]} color="#f59e0b" shape="box" />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}
