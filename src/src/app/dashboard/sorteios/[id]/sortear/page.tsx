'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio, Participante, Premio, Ganhador } from '@/lib/types'
import { Play, ArrowLeft, AlertCircle, Trophy, Sparkles, Copy, Check } from 'lucide-react'

export default function SortearPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [premios, setPremios] = useState<Premio[]>([])
  const [ganhadores, setGanhadores] = useState<Ganhador[]>([])
  const [loading, setLoading] = useState(true)
  const [performing, setPerforming] = useState(false)
  const [drawPerformed, setDrawPerformed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

      if (sorteioData) setSorteio(sorteioData)

      const { data: participantesData } = await supabase
        .from('participantes')
        .select('*')
        .eq('sorteio_id', id)
        .eq('status', 'approved')

      if (participantesData) setParticipantes(participantesData)

      const { data: premiosData } = await supabase
        .from('premios')
        .select('*')
        .eq('sorteio_id', id)

      if (premiosData) setPremios(premiosData)

      const { data: ganhadoresData } = await supabase
        .from('ganhadores')
        .select('*, participante:participantes(*), premio:premios(*)')
        .eq('sorteio_id', id)

      if (ganhadoresData) {
        setGanhadores(ganhadoresData as Ganhador[])
        setDrawPerformed(ganhadoresData.length > 0)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function performDraw() {
    if (!sorteio) return

    if (participantes.length === 0) {
      setError('É necessário ter pelo menos 1 participante aprovado')
      return
    }

    if (premios.length === 0) {
      setError('É necessário ter pelo menos 1 prêmio')
      return
    }

    if (!confirm('Tem certeza que deseja realizar o sorteio? Esta ação não pode ser desfeita.')) return

    setPerforming(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('perform_draw', {
        p_sorteio_id: id,
      })

      if (rpcError) throw rpcError

      // Reload winners
      const { data: ganhadoresData } = await supabase
        .from('ganhadores')
        .select('*, participante:participantes(*), premio:premios(*)')
        .eq('sorteio_id', id)

      if (ganhadoresData) {
        setGanhadores(ganhadoresData as Ganhador[])
        setDrawPerformed(true)
      }

      // Update sorteio status to finished
      await supabase
        .from('sorteios')
        .update({ status: 'finished' })
        .eq('id', id)

      if (sorteio) setSorteio({ ...sorteio, status: 'finished' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar sorteio'
      setError(message)
      console.error('Error performing draw:', err)
    } finally {
      setPerforming(false)
    }
  }

  function copyResultLink() {
    const url = `${window.location.origin}/sorteio/${sorteio?.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!sorteio) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Sorteio não encontrado</p>
      </div>
    )
  }

  const approvedParticipants = participantes.length

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-3xl font-bold mb-2">{drawPerformed ? 'Resultados do Sorteio' : 'Realizar Sorteio'}</h1>
      <p className="text-gray-400 mb-6">
        {drawPerformed ? 'Veja os ganhadores do sorteio' : 'Resumo antes de realizar o sorteio'}
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!drawPerformed ? (
        // Before Draw
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Participantes Aprovados</p>
                <p className="text-4xl font-bold text-green-400">{approvedParticipants}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Prêmios Disponíveis</p>
                <p className="text-4xl font-bold text-pink-400">{premios.length}</p>
              </div>
            </div>

            {/* Warnings */}
            {approvedParticipants === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium mb-1">Nenhum participante aprovado</p>
                  <p className="text-yellow-400/80 text-sm">
                    Você precisa aprovar participantes antes de realizar o sorteio
                  </p>
                </div>
              </div>
            )}

            {premios.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium mb-1">Nenhum prêmio adicionado</p>
                  <p className="text-yellow-400/80 text-sm">
                    Você precisa adicionar prêmios antes de realizar o sorteio
                  </p>
                </div>
              </div>
            )}

            {/* Participantes Preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Participantes que concorrem</h2>
              {participantes.length === 0 ? (
                <p className="text-gray-400">Nenhum participante aprovado</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participantes.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm">{p.name || p.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Premios Preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Prêmios em disputa</h2>
              {premios.length === 0 ? (
                <p className="text-gray-400">Nenhum prêmio disponível</p>
              ) : (
                <div className="space-y-3">
                  {premios.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm text-gray-400">
                        {p.quantity}x • {p.win_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/30 rounded-xl p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Pronto para Sortear?
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  {approvedParticipants > 0 ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Participantes: {approvedParticipants}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>Nenhum participante</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {premios.length > 0 ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Prêmios: {premios.length}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>Nenhum prêmio</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={performDraw}
                disabled={performing || approvedParticipants === 0 || premios.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {performing ? 'Realizando...' : 'Realizar Sorteio'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Ação irreversível. Tenha certeza que tudo está correto.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // After Draw
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-bold">Sorteio Realizado com Sucesso!</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {ganhadores.length} ganhador{ganhadores.length !== 1 ? 'es' : ''} definido{ganhadores.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {sorteio.is_public && (
                <button
                  onClick={copyResultLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all flex-shrink-0 ${
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
              )}
            </div>
          </div>

          {/* Winners Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Ganhadores</h2>
            {ganhadores.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum ganhador registrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ganhadores.map((ganhador, idx) => (
                  <div
                    key={ganhador.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors group"
                    style={{
                      animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`,
                    }}
                  >
                    <style>{`
                      @keyframes slideIn {
                        from {
                          opacity: 0;
                          transform: translateY(20px);
                        }
                        to {
                          opacity: 1;
                          transform: translateY(0);
                        }
                      }
                    `}</style>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-purple-400">#{idx + 1}</span>
                          <Trophy className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h3 className="text-lg font-bold mt-2 group-hover:text-purple-400 transition-colors">
                          {ganhador.participante?.name || ganhador.participante?.email}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{ganhador.participante?.email}</p>
                      </div>
                      {ganhador.revealed ? (
                        <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 flex-shrink-0" />
                      )}
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Prêmio</p>
                      <p className="font-semibold text-pink-400">{ganhador.premio?.name}</p>
                      {ganhador.premio?.description && (
                        <p className="text-xs text-gray-500 mt-1">{ganhador.premio.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share Section */}
          {sorteio.is_public && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Compartilhar Resultados</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 break-all">
                  {typeof window !== 'undefined' && `${window.location.origin}/sorteio/${sorteio.slug}`}
                </div>
                <button
                  onClick={copyResultLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all flex-shrink-0 ${
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link
              href={`/dashboard/sorteios/${id}`}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-center transition-colors"
            >
              Ver Detalhes do Sorteio
            </Link>
            <Link
              href="/dashboard/sorteios"
              className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-center transition-colors"
            >
              Voltar para Sorteios
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
