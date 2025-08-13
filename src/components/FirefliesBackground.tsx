import React, { useEffect, useMemo, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export type FirefliesProps = {
  density?: number
  maxSize?: number
  color?: string
  twinkle?: boolean
  trails?: boolean
  parallax?: number
  speed?: number
  wind?: { x: number; y: number } | null
  paused?: boolean
  className?: string
}

type Fly = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  twPhase: number
  twSpeed: number
  biasX: number
  biasY: number
  layer: number // for subtle parallax per fly
  orbitAngle: number
  orbitSpeed: number
  orbitRadius: number
  dirAngle: number
  cruiseBase: number
}

/**
 * GPU-friendly animated fireflies background.
 * - Fullscreen fixed canvas behind content, pointer-events: none
 * - Honors prefers-reduced-motion and a paused prop
 * - Parallax and gentle gravitation toward hovered model cards (via DOM hover tracking)
 */
export default function FirefliesBackground(props: FirefliesProps) {
  const {
    density = 0.12,
    maxSize = 2.2,
    color,
    twinkle = true,
    trails = false,
    parallax = 0.2,
    speed = 1,
    wind = null,
    paused = false,
    className = ''
  } = props

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const fliesRef = useRef<Fly[]>([])
  const lastTimeRef = useRef<number>(0)
  const dprRef = useRef<number>(1)
  const viewportRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const targetBiasRef = useRef<{ x: number; y: number; strength: number }>({ x: 0, y: 0, strength: 0 })
  const reducedMotion = usePrefersReducedMotion()

  // Theme-aware default color (warm for light, cooler for dark) unless user passes explicit color
  const glowColor = useMemo(() => {
    if (color) return color
    const html = document.documentElement
    const theme = html?.getAttribute('data-theme') || 'light'
    return theme === 'dark' ? '#FFC94A' : '#FFE066'
  }, [color])

  const getTheme = () => (document.documentElement.getAttribute('data-theme') || 'light')

  // Observe hover over model cards to bias nearby flies gently toward the hovered card
  useEffect(() => {
    const root = document
    const handler = (ev: Event) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      const hoverCard = target.closest('[data-model-card="true"]') as HTMLElement | null
      if (!hoverCard) {
        targetBiasRef.current.strength = 0
        return
      }
      const rect = hoverCard.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      targetBiasRef.current = { x: cx, y: cy, strength: 1 }
    }
    root.addEventListener('mousemove', handler, { passive: true })
    root.addEventListener('mouseover', handler, { passive: true })
    return () => {
      root.removeEventListener('mousemove', handler as any)
      root.removeEventListener('mouseover', handler as any)
    }
  }, [])

  // Track mouse for global parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth || 1
      const vh = window.innerHeight || 1
      mouseRef.current.x = e.clientX / vw
      mouseRef.current.y = e.clientY / vh
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Resize-aware canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      viewportRef.current = { w, h }
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      dprRef.current = dpr
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedFlies()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(document.documentElement)
    window.addEventListener('orientationchange', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', resize)
    }
  }, [density, maxSize])

  // Create flies based on viewport area and density
  function seedFlies() {
    const { w, h } = viewportRef.current
    const area = w * h
    // Reduce density automatically for tiny screens
    const effectiveDensity = area < 320 * 600 ? density * 0.7 : density
    const count = Math.max(6, Math.floor((area / 100000) * effectiveDensity))

    const flies: Fly[] = []
    const INCH = 96 // CSS pixels per inch
    for (let i = 0; i < count; i++) {
      const r = 0.8 + Math.random() * (maxSize - 0.8)
      flies.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 2 - 1) * 0.1,
        vy: (Math.random() * 2 - 1) * 0.1,
        r,
        twPhase: Math.random() * Math.PI * 2,
        // ~6s cycle (4s on, 2s off) with slight per-fly variance
        twSpeed: (2 * Math.PI) / (6 + (Math.random() * 0.8 - 0.4)),
        biasX: 0,
        biasY: 0,
        layer: Math.random(), // 0..1 for per-fly parallax depth
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.8 + Math.random() * 0.6, // radians/sec scaled below
        orbitRadius: 8 + Math.random() * 20,
        dirAngle: Math.random() * Math.PI * 2,
        // cruise speed ~ 1 inch/sec +/- 0.5 inch/sec
        cruiseBase: INCH * (0.5 + Math.random())
      })
    }
    fliesRef.current = flies
  }

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let running = true

    const step = (t: number) => {
      if (!running) return

      // Tab not visible or paused or reduced motion → draw static state
      if (document.hidden || paused || reducedMotion) {
        drawStatic(ctx)
        rafRef.current = requestAnimationFrame(step)
        lastTimeRef.current = t
        return
      }

      const prev = lastTimeRef.current || t
      let dt = (t - prev) / 1000
      // safety clamp
      dt = Math.max(0, Math.min(dt, 0.033))
      lastTimeRef.current = t

      update(dt)
      draw(ctx, dt)
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    const onVisibility = () => {
      // Reset time to avoid position jumps on resume
      lastTimeRef.current = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    // Observe theme changes to adjust smear color without refresh
    const themeObserver = new MutationObserver(() => {
      // kick a frame so the smear color updates immediately
      lastTimeRef.current = performance.now()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
      themeObserver.disconnect()
    }
  }, [paused, reducedMotion, trails, twinkle, speed, parallax, wind, glowColor])

  function update(dt: number) {
    const flies = fliesRef.current
    const { w, h } = viewportRef.current
    const { x: mx, y: my } = mouseRef.current
    const bias = targetBiasRef.current

    // gentle global parallax drift offset for all flies
    const px = (mx - 0.5) * (parallax * 20)
    const py = (my - 0.5) * (parallax * 20)

    for (let i = 0; i < flies.length; i++) {
      const f = flies[i]

      // Smooth tiny heading jitter, not velocity explosion
      const headingJitter = (Math.random() * 2 - 1) * 0.4 * dt // radians
      f.dirAngle += headingJitter

      // Occasional ease toward a random point (approx. every few seconds)
      if (Math.random() < 0.002) {
        f.biasX = Math.random() * w
        f.biasY = Math.random() * h
      }

      // Gentle gravitation toward hovered model card center
      let gx = 0, gy = 0
      if (bias.strength > 0) {
        const dx = (bias.x - f.x)
        const dy = (bias.y - f.y)
        const dist = Math.max(1, Math.hypot(dx, dy))
        const influence = Math.min(1, 120 / dist) // closer → stronger
        gx = (dx / dist) * influence * 0.6
        gy = (dy / dist) * influence * 0.6
      }

      // local bias toward the fly's own waypoint
      const dxb = f.biasX ? (f.biasX - f.x) : 0
      const dyb = f.biasY ? (f.biasY - f.y) : 0
      const distb = Math.max(1, Math.hypot(dxb, dyb))
      const bx = (dxb / distb) * 0.15
      const by = (dyb / distb) * 0.15

      // consistent cruise velocity toward current heading with mild bias forces
      const targetVx = Math.cos(f.dirAngle) * f.cruiseBase
      const targetVy = Math.sin(f.dirAngle) * f.cruiseBase
      // adjust heading slightly toward waypoint and hover target
      f.vx += ((targetVx - f.vx) * 0.15 + (bx + gx + (wind?.x || 0) * 0.01) * 30) * dt
      f.vy += ((targetVy - f.vy) * 0.15 + (by + gy + (wind?.y || 0) * 0.01) * 30) * dt

      // mild damping keeps velocities bounded
      f.vx *= 0.995
      f.vy *= 0.995

      // whimsical loops: subtle orbit offset added to position
      f.orbitAngle += dt * f.orbitSpeed * 0.35
      const ox = Math.cos(f.orbitAngle) * f.orbitRadius
      const oy = Math.sin(f.orbitAngle) * f.orbitRadius

      f.x += (f.vx * dt) + ox * 0.02 + px * (0.15 + f.layer * 0.5)
      f.y += (f.vy * dt) + oy * 0.02 + py * (0.15 + f.layer * 0.5)

      // wrap bounds for continuous field
      if (f.x < -20) f.x = w + 20
      if (f.x > w + 20) f.x = -20
      if (f.y < -20) f.y = h + 20
      if (f.y > h + 20) f.y = -20

      // advance twinkle phase
      f.twPhase += dt * f.twSpeed
    }
  }

  function draw(ctx: CanvasRenderingContext2D, dt: number) {
    const flies = fliesRef.current
    const { w, h } = viewportRef.current

    const theme = getTheme()
    // No trails requested → clear fully each frame
    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < flies.length; i++) {
      const f = flies[i]
      const baseAlpha = theme === 'dark' ? 0.85 : 0.7
      // Hold bright most of the time, quick fades at edges
      // Map sin to [0,1], then apply a sharp sigmoid to compress mid-range
      const s = 0.5 + 0.5 * Math.sin(f.twPhase + i * 0.37)
      const sharp = smoothStepSharp(s, 0.1) // near 1 for most of the "on" half, drops fast
      const offMask = s > 0.5 ? 1 : 0 // quick off on the negative half
      const pulse = twinkle ? (offMask * sharp) : 1
      const alpha = baseAlpha * pulse

      // soft radial glow
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7)
      g.addColorStop(0, `${hexToRgba(glowColor, Math.min(1, alpha))}`)
      g.addColorStop(0.25, `${hexToRgba(glowColor, alpha * 0.75)}`)
      g.addColorStop(1, `${hexToRgba(glowColor, 0)}`)
      ctx.globalAlpha = 1
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawStatic(ctx: CanvasRenderingContext2D) {
    const flies = fliesRef.current
    const { w, h } = viewportRef.current
    ctx.clearRect(0, 0, w, h)
    // faint static constellation of dots
    for (let i = 0; i < flies.length; i++) {
      const f = flies[i]
      ctx.fillStyle = hexToRgba(glowColor, 0.25)
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-0 pointer-events-none ${className || ''}`}
      aria-hidden="true"
    />
  )
}

// Utilities
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Sharp sigmoid-like curve to keep near-1 most of the time and drop quickly near edges
function smoothStepSharp(x: number, edge: number) {
  // clamp
  const t = Math.max(0, Math.min(1, x))
  // push values away from 0..1 edges except near a small edge window
  const e = Math.max(0.001, Math.min(0.3, edge))
  if (t < e) return t / e // quick ramp up
  if (t > 1 - e) return (1 - t) / e // quick ramp down
  return 1 // hold bright
}


