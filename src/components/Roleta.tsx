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

/**
 * Dado a rotação atual da roleta, retorna o índice do item sob o ponteiro (topo).
 * O ponteiro fica no ângulo -π/2 no canvas.
 */
function getSliceAtPointer(rot: number, numItems: number, sliceAngle: number): number {
  if (numItems === 0) return -1
  // O ponteiro está fixo em -π/2.
  // A fatia i ocupa de (rot + i*sliceAngle) até (rot + (i+1)*sliceAngle).
  // Queremos achar i tal que rot + i*sliceAngle <= -π/2 < rot + (i+1)*sliceAngle
  // => i*sliceAngle <= -π/2 - rot < (i+1)*sliceAngle
  // => i <= (-π/2 - rot) / sliceAngle < i+1
  // => i = floor((-π/2 - rot) / sliceAngle)
  // Normalizar para [0, numItems)
  let raw = (-Math.PI / 2 - rot) / sliceAngle
  let idx = Math.floor(raw) % numItems
  if (idx < 0) idx += numItems
  return idx
}

/**
 * Calcula a rotação necessária para que o centro da fatia `idx` fique alinhado ao ponteiro.
 */
function getRotationForIndex(idx: number, sliceAngle: number): number {
  // Queremos que o centro da fatia idx fique em -π/2:
  // rot + idx * sliceAngle + sliceAngle/2 = -π/2
  // rot = -π/2 - idx * sliceAngle - sliceAngle/2
  return -Math.PI / 2 - idx * sliceAngle - sliceAngle / 2
}

export default function Roleta({ items, onResult, size = 400, disabled = false, targetIndex, eligibleIndices = [] }: RoletaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const animationRef = useRef<number | null>(null)
  const rotationRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastSliceRef = useRef(-1)

  const numItems = items.length
  const sliceAngle = numItems > 0 ? (2 * Math.PI) / numItems : 0

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
      const text = item.length > 20 ? item.substring(0, 18) + '..' : item
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

    // ===== DECIDIR RESULTADO =====
    let resultIndex: number
    if (eligibleIndices && eligibleIndices.length > 0) {
      resultIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]
    } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < numItems) {
      resultIndex = targetIndex
    } else {
      resultIndex = Math.floor(Math.random() * numItems)
    }

    // ===== CALCULAR ROTAÇÃO ALVO =====
    const targetRot = getRotationForIndex(resultIndex, sliceAngle)

    // Garantir que giramos PARA FRENTE (sentido horário = ângulo diminui)
    // e fazemos várias voltas completas
    const fullSpins = (6 + Math.random() * 3) * 2 * Math.PI
    let finalRot = targetRot
    // Garantir que finalRot está abaixo da rotação atual
    while (finalRot >= rotationRef.current) finalRot -= 2 * Math.PI
    // Adicionar voltas extras
    finalRot -= fullSpins

    const startRot = rotationRef.current
    const totalDelta = finalRot - startRot
    const duration = 5000 + Math.random() * 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)

      const current = startRot + totalDelta * eased

      rotationRef.current = current

      // Desenhar
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) drawWheel(ctx, current)
      }

      // Som tick
      const slice = getSliceAtPointer(current, numItems, sliceAngle)
      if (slice !== lastSliceRef.current && audioCtxRef.current) {
        lastSliceRef.current = slice
        playTick(audioCtxRef.current, 0.15 + 0.2 * (1 - progress))
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // ===== ANIMAÇÃO TERMINOU =====
        // Forçar rotação exata no target para eliminar erro de ponto flutuante
        rotationRef.current = targetRot

        // Redesenhar na posição exata
        const canvas2 = canvasRef.current
        if (canvas2) {
          const ctx2 = canvas2.getContext('2d')
          if (ctx2) drawWheel(ctx2, targetRot)
        }

        // Ler o que está VISUALMENTE sob o ponteiro — isso é a verdade visual
        const visualIndex = getSliceAtPointer(targetRot, numItems, sliceAngle)

        setIsSpinning(false)
        if (audioCtxRef.current) playWinSound(audioCtxRef.current)

        // Reportar o item que está VISUALMENTE sob o ponteiro
        if (onResult && visualIndex >= 0 && visualIndex < numItems) {
          onResult(items[visualIndex], visualIndex)
        }
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
