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
    trails = true,
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
    for (let i = 0; i < count; i++) {
      const r = 0.8 + Math.random() * (maxSize - 0.8)
      flies.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 2 - 1) * 0.1,
        vy: (Math.random() * 2 - 1) * 0.1,
        r,
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: 0.5 + Math.random() * 1.2,
        biasX: 0,
        biasY: 0,
        layer: Math.random() // 0..1 for per-fly parallax depth
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
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
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

      // Smooth random wandering via tiny accelerations
      const jitterX = (Math.random() * 2 - 1) * 0.02
      const jitterY = (Math.random() * 2 - 1) * 0.02

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
      const bx = (dxb / distb) * 0.3
      const by = (dyb / distb) * 0.3

      // base velocity
      f.vx += (jitterX + bx + gx + (wind?.x || 0) * 0.02) * speed
      f.vy += (jitterY + by + gy + (wind?.y || 0) * 0.02) * speed

      // mild damping keeps velocities bounded
      f.vx *= 0.985
      f.vy *= 0.985

      f.x += f.vx + px * (0.2 + f.layer * 0.8)
      f.y += f.vy + py * (0.2 + f.layer * 0.8)

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

    if (trails) {
      // semi-transparent fill to create subtle motion trails
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.08
      // very dark blue to feel like night, not pure black
      ctx.fillStyle = 'rgba(8, 18, 28, 1)'
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.clearRect(0, 0, w, h)
    }

    for (let i = 0; i < flies.length; i++) {
      const f = flies[i]
      const baseAlpha = 0.7
      // twinkle like fireflies: slow on/off, de-synced per-fly
      const pulse = twinkle ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.twPhase + i * 0.37)) : 1
      const alpha = baseAlpha * pulse

      // soft radial glow
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6)
      g.addColorStop(0, `${hexToRgba(glowColor, Math.min(1, alpha))}`)
      g.addColorStop(0.25, `${hexToRgba(glowColor, alpha * 0.7)}`)
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
      className={`fixed inset-0 -z-10 pointer-events-none ${className || ''}`}
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


