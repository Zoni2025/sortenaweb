'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio } from '@/lib/types'
import { Plus, Search, ArrowRight, Trash2, Copy, CircleDot, Radar, User, Users } from 'lucide-react'

export default function SorteiosPage() {
  const [sorteios, setSorteios] = useState<Sorteio[]>([])
  const [filteredSorteios, setFilteredSorteios] = useState<Sorteio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadSorteios()
  }, [])

  useEffect(() => {
    let filtered = sorteios

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    setFilteredSorteios(filtered)
  }, [searchTerm, statusFilter, sorteios])

  async function loadSorteios() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sorteios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSorteios(data || [])
    } catch (error) {
      console.error('Error loading sorteios:', error)
    } finally {
      setLoading(false)
    }
  }

  async function duplicarSorteio(sorteio: Sorteio) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Gerar slug único
      const baseSlug = sorteio.slug.replace(/-[a-z0-9]+$/, '')
      const uniqueSlug = baseSlug + '-copia-' + Date.now().toString(36)

      // Criar cópia do sorteio
      const { data: newSorteio, error: insertError } = await supabase
        .from('sorteios')
        .insert({
          user_id: user.id,
          title: sorteio.title + ' (Cópia)',
          description: sorteio.description,
          slug: uniqueSlug,
          status: 'active',
          draw_type: sorteio.draw_type || 'roleta',
          view_type: sorteio.view_type || 'individual',
          draw_date: new Date().toISOString(),
          max_participants: sorteio.max_participants,
          is_public: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Duplicar prêmios do sorteio original
      if (newSorteio) {
        const { data: premios } = await supabase
          .from('premios')
          .select('*')
          .eq('sorteio_id', sorteio.id)

        if (premios && premios.length > 0) {
          const newPremios = premios.map(p => ({
            sorteio_id: newSorteio.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            quantity: p.quantity,
            win_percentage: p.win_percentage,
          }))

          await supabase.from('premios').insert(newPremios)
        }

        // Recarregar lista
        await loadSorteios()
      }
    } catch (error) {
      console.error('Error duplicating sorteio:', error)
      alert('Erro ao duplicar sorteio')
    }
  }

  async function deleteSorteio(id: string) {
    if (!confirm('Tem certeza que deseja deletar este sorteio?')) return

    try {
      const { error } = await supabase
        .from('sorteios')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSorteios(sorteios.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting sorteio:', error)
      alert('Erro ao deletar sorteio')
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'bg-green-500/20 text-green-400' },
    finished: { label: 'Encerrado', color: 'bg-gray-500/20 text-gray-400' },
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sorteios</h1>
          <p className="text-gray-400 mt-1">Gerencie todos os seus sorteios</p>
        </div>
        <Link
          href="/dashboard/sorteios/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Sorteio
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar sorteios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="finished">Encerrado</option>
          </select>
        </div>
      </div>

      {/* Sorteios List */}
      {filteredSorteios.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">
            {sorteios.length === 0 ? 'Você ainda não criou nenhum sorteio' : 'Nenhum sorteio encontrado'}
          </p>
          {sorteios.length === 0 && (
            <Link
              href="/dashboard/sorteios/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 rounded-lg font-medium hover:bg-purple-500 transition-all"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Sorteio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSorteios.map((sorteio) => (
            <div
              key={sorteio.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/dashboard/sorteios/${sorteio.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-lg truncate hover:text-purple-400 transition-colors">
                    {sorteio.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {sorteio.description || 'Sem descrição'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[sorteio.status]?.color}`}>
                      {statusLabels[sorteio.status]?.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      sorteio.draw_type === 'radar'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {sorteio.draw_type === 'radar' ? <Radar className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                      {sorteio.draw_type === 'radar' ? 'Radar' : 'Roleta'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      sorteio.view_type === 'coletivo'
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {sorteio.view_type === 'coletivo' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {sorteio.view_type === 'coletivo' ? 'Coletivo' : 'Individual'}
                    </span>
                    {sorteio.draw_date && (
                      <span className="text-xs text-gray-500">
                        {new Date(sorteio.draw_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/sorteios/${sorteio.id}`}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    title="Detalhes"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => duplicarSorteio(sorteio)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-purple-900/50 text-gray-400 hover:text-purple-400 transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSorteio(sorteio.id)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
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

      {/* Count Info */}
      {filteredSorteios.length > 0 && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          {filteredSorteios.length} de {sorteios.length} sorteio(s) exibido(s)
        </div>
      )}
    </div>
  )
}
