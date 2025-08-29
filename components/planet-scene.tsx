// @ts-nocheck
"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { Sphere, OrbitControls } from "@react-three/drei"
import type { Mesh } from "three"

function RotatingPlanet() {
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    // Медленное вращение
    ref.current.rotation.y += delta * 0.05
    ref.current.rotation.x += delta * 0.01
  })

  return (
    <group>
      {/* Контурная сфера (воздушная) */}
      <Sphere args={[1.2, 32, 32]}>
        <meshBasicMaterial
          ref={ref as any}
          color="#a855f7"
          wireframe
          transparent
          opacity={0.35}
        />
      </Sphere>

      {/* Внутренняя тонкая сфера бирюзовым контуром для объёма */}
      <Sphere args={[1.0, 24, 24]}>
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.25} />
      </Sphere>
    </group>
  )
}

export function PlanetScene() {
  return (
    <div className="pointer-events-none fixed right-[-60px] top-[-60px] md:right-[-100px] md:top-[-100px] -z-10 opacity-40">
      <div className="w-[260px] h-[260px] md:w-[420px] md:h-[420px]">
        <Canvas camera={{ position: [0, 0, 4], fov: 55 }}>
          <ambientLight intensity={0.4} />
          <RotatingPlanet />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>
    </div>
  )
}

