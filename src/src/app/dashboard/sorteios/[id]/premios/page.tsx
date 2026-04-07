'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Premio } from '@/lib/types'
import { Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react'

export default function PremiosPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [premios, setPremios] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    win_percentage: '',
    quantity: '',
  })

  useEffect(() => {
    loadPremios()
  }, [id])

  async function loadPremios() {
    try {
      const { data, error: err } = await supabase
        .from('premios')
        .select('*')
        .eq('sorteio_id', id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setPremios(data || [])
    } catch (err) {
      console.error('Error loading premios:', err)
      setError('Erro ao carregar prêmios')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Nome do prêmio é obrigatório')
      return
    }

    if (!formData.win_percentage || isNaN(Number(formData.win_percentage)) || Number(formData.win_percentage) < 0 || Number(formData.win_percentage) > 100) {
      setError('Probabilidade deve estar entre 0 e 100')
      return
    }

    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 1) {
      setError('Quantidade deve ser no mínimo 1')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: insertError } = await supabase
        .from('premios')
        .insert({
          sorteio_id: id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          win_percentage: Number(formData.win_percentage),
          quantity: Number(formData.quantity),
        })
        .select()

      if (insertError) throw insertError

      if (data) {
        setPremios([...premios, ...data])
        setFormData({ name: '', description: '', win_percentage: '', quantity: '' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar prêmio'
      setError(message)
      console.error('Error creating premio:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function deletePremio(premioId: string) {
    if (!confirm('Tem certeza que deseja deletar este prêmio?')) return

    try {
      const { error: deleteError } = await supabase
        .from('premios')
        .delete()
        .eq('id', premioId)

      if (deleteError) throw deleteError
      setPremios(premios.filter(p => p.id !== premioId))
    } catch (err) {
      console.error('Error deleting premio:', err)
      alert('Erro ao deletar prêmio')
    }
  }

  const totalWinPercentage = premios.reduce((sum, p) => sum + p.win_percentage, 0)
  const totalItems = premios.reduce((sum, p) => sum + p.quantity, 0)

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

      <h1 className="text-3xl font-bold mb-1">Gerenciar Prêmios</h1>
      <p className="text-gray-400 mb-6">Adicione e gerencie os prêmios do sorteio</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Prêmio
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: iPhone 15"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do prêmio"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
                />
              </div>

              <div>
                <label htmlFor="win_percentage" className="block text-sm font-medium mb-1">
                  Probabilidade (%) <span className="text-red-400">*</span>
                </label>
                <input
                  id="win_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.win_percentage}
                  onChange={(e) => setFormData({ ...formData, win_percentage: e.target.value })}
                  placeholder="0-100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                  Quantidade <span className="text-red-400">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Quantidade disponível"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adicionando...' : 'Adicionar Prêmio'}
              </button>
            </form>
          </div>
        </div>

        {/* Premios List */}
        <div className="lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Total de Itens</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
            <div className={`rounded-xl p-4 border ${totalWinPercentage === 100 ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-900 border-gray-800'}`}>
              <p className={`text-sm mb-1 ${totalWinPercentage === 100 ? 'text-green-400' : 'text-gray-400'}`}>
                Probabilidade Total
              </p>
              <p className={`text-2xl font-bold ${totalWinPercentage === 100 ? 'text-green-400' : ''}`}>
                {totalWinPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Premios */}
          {premios.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">Nenhum prêmio adicionado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {premios.map((premio) => (
                <div key={premio.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1">{premio.name}</h3>
                      {premio.description && (
                        <p className="text-sm text-gray-400 mb-3">{premio.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <span className="text-xs text-gray-500">Quantidade</span>
                          <p className="font-medium">{premio.quantity}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Probabilidade</span>
                          <p className="font-medium">{premio.win_percentage}%</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePremio(premio.id)}
                      className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                      title="Deletar prêmio"
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
