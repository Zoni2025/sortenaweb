'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Search,
  UserCheck,
  UserX,
  Crown,
  Trash2,
} from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'inactive' | 'active'>('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name && u.full_name.toLowerCase().includes(q))
      )
    }
    if (filter !== 'all') {
      result = result.filter((u) => u.subscription_status === filter)
    }
    setFilteredUsers(result)
  }, [users, search, filter])

  async function loadUsers() {
    // Verificar se é admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/auth/login')

    try {
      const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin')
      if (isAdminError || !isAdminData) {
        return router.push('/dashboard')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      return router.push('/dashboard')
    }

    // Carregar todos os usuários
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError
      if (data) {
        setUsers(data as Profile[])
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
    setLoading(false)
  }

  async function updateUserStatus(userId: string, status: 'active' | 'inactive') {
    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: status, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, subscription_status: status } : u
        )
      )
    }
    setActionLoading(null)
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}? Esta ação não pode ser desfeita.`)) return

    setActionLoading(userId + '-delete')
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir usuário')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Erro ao excluir usuário')
    }
    setActionLoading(null)
  }

  async function toggleAdmin(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    setActionLoading(userId + '-role')
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u
        )
      )
    }
    setActionLoading(null)
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.subscription_status === 'active').length,
    pending: users.filter((u) => u.subscription_status === 'inactive').length,
    admins: users.filter((u) => u.role === 'admin').length,
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-400" />
          Gerenciar Usuários
        </h1>
        <p className="text-gray-400 mt-1">Aprove ou rejeite o acesso dos usuários à plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'from-purple-500 to-purple-700' },
          { label: 'Aprovados', value: stats.active, icon: CheckCircle, color: 'from-green-500 to-green-700' },
          { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'from-yellow-500 to-yellow-700' },
          { label: 'Admins', value: stats.admins, icon: Crown, color: 'from-pink-500 to-pink-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'inactive', label: 'Pendentes' },
            { key: 'active', label: 'Aprovados' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-800/30 transition-all gap-4"
              >
                {/* User info */}
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${
                    user.role === 'admin'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                      : user.subscription_status === 'active'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                  }`}>
                    {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Registrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 sm:ml-auto">
                  {/* Status badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.subscription_status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {user.subscription_status === 'active' ? 'Aprovado' : 'Pendente'}
                  </span>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {user.subscription_status !== 'active' ? (
                      <button
                        onClick={() => updateUserStatus(user.id, 'active')}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 text-sm font-medium transition-all disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        Aprovar
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUserStatus(user.id, 'inactive')}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-sm font-medium transition-all disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                        Revogar
                      </button>
                    )}

                    <button
                      onClick={() => toggleAdmin(user.id, user.role)}
                      disabled={actionLoading === user.id + '-role'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                        user.role === 'admin'
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                    </button>

                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      disabled={actionLoading === user.id + '-delete'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50 text-sm font-medium transition-all disabled:opacity-50"
                      title="Excluir usuário"
                    >
                      {actionLoading === user.id + '-delete' ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
