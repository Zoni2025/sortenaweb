'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio, Premio, Participante, Ganhador } from '@/lib/types'
import {
  Copy,
  Edit,
  Trash2,
  Play,
  Lock,
  Globe,
  Calendar,
  Users,
  Gift,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'

export default function SorteioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [premios, setPremios] = useState<Premio[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [ganhadores, setGanhadores] = useState<Ganhador[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'premios' | 'participantes' | 'resultado'>('info')
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

      const { data: premiosData } = await supabase
        .from('premios')
        .select('*')
        .eq('sorteio_id', id)
        .order('created_at', { ascending: false })

      if (premiosData) setPremios(premiosData)

      const { data: participantesData } = await supabase
        .from('participantes')
        .select('*')
        .eq('sorteio_id', id)
        .order('created_at', { ascending: false })

      if (participantesData) setParticipantes(participantesData)

      const { data: ganhadoresData } = await supabase
        .from('ganhadores')
        .select('*, participante:participantes(*), premio:premios(*)')
        .eq('sorteio_id', id)
        .order('created_at', { ascending: false })

      if (ganhadoresData) setGanhadores(ganhadoresData as Ganhador[])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: 'draft' | 'active' | 'finished' | 'cancelled') {
    if (!sorteio) return

    try {
      const { error } = await supabase
        .from('sorteios')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      setSorteio({ ...sorteio, status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erro ao atualizar status')
    }
  }

  async function deleteSorteio() {
    if (!confirm('Tem certeza que deseja deletar este sorteio? Esta ação não pode ser desfeita.')) return

    try {
      const { error } = await supabase
        .from('sorteios')
        .delete()
        .eq('id', id)

      if (error) throw error
      router.push('/dashboard/sorteios')
    } catch (error) {
      console.error('Error deleting sorteio:', error)
      alert('Erro ao deletar sorteio')
    }
  }

  function copyToClipboard() {
    if (!sorteio) return
    const url = `${window.location.origin}/sorteio/${sorteio.slug}`
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
        <Link href="/dashboard/sorteios" className="text-purple-400 hover:text-purple-300 mt-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar para sorteios
        </Link>
      </div>
    )
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Rascunho', color: 'bg-gray-500/20 text-gray-400' },
    active: { label: 'Ativo', color: 'bg-green-500/20 text-green-400' },
    finished: { label: 'Finalizado', color: 'bg-blue-500/20 text-blue-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  }

  const approvedParticipants = participantes.filter(p => p.status === 'approved').length

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-800/30 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2">{sorteio.title}</h1>
            {sorteio.description && (
              <p className="text-gray-400 mb-4">{sorteio.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[sorteio.status]?.color}`}>
                {statusLabels[sorteio.status]?.label}
              </span>
              {sorteio.is_public ? (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                  <Globe className="w-3 h-3" />
                  Público
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                  <Lock className="w-3 h-3" />
                  Privado
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/dashboard/sorteios/${id}/sortear`)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
              disabled={sorteio.status !== 'active'}
              title={sorteio.status !== 'active' ? 'Sorteio deve estar ativo' : ''}
            >
              <Play className="w-4 h-4" />
              Sortear
            </button>
            <button
              onClick={deleteSorteio}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
              title="Deletar sorteio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Prêmios</span>
            <Gift className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{premios.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Participantes</span>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{approvedParticipants}</p>
          <p className="text-xs text-gray-500 mt-1">{participantes.length - approvedParticipants} pendente(s)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Ganhadores</span>
            <Check className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{ganhadores.length}</p>
        </div>
      </div>

      {/* Public Link */}
      {sorteio.is_public && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Link Público</p>
            <p className="text-sm text-gray-300 break-all">
              {typeof window !== 'undefined' && `${window.location.origin}/sorteio/${sorteio.slug}`}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all flex-shrink-0 ${
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800 mb-6">
        {(['info', 'premios', 'participantes', 'resultado'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'info' && 'Informações'}
            {tab === 'premios' && 'Prêmios'}
            {tab === 'participantes' && 'Participantes'}
            {tab === 'resultado' && 'Resultado'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Título</label>
              <p className="text-lg font-medium mt-1">{sorteio.title}</p>
            </div>
            {sorteio.description && (
              <div>
                <label className="text-sm text-gray-400">Descrição</label>
                <p className="text-gray-300 mt-1 whitespace-pre-wrap">{sorteio.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              <div>
                <label className="text-sm text-gray-400">Slug</label>
                <p className="text-gray-300 mt-1 font-mono text-sm">{sorteio.slug}</p>
              </div>
              {sorteio.draw_date && (
                <div>
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data do Sorteio
                  </label>
                  <p className="text-gray-300 mt-1">
                    {new Date(sorteio.draw_date).toLocaleString('pt-BR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )}
              {sorteio.max_participants && (
                <div>
                  <label className="text-sm text-gray-400">Máximo de Participantes</label>
                  <p className="text-gray-300 mt-1">{sorteio.max_participants}</p>
                </div>
              )}
            </div>
            <div className="pt-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => updateStatus(sorteio.status === 'draft' ? 'active' : 'draft')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
              >
                {sorteio.status === 'draft' ? 'Ativar Sorteio' : 'Voltar ao Rascunho'}
              </button>
              {sorteio.status === 'active' && (
                <button
                  onClick={() => updateStatus('finished')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                >
                  Marcar como Finalizado
                </button>
              )}
              {sorteio.status !== 'cancelled' && (
                <button
                  onClick={() => updateStatus('cancelled')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
                >
                  Cancelar Sorteio
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'premios' && (
        <div className="space-y-4">
          <Link
            href={`/dashboard/sorteios/${id}/premios`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            <Edit className="w-4 h-4" />
            Gerenciar Prêmios
          </Link>
          {premios.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Gift className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum prêmio adicionado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {premios.map((premio) => (
                <div key={premio.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{premio.name}</h3>
                      {premio.description && (
                        <p className="text-sm text-gray-400 mt-1">{premio.description}</p>
                      )}
                      <div className="flex gap-4 mt-3">
                        <span className="text-xs text-gray-500">
                          Quantidade: <span className="text-gray-300 font-medium">{premio.quantity}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          Probabilidade: <span className="text-gray-300 font-medium">{premio.win_percentage}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'participantes' && (
        <div className="space-y-4">
          <Link
            href={`/dashboard/sorteios/${id}/participantes`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            <Edit className="w-4 h-4" />
            Gerenciar Participantes
          </Link>
          {participantes.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum participante adicionado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {participantes.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{p.name || p.email}</p>
                    <p className="text-sm text-gray-400">{p.email}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      p.status === 'approved'
                        ? 'bg-green-500/20 text-green-400'
                        : p.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {p.status === 'approved' ? 'Aprovado' : p.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'resultado' && (
        <div>
          {ganhadores.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Check className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum ganhador registrado ainda</p>
              {sorteio.status === 'active' && (
                <button
                  onClick={() => router.push(`/dashboard/sorteios/${id}/sortear`)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Realizar Sorteio
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {ganhadores.map((ganhador) => (
                <div key={ganhador.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{ganhador.participante?.name || ganhador.participante?.email}</h3>
                        {ganhador.revealed ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">Prêmio: {ganhador.premio?.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(ganhador.created_at).toLocaleString('pt-BR', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
