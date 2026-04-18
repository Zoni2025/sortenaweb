'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface RadarProps {
  items: string[]
  onResult?: (item: string, index: number) => void
  size?: number
  disabled?: boolean
  targetIndex?: number
  eligibleIndices?: number[]
}

// Paleta verde/ciano estilo radar
const RADAR_GREEN = '#22d3ee'
const RADAR_GREEN_DIM = 'rgba(34, 211, 238, 0.15)'
const RADAR_BG = '#0a1628'
const RADAR_GRID = 'rgba(34, 211, 238, 0.12)'
const RADAR_TEXT = 'rgba(34, 211, 238, 0.7)'
const RADAR_TEXT_HIT = '#22d3ee'
const RADAR_BEAM = 'rgba(34, 211, 238, 0.6)'
const DOT_DEFAULT = 'rgba(34, 211, 238, 0.4)'
const DOT_HIT = '#facc15'

function playTick(audioCtx: AudioContext, volume: number = 0.2) {
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 800 + Math.random() * 600
    osc.type = 'sine'
    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.04)
  } catch {}
}

function playDetectSound(audioCtx: AudioContext) {
  try {
    const notes = [880, 1100, 1320, 1760]
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const startTime = audioCtx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)
      osc.start(startTime)
      osc.stop(startTime + 0.25)
    })
  } catch {}
}

export default function Radar({ items, onResult, size = 400, disabled = false, targetIndex, eligibleIndices = [] }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const animationRef = useRef<number | null>(null)
  const beamAngleRef = useRef(-Math.PI / 2) // começa no topo
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastPassedRef = useRef(-1)
  const winnerIndexRef = useRef(-1)
  const [winnerIndex, setWinnerIndex] = useState(-1)

  const numItems = items.length
  const sliceAngle = numItems > 0 ? (2 * Math.PI) / numItems : 0

  // Ângulo de cada item (fixo, igualmente espaçados, começando do topo)
  const getItemAngle = useCallback((i: number) => {
    return -Math.PI / 2 + i * sliceAngle
  }, [sliceAngle])

  // Retorna o item mais próximo do feixe
  const getItemAtBeam = useCallback((beamAngle: number): number => {
    if (numItems === 0) return -1
    // Normalizar beamAngle para [0, 2π)
    let norm = (beamAngle + Math.PI / 2) % (2 * Math.PI)
    if (norm < 0) norm += 2 * Math.PI
    const idx = Math.floor((norm + sliceAngle / 2) / sliceAngle) % numItems
    return idx
  }, [numItems, sliceAngle])

  const drawRadar = useCallback((ctx: CanvasRenderingContext2D, beamAngle: number, highlightIdx: number) => {
    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 15
    const innerR = 30

    // Fundo
    ctx.fillStyle = RADAR_BG
    ctx.fillRect(0, 0, size, size)

    // Círculos concêntricos (grid do radar)
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath()
      ctx.arc(cx, cy, (r * ring) / 4, 0, Math.PI * 2)
      ctx.strokeStyle = RADAR_GRID
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Linhas cruzadas
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
      ctx.strokeStyle = RADAR_GRID
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Trail do feixe (rastro que se desvanece)
    const trailAngle = 0.6 // radianos de rastro
    const gradient = ctx.createConicGradient(beamAngle - trailAngle, cx, cy)
    const steps = 10
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const stop = (trailAngle * t) / (2 * Math.PI)
      const alpha = t * 0.25
      gradient.addColorStop(Math.min(stop, 0.999), `rgba(34, 211, 238, ${alpha})`)
    }
    // Resto transparente
    const trailEnd = trailAngle / (2 * Math.PI)
    gradient.addColorStop(Math.min(trailEnd + 0.001, 0.999), 'rgba(34, 211, 238, 0)')
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)')

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Linha do feixe principal
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(beamAngle) * innerR, cy + Math.sin(beamAngle) * innerR)
    ctx.lineTo(cx + Math.cos(beamAngle) * r, cy + Math.sin(beamAngle) * r)
    ctx.strokeStyle = RADAR_BEAM
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Participantes como pontos + nomes
    if (numItems > 0) {
      const dotRadius = r * 0.72
      const textRadius = r * 0.88
      const fontSize = Math.max(9, Math.min(13, 180 / numItems))

      items.forEach((item, i) => {
        const angle = getItemAngle(i)
        const dx = Math.cos(angle)
        const dy = Math.sin(angle)

        const isWinner = i === highlightIdx
        const dotR = isWinner ? 7 : 4

        // Dot (ponto no radar)
        ctx.beginPath()
        ctx.arc(cx + dx * dotRadius, cy + dy * dotRadius, dotR, 0, Math.PI * 2)

        if (isWinner) {
          // Glow para o ganhador
          ctx.shadowColor = DOT_HIT
          ctx.shadowBlur = 20
          ctx.fillStyle = DOT_HIT
        } else {
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.fillStyle = DOT_DEFAULT
        }
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0

        // Texto (nome/email)
        ctx.save()
        ctx.translate(cx + dx * textRadius, cy + dy * textRadius)

        // Rotacionar texto para ficar legível
        let textAngle = angle
        // Se o texto ficaria de cabeça para baixo, rotacionar 180°
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
          textAngle += Math.PI
          ctx.rotate(textAngle)
          ctx.textAlign = 'right'
        } else {
          ctx.rotate(textAngle)
          ctx.textAlign = 'left'
        }

        ctx.textBaseline = 'middle'
        ctx.font = `${isWinner ? 'bold ' : ''}${fontSize}px monospace`
        ctx.fillStyle = isWinner ? DOT_HIT : RADAR_TEXT

        if (isWinner) {
          ctx.shadowColor = DOT_HIT
          ctx.shadowBlur = 10
        }

        const text = item.length > 18 ? item.substring(0, 16) + '..' : item
        ctx.fillText(text, 0, 0)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.restore()
      })
    }

    // Centro do radar
    ctx.beginPath()
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = RADAR_BG
    ctx.fill()
    ctx.strokeStyle = RADAR_GREEN_DIM
    ctx.lineWidth = 2
    ctx.stroke()

    // Ponto central
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = RADAR_GREEN
    ctx.fill()

    // Borda externa
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [items, size, numItems, sliceAngle, getItemAngle])

  // Desenhar ao montar e quando items mudar
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawRadar(ctx, beamAngleRef.current, winnerIndexRef.current)
  }, [items, drawRadar])

  const spin = () => {
    if (isSpinning || disabled || numItems === 0) return

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    setIsSpinning(true)
    setWinnerIndex(-1)
    winnerIndexRef.current = -1
    lastPassedRef.current = -1

    // ===== 1. DECIDIR RESULTADO =====
    let resultIndex: number
    if (eligibleIndices && eligibleIndices.length > 0) {
      resultIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]
    } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < numItems) {
      resultIndex = targetIndex
    } else {
      resultIndex = Math.floor(Math.random() * numItems)
    }

    // ===== 2. CALCULAR ÂNGULO ALVO =====
    // O feixe deve parar no ângulo do item resultIndex
    const targetAngle = getItemAngle(resultIndex)

    // ===== 3. CALCULAR ROTAÇÃO TOTAL =====
    const extraSpins = 6 + Math.floor(Math.random() * 4) // voltas inteiras
    let finalAngle = targetAngle
    // Garantir que vai para frente (sentido horário = ângulo cresce)
    while (finalAngle <= beamAngleRef.current) finalAngle += 2 * Math.PI
    finalAngle += extraSpins * 2 * Math.PI

    // ===== 4. ANIMAR =====
    const startAngle = beamAngleRef.current
    const totalDelta = finalAngle - startAngle
    const duration = 5000 + Math.random() * 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)

      const current = startAngle + totalDelta * eased
      beamAngleRef.current = current

      // Desenhar
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) drawRadar(ctx, current, -1) // sem highlight durante animação
      }

      // Som tick ao passar por um item
      const closestItem = getItemAtBeam(current)
      if (closestItem !== lastPassedRef.current && audioCtxRef.current) {
        lastPassedRef.current = closestItem
        playTick(audioCtxRef.current, 0.1 + 0.15 * (1 - progress))
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // ===== 5. ANIMAÇÃO TERMINOU =====
        // current = startAngle + totalDelta = finalAngle
        // finalAngle difere de targetAngle por múltiplo inteiro de 2π → visualmente idêntico

        // Determinar o item visual sob o feixe
        const visualIndex = getItemAtBeam(current)
        winnerIndexRef.current = visualIndex
        setWinnerIndex(visualIndex)

        // Redesenhar com highlight no ganhador
        const canvas2 = canvasRef.current
        if (canvas2) {
          const ctx2 = canvas2.getContext('2d')
          if (ctx2) drawRadar(ctx2, current, visualIndex)
        }

        setIsSpinning(false)
        if (audioCtxRef.current) playDetectSound(audioCtxRef.current)

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
        className="max-w-full rounded-full"
        style={{ maxWidth: size, maxHeight: size }}
      />
      <button
        onClick={spin}
        disabled={isSpinning || disabled || numItems === 0}
        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25"
      >
        {isSpinning ? 'Rastreando...' : 'Iniciar Radar'}
      </button>
    </div>
  )
}
