import { useEffect, useRef } from 'react'

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    // Stars
    const stars: { x: number; y: number; size: number; opacity: number; speed: number }[] = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        opacity: Math.random(),
        speed: Math.random() * 0.5 + 0.2
      })
    }

    // Pink dots (planets)
    const planets: { x: number; y: number; size: number; color: string; speed: number }[] = []
    const pinkShades = ['#FF0099', '#EC4899', '#F472B6', '#FBCFE8']
    for (let i = 0; i < 8; i++) {
      planets.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 80 + 40,
        color: pinkShades[Math.floor(Math.random() * pinkShades.length)],
        speed: Math.random() * 0.1 + 0.05
      })
    }

    let animationFrame: number

    const animate = () => {
      // Dark background
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        // Twinkle effect
        star.opacity += (Math.random() - 0.5) * 0.02
        star.opacity = Math.max(0.2, Math.min(1, star.opacity))
      })

      // Draw planets with glow
      planets.forEach(planet => {
        // Glow effect
        const gradient = ctx.createRadialGradient(
          planet.x, planet.y, 0,
          planet.x, planet.y, planet.size
        )
        gradient.addColorStop(0, planet.color + '40')
        gradient.addColorStop(0.5, planet.color + '10')
        gradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(planet.x, planet.y, planet.size, 0, Math.PI * 2)
        ctx.fill()

        // Solid planet
        ctx.fillStyle = planet.color + '80'
        ctx.beginPath()
        ctx.arc(planet.x, planet.y, planet.size * 0.4, 0, Math.PI * 2)
        ctx.fill()

        // Slow drift
        planet.y += planet.speed
        if (planet.y > canvas.height + planet.size) {
          planet.y = -planet.size
          planet.x = Math.random() * canvas.width
        }
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', setCanvasSize)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: '#0a0a0f' }}
    />
  )
}
