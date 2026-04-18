'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface RoletaProps {
  items: string[]
  onResult?: (item: string, index: number) => void
  size?: number
  disabled?: boolean
  targetIndex?: number
  eligibleIndices?: number[]
}

const COLORS = [
  '#8B5CF6', '#EC4899', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#A855F7', '#F43F5E', '#14B8A6',
]

function playTick(audioCtx: AudioContext, volume: number = 0.3) {
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 600 + Math.random() * 400
    osc.type = 'sine'
    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.05)
  } catch {}
}

function playWinSound(audioCtx: AudioContext) {
  try {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const startTime = audioCtx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
      osc.start(startTime)
      osc.stop(startTime + 0.3)
    })
  } catch {}
}

export default function Roleta({ items, onResult, size = 400, disabled = false, targetIndex, eligibleIndices }: RoletaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const animationRef = useRef<number | null>(null)
  const rotationRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastSliceRef = useRef(-1)

  const numItems = items.length
  const sliceAngle = numItems > 0 ? (2 * Math.PI) / numItems : 0

  const getSliceAtPointer = useCallback((rot: number): number => {
    if (numItems === 0) return -1
    // Ponteiro no topo = ângulo -π/2
    // Normalizar (-π/2 - rot) para [0, 2π)
    let angle = (-Math.PI / 2 - rot) % (2 * Math.PI)
    if (angle < 0) angle += 2 * Math.PI
    return Math.floor(angle / sliceAngle) % numItems
  }, [numItems, sliceAngle])

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, rot: number) => {
    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 10

    ctx.clearRect(0, 0, size, size)

    if (numItems === 0) {
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6b7280'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Sem participantes', cx, cy)
      return
    }

    items.forEach((item, i) => {
      const start = rot + i * sliceAngle
      const end = start + sliceAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texto
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + sliceAngle / 2)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(10, Math.min(14, 200 / numItems))}px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      let text = item.length > 20 ? item.substring(0, 18) + '..' : item
      ctx.fillText(text, r - 20, 0)
      ctx.restore()
    })

    // Centro
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, Math.PI * 2)
    ctx.fillStyle = '#1a1a2e'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Ponteiro topo
    ctx.beginPath()
    ctx.moveTo(cx - 15, 5)
    ctx.lineTo(cx + 15, 5)
    ctx.lineTo(cx, 30)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [items, size, numItems, sliceAngle])

  // Desenhar sempre que items mudar (inicial)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawWheel(ctx, rotationRef.current)
  }, [items, drawWheel])

  const spin = () => {
    if (isSpinning || disabled || numItems === 0) return

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    setIsSpinning(true)
    lastSliceRef.current = -1

    // Decidir resultado
    let resultIndex: number
    if (eligibleIndices && eligibleIndices.length > 0) {
      // Modo elegíveis: sortear aleatoriamente ENTRE os elegíveis
      resultIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]
    } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < numItems) {
      resultIndex = targetIndex
    } else {
      // Modo aleatório: qualquer participante
      resultIndex = Math.floor(Math.random() * numItems)
    }

    // Ângulo alvo: centro da fatia resultIndex alinhado ao ponteiro (-π/2)
    const exactTargetRot = -Math.PI / 2 - resultIndex * sliceAngle - sliceAngle / 2

    // Voltas extras (sempre girar bastante para frente)
    const fullSpins = (6 + Math.random() * 3) * 2 * Math.PI

    // Calcular rotação final absoluta
    let finalRot = exactTargetRot
    while (finalRot > rotationRef.current) finalRot -= 2 * Math.PI
    finalRot -= fullSpins

    const startRot = rotationRef.current
    const totalDelta = finalRot - startRot
    const duration = 5000 + Math.random() * 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)

      let current = startRot + totalDelta * eased

      // No frame final, forçar rotação exata para eliminar erro de ponto flutuante
      if (progress >= 1) {
        current = exactTargetRot
      }

      rotationRef.current = current

      // Desenhar
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) drawWheel(ctx, current)
      }

      // Som tick
      const slice = getSliceAtPointer(current)
      if (slice !== lastSliceRef.current && audioCtxRef.current) {
        lastSliceRef.current = slice
        playTick(audioCtxRef.current, 0.15 + 0.2 * (1 - progress))
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)

        if (audioCtxRef.current) playWinSound(audioCtxRef.current)

        // Resultado garantido: o resultIndex que foi calculado
        if (onResult) onResult(items[resultIndex], resultIndex)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
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
        disabled={isSpinning || disabled || numItems === 0}
        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
      >
        {isSpinning ? 'Girando...' : 'Girar Roleta'}
      </button>
    </div>
  )
}
