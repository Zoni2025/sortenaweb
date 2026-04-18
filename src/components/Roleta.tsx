'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface RoletaProps {
  items: string[]
  onResult?: (item: string, index: number) => void
  size?: number
  disabled?: boolean
  targetIndex?: number
}

const COLORS = [
  '#8B5CF6', '#EC4899', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#A855F7', '#F43F5E', '#14B8A6',
]

// Gera um som de tick usando Web Audio API
function playTick(audioCtx: AudioContext, volume: number = 0.3) {
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
}

// Som de vitória
function playWinSound(audioCtx: AudioContext) {
  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
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
}

export default function Roleta({ items, onResult, size = 400, disabled = false, targetIndex }: RoletaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const animationRef = useRef<number | null>(null)
  const currentRotationRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastSliceRef = useRef(-1)

  const sliceAngle = items.length > 0 ? (2 * Math.PI) / items.length : 0

  // Determinar qual fatia está no ponteiro (topo = -π/2 = 270°)
  // O ponteiro está no topo do canvas. Precisamos descobrir qual fatia está lá.
  const getSliceAtPointer = useCallback((rot: number): number => {
    if (items.length === 0) return -1
    // O ponteiro está no ângulo -π/2 (topo).
    // A fatia i começa em rot + i*sliceAngle.
    // Queremos: qual i tal que rot + i*sliceAngle <= -π/2 < rot + (i+1)*sliceAngle
    // Ou equivalente: normalizar (-π/2 - rot) para [0, 2π) e dividir por sliceAngle
    let pointerAngle = (-Math.PI / 2 - rot) % (2 * Math.PI)
    if (pointerAngle < 0) pointerAngle += 2 * Math.PI
    return Math.floor(pointerAngle / sliceAngle) % items.length
  }, [items.length, sliceAngle])

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

    // Ponteiro (seta no topo, apontando para baixo)
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
  }, [items, size, sliceAngle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawWheel(ctx, rotation)
  }, [rotation, items, drawWheel])

  const spin = () => {
    if (isSpinning || disabled || items.length === 0) return

    // Criar AudioContext no gesto do usuário (exigência do browser)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    setIsSpinning(true)
    lastSliceRef.current = -1

    // Determinar resultado
    let resultIndex: number
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < items.length) {
      resultIndex = targetIndex
    } else {
      resultIndex = Math.floor(Math.random() * items.length)
    }

    // Calcular ângulo final:
    // Queremos que a fatia resultIndex fique embaixo do ponteiro (topo = -π/2).
    // A fatia i ocupa de i*sliceAngle até (i+1)*sliceAngle na roda (sem rotação).
    // Com rotação R, a fatia i vai de R + i*sliceAngle até R + (i+1)*sliceAngle.
    // Para o meio da fatia estar em -π/2:
    // R + resultIndex*sliceAngle + sliceAngle/2 = -π/2 + 2πk
    // R = -π/2 - resultIndex*sliceAngle - sliceAngle/2 + 2πk
    const targetRotation = -Math.PI / 2 - resultIndex * sliceAngle - sliceAngle / 2

    // Adicionar voltas extras (6-9 voltas completas)
    const extraSpins = (6 + Math.random() * 3) * Math.PI * 2

    // Calcular delta necessário a partir da posição atual
    // Normalizar para que seja sempre positivo (girar para frente)
    let delta = targetRotation - currentRotationRef.current - extraSpins
    // Garantir que delta é negativo (rotação horária visualmente)
    while (delta > 0) delta -= 2 * Math.PI

    const startRotation = currentRotationRef.current
    const totalDelta = delta
    const duration = 5000 + Math.random() * 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing: desacelera suavemente no final
      const eased = 1 - Math.pow(1 - progress, 4)

      const current = startRotation + totalDelta * eased
      currentRotationRef.current = current
      setRotation(current)

      // Som de tick quando muda de fatia
      const currentSlice = getSliceAtPointer(current)
      if (currentSlice !== lastSliceRef.current && audioCtxRef.current) {
        lastSliceRef.current = currentSlice
        // Volume diminui conforme desacelera
        const vol = 0.15 + 0.2 * (1 - progress)
        playTick(audioCtxRef.current, vol)
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)
        currentRotationRef.current = current

        // Som de vitória
        if (audioCtxRef.current) {
          playWinSound(audioCtxRef.current)
        }

        // Verificar qual fatia está realmente no ponteiro (resultado real)
        const actualResult = getSliceAtPointer(current)
        if (onResult) {
          onResult(items[actualResult], actualResult)
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
