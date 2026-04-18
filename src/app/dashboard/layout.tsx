'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard,
  Trophy,
  LogOut,
  Menu,
  X,
  Sparkles,
  User,
  Shield,
} from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  subscription_status: string
  role: string
  created_at: string
  updated_at: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Carregar perfil
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, subscription_status, role, created_at, updated_at')
          .eq('id', user.id)
          .single()

        if (data) {
          // Verificar se o usuário está aprovado (admin sempre passa)
          if (data.role !== 'admin' && data.subscription_status !== 'active') {
            await supabase.auth.signOut()
            router.push('/auth/login')
            return
          }
          setProfile(data as UserProfile)
          setIsAdmin(data.role === 'admin')
        } else {
          // Se não conseguiu ler o perfil, verificar via RPC se é admin
          const { data: adminCheck } = await supabase.rpc('is_admin')
          if (adminCheck === true) {
            setIsAdmin(true)
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || null,
              email: user.email || '',
              avatar_url: null,
              subscription_status: 'active',
              role: 'admin',
              created_at: user.created_at,
              updated_at: user.created_at,
            })
          } else {
            // Não é admin e não conseguiu ler perfil → bloquear
            await supabase.auth.signOut()
            router.push('/auth/login')
            return
          }
        }
      } catch (err) {
        console.error('Erro inesperado:', err)
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Modo fullscreen para página de sortear (sem sidebar)
  const isFullscreen = pathname?.includes('/sortear')

  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Sortenaweb
          </span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        >
          <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="p-6 border-b border-gray-800">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-purple-400" />
                <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Sortenaweb
                </span>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname === '/dashboard'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>

              <Link
                href="/dashboard/sorteios"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname?.startsWith('/dashboard/sorteios')
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Trophy className="w-5 h-5" />
                Meus Sorteios
              </Link>

              {isAdmin && (
                <>
                  <div className="pt-4 pb-2 px-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
                  </div>
                  <Link
                    href="/dashboard/admin/users"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      pathname?.startsWith('/dashboard/admin')
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    Gerenciar Usuários
                  </Link>
                </>
              )}
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isAdmin
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {profile?.full_name || 'Usuário'}
                    </p>
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
