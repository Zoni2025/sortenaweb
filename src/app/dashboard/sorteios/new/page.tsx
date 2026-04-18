'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AlertCircle, CircleDot, User, Users, Calendar } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function getDataBrasilia(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export default function NewSorteioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    draw_type: 'roleta' as 'roleta',
    view_type: 'individual' as 'individual' | 'coletivo',
    max_participants: '',
  })
  const [generatedSlug, setGeneratedSlug] = useState('')

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })
    if (value.trim()) {
      setGeneratedSlug(slugify(value))
    } else {
      setGeneratedSlug('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Título é obrigatório')
      return
    }

    if (!generatedSlug) {
      setError('Slug inválido')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Você precisa estar autenticado')
        return
      }

      const uniqueSlug = generatedSlug + '-' + Date.now().toString(36)

      // Data de criação em horário de Brasília (UTC-3)
      const now = new Date()
      const brasiliaOffset = -3 * 60
      const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000)

      const { data, error: insertError } = await supabase
        .from('sorteios')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          slug: uniqueSlug,
          status: 'draft',
          draw_type: formData.draw_type,
          view_type: formData.view_type,
          draw_date: brasiliaTime.toISOString(),
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          is_public: true,
        })
        .select()

      if (insertError) throw insertError

      if (data && data[0]) {
        router.push('/dashboard/sorteios')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar sorteio'
      setError(message)
      console.error('Error creating sorteio:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Novo Sorteio</h1>
        <p className="text-gray-400 mt-1">Crie um novo sorteio preenchendo os dados abaixo</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="ex: Sorteio de Smartphones"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Slug Preview */}
            {generatedSlug && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  URL do Sorteio (Automático)
                </label>
                <div className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 break-all">
                  /sorteio/{generatedSlug}
                </div>
              </div>
            )}

            {/* Data de Criação (automática) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Data de Criação
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{getDataBrasilia()}</span>
                <span className="text-gray-500 text-xs">(Horário de Brasília — preenchido automaticamente)</span>
              </div>
            </div>

            {/* Tipo de Sorteio (Animação) */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Tipo de Sorteio <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, draw_type: 'roleta' })}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    formData.draw_type === 'roleta'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    formData.draw_type === 'roleta'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    <CircleDot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Roleta</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Animação de roleta girando para revelar o resultado</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Tipo de Visualização */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Tipo de Visualização <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, view_type: 'individual' })}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center ${
                    formData.view_type === 'individual'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    formData.view_type === 'individual'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Individual</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Cada participante acessa o link, insere seu e-mail e descobre seu prêmio com a animação da roleta. Visualização única.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, view_type: 'coletivo' })}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center ${
                    formData.view_type === 'coletivo'
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    formData.view_type === 'coletivo'
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Coletivo</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      O administrador acessa o link e a roleta gira com os e-mails dos participantes, revelando o ganhador. Pode sortear várias vezes.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o sorteio, regras, etc."
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium mb-2">
                Número Máximo de Participantes
              </label>
              <input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                placeholder="Deixe em branco para sem limite"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Sorteio'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-gray-800 border border-gray-700 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
