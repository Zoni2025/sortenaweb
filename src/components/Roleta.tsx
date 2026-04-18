'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface RoletaProps {
  items: string[]
  onResult?: (item: string, index: number) => void
  size?: number
  spinning?: boolean
  disabled?: boolean
  targetIndex?: number // se definido, a roleta para neste index
}

const COLORS = [
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#A855F7', // violet
  '#F43F5E', // rose
  '#14B8A6', // teal
]

export default function Roleta({ items, onResult, size = 400, disabled = false, targetIndex }: RoletaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const animationRef = useRef<number | null>(null)
  const currentRotationRef = useRef(0)

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, currentRotation: number) => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    ctx.clearRect(0, 0, size, size)

    if (items.length === 0) {
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6b7280'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Sem participantes', centerX, centerY)
      return
    }

    const sliceAngle = (2 * Math.PI) / items.length

    items.forEach((item, i) => {
      const startAngle = currentRotation + i * sliceAngle
      const endAngle = startAngle + sliceAngle

      // Fatia
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()

      // Borda
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texto
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + sliceAngle / 2)

      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(10, Math.min(14, 200 / items.length))}px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      // Truncar texto se necessário
      let text = item
      if (text.length > 20) {
        text = text.substring(0, 18) + '..'
      }

      ctx.fillText(text, radius - 20, 0)
      ctx.restore()
    })

    // Centro
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2)
    ctx.fillStyle = '#1a1a2e'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Ponteiro (seta no topo)
    ctx.beginPath()
    ctx.moveTo(centerX - 15, 5)
    ctx.lineTo(centerX + 15, 5)
    ctx.lineTo(centerX, 30)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [items, size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawWheel(ctx, rotation)
  }, [rotation, items, drawWheel])

  const spin = () => {
    if (isSpinning || disabled || items.length === 0) return

    setIsSpinning(true)

    const sliceAngle = (2 * Math.PI) / items.length

    // Calcular ângulo alvo
    let resultIndex: number
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < items.length) {
      resultIndex = targetIndex
    } else {
      resultIndex = Math.floor(Math.random() * items.length)
    }

    // O ponteiro está no topo (270° ou -π/2). Precisamos que a fatia do resultado
    // fique alinhada com o ponteiro. A fatia 'i' começa em i*sliceAngle.
    // Para alinhar o meio da fatia com o topo:
    const targetAngle = -(resultIndex * sliceAngle + sliceAngle / 2) - Math.PI / 2

    // Adicionar voltas extras (5-8 voltas)
    const extraSpins = (5 + Math.random() * 3) * Math.PI * 2
    const totalRotation = targetAngle + extraSpins - currentRotationRef.current

    const startRotation = currentRotationRef.current
    const duration = 4000 + Math.random() * 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing: desacelera no final
      const eased = 1 - Math.pow(1 - progress, 4)

      const current = startRotation + totalRotation * eased
      currentRotationRef.current = current
      setRotation(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)
        currentRotationRef.current = current
        if (onResult) {
          onResult(items[resultIndex], resultIndex)
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="max-w-full"
        style={{ maxWidth: size, maxHeight: size }}
      />
      <button
        onClick={spin}
        disabled={isSpinning || disabled || items.length === 0}
        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
      >
        {isSpinning ? 'Girando...' : 'Girar Roleta'}
      </button>
    </div>
  )
}
