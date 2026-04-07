'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewSorteioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    draw_date: '',
    max_participants: '',
    is_public: false,
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

      const { data, error: insertError } = await supabase
        .from('sorteios')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          slug: generatedSlug,
          status: 'draft',
          draw_date: formData.draw_date || null,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          is_public: formData.is_public,
        })
        .select()

      if (insertError) throw insertError

      if (data && data[0]) {
        router.push(`/dashboard/sorteios/${data[0].id}`)
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

            {/* Draw Date */}
            <div>
              <label htmlFor="draw_date" className="block text-sm font-medium mb-2">
                Data do Sorteio
              </label>
              <input
                id="draw_date"
                type="datetime-local"
                value={formData.draw_date}
                onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
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

            {/* Is Public Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="is_public"
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-5 h-5 rounded border-gray-700 text-purple-600 bg-gray-800 cursor-pointer focus:ring-purple-500"
              />
              <label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                Sorteio Público (pessoas podem se inscrever sem convite)
              </label>
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
