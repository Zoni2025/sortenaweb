'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Sorteio, Participante } from '@/lib/types'
import { AlertCircle, Trophy, RotateCcw, Users, X, Sparkles } from 'lucide-react'
import Roleta from '@/components/Roleta'

interface SorteadoHistorico {
  email: string
  name: string | null
  timestamp: string
}

export default function SortearPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roletaEmails, setRoletaEmails] = useState<string[]>([])
  const [eligibleIndices, setEligibleIndices] = useState<number[]>([])
  const [ultimoSorteado, setUltimoSorteado] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [historico, setHistorico] = useState<SorteadoHistorico[]>([])
  const [sorteioKey, setSorteioKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      const { data: sorteioData } = await supabase
        .from('sorteios')
        .select('*')
        .eq('id', id)
        .single()

      if (!sorteioData) {
        setError('Sorteio não encontrado')
        setLoading(false)
        return
      }

      if (sorteioData.view_type !== 'coletivo') {
        setError('O botão Sortear é exclusivo para sorteios do tipo Coletivo.')
        setLoading(false)
        return
      }

      if (sorteioData.status !== 'active') {
        setError('Este sorteio já foi encerrado.')
        setLoading(false)
        return
      }

      setSorteio(sorteioData)

      // Carregar TODOS os aprovados para exibir na roleta
      const { data: participantesData } = await supabase
        .from('participantes')
        .select('*')
        .eq('sorteio_id', id)
        .eq('status', 'approved')

      if (participantesData && participantesData.length > 0) {
        setParticipantes(participantesData)
        setRoletaEmails(participantesData.map(p => p.email))

        // DEBUG: mostrar valores brutos de eligible
        console.log('=== DEBUG ELIGIBLE ===')
        participantesData.forEach((p, i) => {
          console.log(`[${i}] ${p.email} → eligible=${JSON.stringify(p.eligible)} (type: ${typeof p.eligible})`)
        })

        // Verificar se pelo menos um participante tem eligible === false
        // Isso indica que o usuário configurou elegibilidade manualmente
        const hasAnyIneligible = participantesData.some(p => p.eligible === false)

        let indices: number[] = []
        if (hasAnyIneligible) {
          // Modo seleção: apenas os que têm eligible === true são elegíveis
          indices = participantesData
            .map((p, i) => (p.eligible === true) ? i : -1)
            .filter(i => i !== -1)
        }
        // Se hasAnyIneligible é false, indices fica [] = modo aleatório puro

        console.log('hasAnyIneligible:', hasAnyIneligible)
        console.log('eligibleIndices:', indices)
        console.log('=== FIM DEBUG ===')

        setEligibleIndices(indices)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoletaResult(email: string) {
    setUltimoSorteado(email)
    const participante = participantes.find(p => p.email === email)
    const name = participante?.name || null
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    setHistorico(prev => [
      { email, name, timestamp },
      ...prev,
    ])

    // Salvar resultado no banco
    try {
      await supabase.from('sorteio_resultados').insert({
        sorteio_id: id,
        email,
        name,
      })
    } catch (err) {
      console.error('Erro ao salvar resultado:', err)
    }

    setTimeout(() => setShowPopup(true), 600)
  }

  function girarNovamente() {
    setShowPopup(false)
    setUltimoSorteado(null)
    setSorteioKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !sorteio) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error || 'Sorteio não encontrado'}</p>
          <button
            onClick={() => window.close()}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Título */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{sorteio.title}</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{participantes.length} participante(s)</span>
        </div>
      </div>

      {participantes.length === 0 ? (
        <div className="max-w-md text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Nenhum participante neste sorteio.</p>
            <p className="text-gray-500 text-sm">Adicione participantes na página de gestão do sorteio.</p>
          </div>
        </div>
      ) : (
        <>
          <Roleta
            key={sorteioKey}
            items={roletaEmails}
            onResult={handleRoletaResult}
            size={420}
            eligibleIndices={eligibleIndices}
          />

          {/* Histórico de Ganhadores */}
          {historico.length > 0 && (
            <div className="w-full max-w-md mt-10">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Últimos Ganhadores
              </h3>
              <div className="space-y-2">
                {historico.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-900/60 border border-gray-800/50 rounded-lg"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {historico.length - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.name || item.email}
                      </p>
                      {item.name && (
                        <p className="text-xs text-gray-500 truncate">{item.email}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 flex-shrink-0">{item.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== POPUP FULLSCREEN DE RESULTADO ========== */}
      {showPopup && ultimoSorteado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div className="relative w-full max-w-lg animate-[popIn_0.4s_ease-out]">
            <button
              onClick={girarNovamente}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-purple-500/30 rounded-3xl p-10 text-center shadow-2xl shadow-purple-500/20">
              <div className="relative mx-auto mb-8 w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                </div>
              </div>

              <div className="flex justify-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Temos um Ganhador!</h2>
              <p className="text-gray-300 text-sm mb-6">O sorteado é:</p>

              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-8">
                <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent break-all">
                  {ultimoSorteado}
                </p>
              </div>

              <button
                onClick={girarNovamente}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
              >
                <RotateCcw className="w-5 h-5" />
                Girar de Novo
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes popIn {
              0% {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
              }
              100% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
