'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Sorteio } from '@/lib/types'
import { Trophy, Users, Gift, Plus, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const [sorteios, setSorteios] = useState<Sorteio[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, finished: 0, participants: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar sorteios
      const { data: sorteiosData } = await supabase
        .from('sorteios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (sorteiosData) {
        setSorteios(sorteiosData)

        // Stats
        const { count: totalCount } = await supabase
          .from('sorteios')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const { count: activeCount } = await supabase
          .from('sorteios')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active')

        const { count: finishedCount } = await supabase
          .from('sorteios')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'finished')

        // Total participantes de todos os sorteios do user
        const sorteioIds = sorteiosData.map(s => s.id)
        let participantsCount = 0
        if (sorteioIds.length > 0) {
          const { count } = await supabase
            .from('participantes')
            .select('*', { count: 'exact', head: true })
            .in('sorteio_id', sorteioIds)
          participantsCount = count || 0
        }

        setStats({
          total: totalCount || 0,
          active: activeCount || 0,
          finished: finishedCount || 0,
          participants: participantsCount,
        })
      }

      setLoading(false)
    }
    loadData()
  }, [])

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Rascunho', color: 'bg-gray-500/20 text-gray-400' },
    active: { label: 'Ativo', color: 'bg-green-500/20 text-green-400' },
    finished: { label: 'Finalizado', color: 'bg-blue-500/20 text-blue-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">Visão geral dos seus sorteios</p>
        </div>
        <Link
          href="/dashboard/sorteios/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Sorteio
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Sorteios', value: stats.total, icon: Trophy, color: 'from-purple-500 to-purple-700' },
          { label: 'Sorteios Ativos', value: stats.active, icon: Gift, color: 'from-green-500 to-green-700' },
          { label: 'Finalizados', value: stats.finished, icon: Trophy, color: 'from-blue-500 to-blue-700' },
          { label: 'Participantes', value: stats.participants, icon: Users, color: 'from-pink-500 to-pink-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Sorteios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Sorteios Recentes</h2>
          <Link
            href="/dashboard/sorteios"
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {sorteios.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Você ainda não criou nenhum sorteio</p>
            <Link
              href="/dashboard/sorteios/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 rounded-lg font-medium hover:bg-purple-500 transition-all"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Sorteio
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {sorteios.map((sorteio) => (
              <Link
                key={sorteio.id}
                href={`/dashboard/sorteios/${sorteio.id}`}
                className="flex items-center justify-between p-5 hover:bg-gray-800/50 transition-all"
              >
                <div>
                  <h3 className="font-medium">{sorteio.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {sorteio.description || 'Sem descrição'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusLabels[sorteio.status]?.color
                    }`}
                  >
                    {statusLabels[sorteio.status]?.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
