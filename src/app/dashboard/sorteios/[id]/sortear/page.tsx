'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio, Participante, Premio } from '@/lib/types'
import { ArrowLeft, AlertCircle, Trophy, RotateCcw, Users } from 'lucide-react'
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

  // Roleta states
  const [roletaEmails, setRoletaEmails] = useState<string[]>([])
  const [ultimoSorteado, setUltimoSorteado] = useState<string | null>(null)
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

      const { data: participantesData } = await supabase
        .from('participantes')
        .select('*')
        .eq('sorteio_id', id)
        .eq('status', 'approved')

      if (participantesData && participantesData.length > 0) {
        setParticipantes(participantesData)
        setRoletaEmails(participantesData.map(p => p.email))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function handleRoletaResult(email: string) {
    setUltimoSorteado(email)
    const participante = participantes.find(p => p.email === email)
    setHistorico(prev => [
      {
        email,
        name: participante?.name || null,
        timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      },
      ...prev,
    ])
  }

  function resetarRoleta() {
    setUltimoSorteado(null)
    setSorteioKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !sorteio) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">{error || 'Sorteio não encontrado'}</p>
        <button
          onClick={() => router.back()}
          className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Título */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{sorteio.title}</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{participantes.length} participante(s) na roleta</span>
        </div>
      </div>

      {participantes.length === 0 ? (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Nenhum participante aprovado neste sorteio.</p>
            <Link
              href={`/dashboard/sorteios/${id}/participantes`}
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
            >
              Gerenciar Participantes
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Roleta */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <Roleta
              key={sorteioKey}
              items={roletaEmails}
              onResult={handleRoletaResult}
              size={400}
            />

            {/* Resultado */}
            {ultimoSorteado && (
              <div className="mt-8 w-full max-w-md">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
                  <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">Sorteado:</h3>
                  <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {ultimoSorteado}
                  </p>
                </div>

                <button
                  onClick={resetarRoleta}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Girar Novamente
                </button>
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Histórico de Sorteados
              </h3>

              {historico.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Gire a roleta para começar!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {historico.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {historico.length - idx}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{item.email}</p>
                        <p className="text-xs text-gray-500">{item.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
