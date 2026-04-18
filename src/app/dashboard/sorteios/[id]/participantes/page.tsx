'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Participante } from '@/lib/types'
import { Plus, Trash2, ArrowLeft, AlertCircle, Upload, Send, User } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TELEGRAM_REGEX = /^@[a-zA-Z0-9_]{4,}$/
const NAME_REGEX = /^[^\s].{1,}$/ // pelo menos 2 caracteres, não começa com espaço

function isValidContact(value: string): boolean {
  return EMAIL_REGEX.test(value) || TELEGRAM_REGEX.test(value) || NAME_REGEX.test(value)
}

function getContactType(value: string): 'email' | 'telegram' | 'name' {
  if (EMAIL_REGEX.test(value)) return 'email'
  if (TELEGRAM_REGEX.test(value)) return 'telegram'
  return 'name'
}

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

    const contact = formData.email.trim()

    if (!contact) {
      setError('Informe um nome, email ou Telegram')
      return
    }

    if (!isValidContact(contact)) {
      setError('Informe um nome (mín. 2 caracteres), email válido ou Telegram com @ (ex: @usuario)')
      return
    }

    setSubmitting(true)

    try {
      const type = getContactType(contact)
      // Se for nome, salvar no campo name e email. Se for email/telegram, salvar normalmente.
      const emailValue = type === 'name' ? contact.trim() : contact.toLowerCase()
      const nameValue = type === 'name'
        ? contact.trim()
        : (formData.name.trim() || null)

      const { data, error: insertError } = await supabase
        .from('participantes')
        .insert({
          sorteio_id: id,
          email: emailValue,
          name: nameValue,
          phone: formData.phone.trim() || null,
          status: 'approved',
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
      setError('Adicione pelo menos um email ou telegram')
      return
    }

    const contacts = bulkEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && isValidContact(e))

    if (contacts.length === 0) {
      setError('Nenhum nome, email ou telegram válido encontrado')
      return
    }

    setSubmitting(true)

    try {
      const participantesData = contacts.map(contact => {
        const type = getContactType(contact)
        const emailValue = type === 'name' ? contact.trim() : contact.toLowerCase()
        const nameValue = type === 'name' ? contact.trim() : null
        return {
          sorteio_id: id,
          email: emailValue,
          name: nameValue,
          phone: null,
          status: 'approved',
        }
      })

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

  async function deleteParticipante(participanteId: string) {
    if (!confirm('Tem certeza que deseja remover este participante?')) return

    try {
      const { error: deleteError } = await supabase
        .from('participantes')
        .delete()
        .eq('id', participanteId)

      if (deleteError) throw deleteError
      setParticipantes(participantes.filter(p => p.id !== participanteId))
    } catch (err) {
      console.error('Error deleting participante:', err)
      alert('Erro ao remover participante')
    }
  }

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
      <p className="text-gray-400 mb-6">Adicione participantes ao sorteio</p>

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
                    Nome, Email ou Telegram <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="text"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="João Silva, email@example.com ou @telegram"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    Nome (mín. 2 caracteres), email ou Telegram com @ (ex: @yagobgc)
                  </p>
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
                    Participantes <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="bulk_emails"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="Um por linha&#10;João Silva&#10;joao@email.com&#10;@yagobgc&#10;Maria Santos&#10;@pedro_123"
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Aceita nomes, emails e Telegram (@usuario) misturados</p>
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400">Total de participantes: <span className="text-white font-bold text-lg">{participantes.length}</span></p>
          </div>

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
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {p.email.startsWith('@') ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0" title="Telegram">
                          <Send className="w-4 h-4 text-blue-400" />
                        </div>
                      ) : EMAIL_REGEX.test(p.email) ? (
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0" title="Email">
                          <span className="text-purple-400 text-xs font-bold">@</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0" title="Nome">
                          <User className="w-4 h-4 text-green-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name || p.email}</p>
                        {p.name && <p className="text-sm text-gray-400 truncate">{p.email}</p>}
                        {p.phone && (
                          <p className="text-sm text-gray-500">{p.phone}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteParticipante(p.id)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
