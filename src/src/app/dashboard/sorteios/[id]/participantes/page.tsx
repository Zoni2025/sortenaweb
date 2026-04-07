'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Participante } from '@/lib/types'
import { Plus, Trash2, Check, X, ArrowLeft, AlertCircle, Upload } from 'lucide-react'

export default function ParticipantesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
  })
  const [bulkEmails, setBulkEmails] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')

  useEffect(() => {
    loadParticipantes()
  }, [id])

  async function loadParticipantes() {
    try {
      const { data, error: err } = await supabase
        .from('participantes')
        .select('*')
        .eq('sorteio_id', id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setParticipantes(data || [])
    } catch (err) {
      console.error('Error loading participantes:', err)
      setError('Erro ao carregar participantes')
    } finally {
      setLoading(false)
    }
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.email.trim()) {
      setError('Email é obrigatório')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: insertError } = await supabase
        .from('participantes')
        .insert({
          sorteio_id: id,
          email: formData.email.trim().toLowerCase(),
          name: formData.name.trim() || null,
          phone: formData.phone.trim() || null,
          status: 'pending',
        })
        .select()

      if (insertError) throw insertError

      if (data) {
        setParticipantes([...data, ...participantes])
        setFormData({ email: '', name: '', phone: '' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar participante'
      setError(message)
      console.error('Error adding participante:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!bulkEmails.trim()) {
      setError('Adicione pelo menos um email')
      return
    }

    const emails = bulkEmails
      .split('\n')
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

    if (emails.length === 0) {
      setError('Nenhum email válido encontrado')
      return
    }

    setSubmitting(true)

    try {
      const participantesData = emails.map(email => ({
        sorteio_id: id,
        email,
        name: null,
        phone: null,
        status: 'pending',
      }))

      const { data, error: insertError } = await supabase
        .from('participantes')
        .insert(participantesData)
        .select()

      if (insertError) throw insertError

      if (data) {
        setParticipantes([...data, ...participantes])
        setBulkEmails('')
        setAddMode('single')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar participantes'
      setError(message)
      console.error('Error adding participantes:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateParticipantStatus(participanteId: string, newStatus: 'pending' | 'approved' | 'rejected') {
    try {
      const { error: updateError } = await supabase
        .from('participantes')
        .update({ status: newStatus })
        .eq('id', participanteId)

      if (updateError) throw updateError
      setParticipantes(participantes.map(p =>
        p.id === participanteId ? { ...p, status: newStatus } : p
      ))
    } catch (err) {
      console.error('Error updating participante:', err)
      alert('Erro ao atualizar participante')
    }
  }

  async function approveAll() {
    if (!confirm(`Tem certeza que deseja aprovar ${participantes.filter(p => p.status === 'pending').length} participante(s)?`)) return

    const pendingIds = participantes.filter(p => p.status === 'pending').map(p => p.id)

    try {
      const { error: updateError } = await supabase
        .from('participantes')
        .update({ status: 'approved' })
        .in('id', pendingIds)

      if (updateError) throw updateError
      setParticipantes(participantes.map(p =>
        pendingIds.includes(p.id) ? { ...p, status: 'approved' } : p
      ))
    } catch (err) {
      console.error('Error approving all:', err)
      alert('Erro ao aprovar participantes')
    }
  }

  async function deleteParticipante(participanteId: string) {
    if (!confirm('Tem certeza que deseja deletar este participante?')) return

    try {
      const { error: deleteError } = await supabase
        .from('participantes')
        .delete()
        .eq('id', participanteId)

      if (deleteError) throw deleteError
      setParticipantes(participantes.filter(p => p.id !== participanteId))
    } catch (err) {
      console.error('Error deleting participante:', err)
      alert('Erro ao deletar participante')
    }
  }

  const pendingCount = participantes.filter(p => p.status === 'pending').length
  const approvedCount = participantes.filter(p => p.status === 'approved').length
  const rejectedCount = participantes.filter(p => p.status === 'rejected').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
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

      <h1 className="text-3xl font-bold mb-1">Gerenciar Participantes</h1>
      <p className="text-gray-400 mb-6">Adicione e aprove participantes para o sorteio</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Participante
            </h2>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-800">
              <button
                onClick={() => setAddMode('single')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  addMode === 'single'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Um por Um
              </button>
              <button
                onClick={() => setAddMode('bulk')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  addMode === 'bulk'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Em Massa
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {addMode === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Nome
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo (opcional)"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    Telefone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Telefone (opcional)"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar Participante'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div>
                  <label htmlFor="bulk_emails" className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Emails <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="bulk_emails"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="Um email por linha&#10;joao@email.com&#10;maria@email.com&#10;pedro@email.com"
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar Participantes'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Participantes List */}
        <div className="lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold">{participantes.length}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-sm text-green-400 mb-1">Aprovados</p>
              <p className="text-2xl font-bold text-green-400">{approvedCount}</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-sm text-yellow-400 mb-1">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
          </div>

          {/* Approve All */}
          {pendingCount > 0 && (
            <button
              onClick={approveAll}
              className="mb-4 w-full px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              Aprovar Todos ({pendingCount})
            </button>
          )}

          {/* Participantes */}
          {participantes.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">Nenhum participante adicionado ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participantes.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name || p.email}</p>
                      <p className="text-sm text-gray-400 truncate">{p.email}</p>
                      {p.phone && (
                        <p className="text-sm text-gray-500">{p.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => updateParticipantStatus(p.id, 'approved')}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                            title="Aprovar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateParticipantStatus(p.id, 'rejected')}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="Rejeitar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.status === 'approved'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {p.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      )}
                      <button
                        onClick={() => deleteParticipante(p.id)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
