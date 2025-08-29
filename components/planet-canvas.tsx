"use client"

import React, { useEffect, useRef, useState } from 'react'

type Props = {
  embedded?: boolean
  className?: string
}

// Простейшая геопроекция для рисования континентов на сфере
function deg2rad(d: number) { return (d * Math.PI) / 180 }

type LatLon = [number, number] // [lat, lon]

// Встроенный очень упрощённый набор контуров (lat, lon) — используется как фолбек
const FALLBACK_CONTINENTS: LatLon[][] = [
  // Африка
  [
    [37, -10], [35, -5], [32, 2], [31, 10], [28, 13], [22, 14], [17, 16], [12, 17], [7, 19], [4, 9], [2, 1], [0, -5], [-5, -5], [-10, 0], [-17, 15], [-22, 18], [-29, 32], [-34, 20], [-28, 18], [-22, 10], [-15, 10], [-5, 12], [5, 15], [12, 20], [20, 25], [26, 25], [30, 20], [35, 10], [37, -5], [37, -10]
  ],
  // Южная Америка
  [
    [12, -81], [10, -78], [7, -75], [4, -73], [0, -70], [-5, -67], [-10, -65], [-15, -63], [-20, -60], [-25, -58], [-30, -58], [-35, -60], [-40, -62], [-45, -65], [-50, -70], [-55, -70], [-50, -60], [-42, -54], [-35, -50], [-28, -48], [-20, -48], [-12, -50], [-7, -55], [-2, -58], [3, -62], [8, -67], [10, -72], [12, -78], [12, -81]
  ],
  // Северная Америка
  [
    [72, -168], [70, -150], [67, -140], [63, -130], [60, -125], [55, -125], [50, -130], [45, -125], [40, -120], [35, -115], [30, -110], [25, -105], [22, -100], [20, -95], [20, -90], [25, -85], [30, -82], [35, -80], [40, -79], [45, -75], [50, -70], [55, -65], [60, -60], [65, -65], [68, -75], [70, -90], [72, -110], [72, -130], [72, -150], [72, -168]
  ],
  // Европа
  [
    [71, -10], [65, -5], [60, 5], [55, 10], [52, 20], [50, 30], [47, 35], [45, 30], [43, 20], [45, 15], [48, 10], [50, 5], [55, 0], [60, -5], [65, -10], [71, -10]
  ],
  // Азия
  [
    [55, 30], [50, 40], [45, 50], [40, 60], [35, 70], [30, 80], [25, 90], [25, 100], [30, 110], [35, 120], [40, 130], [45, 140], [50, 150], [55, 160], [58, 170], [60, 170], [60, 160], [58, 150], [56, 140], [55, 130], [52, 120], [50, 110], [45, 100], [42, 90], [40, 80], [40, 70], [42, 60], [46, 50], [50, 40], [55, 30]
  ],
  // Австралия
  [
    [-10, 113], [-15, 120], [-20, 125], [-25, 130], [-30, 135], [-35, 140], [-40, 145], [-40, 150], [-35, 154], [-30, 150], [-25, 145], [-20, 140], [-15, 135], [-12, 130], [-10, 125], [-10, 120], [-10, 113]
  ],
  // Гренландия
  [
    [83, -73], [80, -60], [75, -50], [70, -45], [68, -40], [66, -42], [64, -48], [66, -54], [70, -60], [74, -65], [78, -70], [83, -73]
  ],
]

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

type GeoFeature = { type: string; geometry: { type: string; coordinates: any } }

async function loadContinents(): Promise<LatLon[][]> {
  try {
    const res = await fetch('/continents.geojson')
    if (!res.ok) throw new Error('Failed to load continents')
    const data = await res.json()
    const polys: LatLon[][] = []
    // Ожидаем FeatureCollection с MultiPolygon/Polygon; координаты: [lon, lat]
    for (const f of data.features as GeoFeature[]) {
      const g = f.geometry
      if (g.type === 'Polygon') {
        for (const ring of g.coordinates) {
          polys.push(ring.map(([lon, lat]: [number, number]) => [lat, lon]))
        }
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates) {
          for (const ring of poly) {
            polys.push(ring.map(([lon, lat]: [number, number]) => [lat, lon]))
          }
        }
      }
    }
    return polys
  } catch {
    return FALLBACK_CONTINENTS
  }
}

export default function PlanetCanvas({ embedded = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const continentsRef = useRef<LatLon[][] | null>(null)
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
    // Загружаем контуры материков (точные при наличии файла)
    loadContinents().then(polys => {
      continentsRef.current = polys
      setReady(true)
    })
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = performance.now()
    function loop(now: number) {
      const dt = (now - last) / 1000
      last = now
      rotation += dt * 0.5 // медленно вращаем
      // Рисуем глобус и материки
      drawGlobe(ctx, canvas.clientWidth, canvas.clientHeight, rotation)
      const cx = canvas.clientWidth / 2
      const cy = canvas.clientHeight / 2
      const r = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.45
      const yaw = rotation * 0.5
      const pitch = 0.25
      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
      grad.addColorStop(0, 'rgba(34,211,238,0.9)')
      grad.addColorStop(1, 'rgba(168,85,247,0.9)')
      ctx.save()
      ctx.strokeStyle = grad
      ctx.lineWidth = Math.max(1, r * 0.01)
      ctx.globalAlpha = 0.5
      const polys = continentsRef.current || FALLBACK_CONTINENTS
      for (const poly of polys) {
        ctx.beginPath()
        let started = false
        for (const [lat, lon] of poly) {
          const p = project(lat, lon, yaw, pitch, cx, cy, r)
          if (!p) { started = false; continue }
          const [px, py] = p
          if (!started) { ctx.moveTo(px, py); started = true } else { ctx.lineTo(px, py) }
        }
        ctx.stroke()
      }
      ctx.restore()
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
