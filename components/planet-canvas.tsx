"use client"

import React, { useEffect, useRef, useState } from 'react'

type Props = {
  embedded?: boolean
  className?: string
}

// Простейшая геопроекция для рисования континентов на сфере
function deg2rad(d: number) { return (d * Math.PI) / 180 }

function rotateY(v: [number, number, number], a: number): [number, number, number] {
  const [x, y, z] = v
  const ca = Math.cos(a), sa = Math.sin(a)
  return [ca * x + sa * z, y, -sa * x + ca * z]
}
function rotateX(v: [number, number, number], a: number): [number, number, number] {
  const [x, y, z] = v
  const ca = Math.cos(a), sa = Math.sin(a)
  return [x, ca * y - sa * z, sa * y + ca * z]
}

function project(
  lat: number,
  lon: number,
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  r: number
) {
  const la = deg2rad(lat)
  const lo = deg2rad(lon)
  let v: [number, number, number] = [
    Math.cos(la) * Math.cos(lo),
    Math.sin(la),
    Math.cos(la) * Math.sin(lo),
  ]
  v = rotateY(v, yaw)
  v = rotateX(v, pitch)
  const [x, y, z] = v
  if (z <= 0) return null // тыльная сторона
  return [cx + x * r, cy - y * r] as [number, number]
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rot: number
) {
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.45
  const yaw = rot * 0.5 // скорость
  const pitch = 0.25

  // Контуры сферы
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  grad.addColorStop(0, 'rgba(34,211,238,0.9)')
  grad.addColorStop(1, 'rgba(168,85,247,0.9)')

  ctx.save()
  ctx.strokeStyle = grad
  ctx.lineWidth = Math.max(1, r * 0.008)
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Лёгкое свечение
  ctx.globalAlpha = 0.15
  ctx.shadowColor = 'rgba(168,85,247,0.6)'
  ctx.shadowBlur = r * 0.25
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Гратикулы (широты/долготы)
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = Math.max(1, r * 0.0035)
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath()
    let started = false
    for (let lon = -180; lon <= 180; lon += 5) {
      const p = project(lat, lon, yaw, pitch, cx, cy, r)
      if (!p) { started = false; continue }
      const [px, py] = p
      if (!started) { ctx.moveTo(px, py); started = true } else { ctx.lineTo(px, py) }
    }
    ctx.stroke()
  }
  for (let lon = -180; lon <= 165; lon += 15) {
    ctx.beginPath()
    let started = false
    for (let lat = -80; lat <= 80; lat += 5) {
      const p = project(lat, lon, yaw, pitch, cx, cy, r)
      if (!p) { started = false; continue }
      const [px, py] = p
      if (!started) { ctx.moveTo(px, py); started = true } else { ctx.lineTo(px, py) }
    }
    ctx.stroke()
  }
  ctx.restore()

  // Контуры материков рисуются в основном цикле отрисовки
}

export default function PlanetCanvas({ embedded = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let rotation = 0
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    function resize() {
      const cssW = canvas.clientWidth
      const cssH = canvas.clientHeight
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    setReady(true)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = performance.now()
    function loop(now: number) {
      const dt = (now - last) / 1000
      last = now
      rotation += dt * 0.5 // медленно вращаем
      // Рисуем глобус и материки
      drawGlobe(ctx, canvas.clientWidth, canvas.clientHeight, rotation)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  if (!embedded) {
    return (
      <div className={`pointer-events-none fixed right-[-60px] top-[-60px] md:right-[-120px] md:top-[-120px] -z-10 opacity-40 ${className}`}>
        <canvas ref={canvasRef} className="block w-[260px] h-[260px] md:w-[440px] md:h-[440px]" />
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />
  )
}
