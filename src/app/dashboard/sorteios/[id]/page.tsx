'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio, Premio, Participante, Ganhador, SorteioResultado } from '@/lib/types'
import {
  Copy,
  Edit,
  Trash2,
  Play,
  Calendar,
  Users,
  Gift,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  CircleDot,
  User,
  XCircle,
  Link as LinkIcon,
  Trophy,
  Clock,
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
  const [sorteioResultados, setSorteioResultados] = useState<SorteioResultado[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'premios' | 'participantes' | 'resultado'>('info')
  const [copied, setCopied] = useState(false)

  // Edição inline
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

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

      // Carregar resultados do sorteio coletivo
      const { data: resultadosData } = await supabase
        .from('sorteio_resultados')
        .select('*')
        .eq('sorteio_id', id)
        .order('drawn_at', { ascending: false })

      if (resultadosData) setSorteioResultados(resultadosData as SorteioResultado[])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function encerrarSorteio() {
    if (!sorteio) return
    if (!confirm('Tem certeza que deseja encerrar este sorteio? Esta ação não pode ser desfeita.')) return

    try {
      const { error } = await supabase
        .from('sorteios')
        .update({ status: 'finished' })
        .eq('id', id)

      if (error) throw error
      setSorteio({ ...sorteio, status: 'finished' })
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erro ao encerrar sorteio')
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

  function startEditing() {
    if (!sorteio) return
    setEditTitle(sorteio.title)
    setEditDescription(sorteio.description || '')
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
  }

  async function saveEditing() {
    if (!sorteio) return
    if (!editTitle.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('sorteios')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        })
        .eq('id', id)

      if (error) throw error
      setSorteio({
        ...sorteio,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating sorteio:', error)
      alert('Erro ao salvar alterações')
    } finally {
      setSaving(false)
    }
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

  const isColetivo = sorteio.view_type === 'coletivo'
  const isIndividual = sorteio.view_type === 'individual'
  const isAtivo = sorteio.status === 'active'
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
              {/* Status */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                isAtivo ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {isAtivo ? 'Ativo' : 'Encerrado'}
              </span>
              {/* Tipo de sorteio */}
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                <CircleDot className="w-3 h-3" />
                Roleta
              </span>
              {/* Tipo de visualização */}
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                isColetivo ? 'bg-pink-500/20 text-pink-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {isColetivo ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {isColetivo ? 'Coletivo' : 'Individual'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {/* Botão Sortear — APENAS para Coletivo e Ativo */}
            {isColetivo && isAtivo && (
              <button
                onClick={() => window.open(`/dashboard/sorteios/${id}/sortear`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                <Play className="w-4 h-4" />
                Sortear
              </button>
            )}
            {/* Botão Encerrar — Apenas se ativo */}
            {isAtivo && (
              <button
                onClick={encerrarSorteio}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                title="Encerrar sorteio"
              >
                <XCircle className="w-4 h-4" />
                Encerrar
              </button>
            )}
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
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{isColetivo ? sorteioResultados.length : ganhadores.length}</p>
        </div>
      </div>

      {/* Link do Sorteio — APENAS para Individual */}
      {isIndividual && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="w-4 h-4 text-purple-400" />
              <p className="text-sm text-gray-400">Link do Sorteio (Individual)</p>
            </div>
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
            {isEditing ? (
              /* ===== MODO EDIÇÃO ===== */
              <>
                <div>
                  <label htmlFor="edit-title" className="block text-sm text-gray-400 mb-1">Título</label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-sm text-gray-400 mb-1">Descrição</label>
                  <textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    placeholder="Descrição do sorteio (opcional)"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveEditing}
                    disabled={saving || !editTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* ===== MODO LEITURA ===== */
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Título</label>
                    <p className="text-lg font-medium mt-1">{sorteio.title}</p>
                  </div>
                  {isAtivo && (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex-shrink-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  )}
                </div>
                {sorteio.description && (
                  <div>
                    <label className="text-sm text-gray-400">Descrição</label>
                    <p className="text-gray-300 mt-1 whitespace-pre-wrap">{sorteio.description}</p>
                  </div>
                )}
                {!sorteio.description && isAtivo && (
                  <div>
                    <label className="text-sm text-gray-400">Descrição</label>
                    <p className="text-gray-500 mt-1 text-sm italic">Nenhuma descrição adicionada</p>
                  </div>
                )}
              </>
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
                    Data de Criação
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
              <div>
                <label className="text-sm text-gray-400">Tipo de Visualização</label>
                <p className="text-gray-300 mt-1">{isColetivo ? 'Coletivo' : 'Individual'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Tipo de Sorteio</label>
                <p className="text-gray-300 mt-1">Roleta</p>
              </div>
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
          {isColetivo ? (
            /* ===== RESULTADO COLETIVO ===== */
            sorteioResultados.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum sorteio realizado ainda</p>
                {isAtivo && (
                  <button
                    onClick={() => window.open(`/dashboard/sorteios/${id}/sortear`, '_blank')}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Realizar Sorteio
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isAtivo && (
                  <button
                    onClick={() => window.open(`/dashboard/sorteios/${id}/sortear`, '_blank')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Sortear Novamente
                  </button>
                )}

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-800/50 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Ganhador</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-3">Data / Hora</div>
                  </div>

                  {/* Linhas */}
                  {sorteioResultados.map((resultado, idx) => (
                    <div
                      key={resultado.id}
                      className={`grid grid-cols-12 gap-4 px-5 py-4 items-center ${
                        idx !== sorteioResultados.length - 1 ? 'border-b border-gray-800/50' : ''
                      } hover:bg-gray-800/30 transition-colors`}
                    >
                      <div className="col-span-1">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                          {sorteioResultados.length - idx}
                        </div>
                      </div>
                      <div className="col-span-5 min-w-0">
                        <p className="font-medium text-white truncate">
                          {resultado.name || resultado.email}
                        </p>
                        {resultado.name && (
                          <p className="text-xs text-gray-500 truncate">{resultado.email}</p>
                        )}
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm text-gray-400 truncate">{resultado.email}</p>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {new Date(resultado.drawn_at).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                              timeZone: 'America/Sao_Paulo',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-600 text-center mt-2">
                  Total: {sorteioResultados.length} sorteio(s) realizado(s)
                </p>
              </div>
            )
          ) : (
            /* ===== RESULTADO INDIVIDUAL ===== */
            ganhadores.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Check className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum ganhador registrado ainda</p>
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
            )
          )}
        </div>
      )}
    </div>
  )
}
