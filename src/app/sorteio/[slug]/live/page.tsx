'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Roleta from '@/components/Roleta'
import { Shield, Trophy, RotateCcw, Users } from 'lucide-react'

interface SorteioData {
  id: string
  title: string
  description: string | null
  slug: string
  status: string
  draw_type: string
  view_type: string
}

interface ParticipanteData {
  id: string
  email: string
  name: string | null
}

interface SorteadoHistorico {
  email: string
  name: string | null
  timestamp: string
}

export default function SorteioLivePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const supabase = createClient()

  const [sorteio, setSorteio] = useState<SorteioData | null>(null)
  const [participantes, setParticipantes] = useState<ParticipanteData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Roleta states
  const [roletaEmails, setRoletaEmails] = useState<string[]>([])
  const [ultimoSorteado, setUltimoSorteado] = useState<string | null>(null)
  const [historico, setHistorico] = useState<SorteadoHistorico[]>([])
  const [sorteioKey, setSorteioKey] = useState(0) // para forçar re-render da roleta

  useEffect(() => {
    checkAdminAndLoad()
  }, [slug])

  async function checkAdminAndLoad() {
    try {
      // Verificar se é admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Você precisa estar logado como administrador para acessar esta página.')
        setLoading(false)
        return
      }

      const { data: adminCheck } = await supabase.rpc('is_admin')
      if (!adminCheck) {
        setError('Apenas administradores podem acessar o sorteio coletivo.')
        setLoading(false)
        return
      }

      setIsAdmin(true)

      // Buscar sorteio
      const { data: sorteioData, error: sorteioError } = await supabase
        .from('sorteios')
        .select('id, title, description, slug, status, draw_type, view_type')
        .eq('slug', slug)
        .single()

      if (sorteioError || !sorteioData) {
        setError('Sorteio não encontrado')
        setLoading(false)
        return
      }

      if (sorteioData.view_type !== 'coletivo') {
        setError('Este sorteio não é do tipo coletivo.')
        setLoading(false)
        return
      }

      setSorteio(sorteioData)

      // Buscar participantes aprovados
      const { data: participantesData } = await supabase
        .from('participantes')
        .select('id, email, name')
        .eq('sorteio_id', sorteioData.id)
        .eq('status', 'approved')
        .order('email', { ascending: true })

      if (participantesData && participantesData.length > 0) {
        setParticipantes(participantesData)
        setRoletaEmails(participantesData.map(p => p.email))
      }

      setLoading(false)
    } catch (err) {
      setError('Erro ao carregar página')
      setLoading(false)
    }
  }

  function handleSorteioResult(email: string) {
    setUltimoSorteado(email)
    const participante = participantes.find(p => p.email === email)
    setHistorico(prev => [
      {
        email,
        name: participante?.name || null,
        timestamp: new Date().toLocaleString('pt-BR'),
      },
      ...prev,
    ])
  }

  function resetarRoleta() {
    setUltimoSorteado(null)
    setSorteioKey(prev => prev + 1) // força re-render
  }

  // ============== LOADING / ERROR ==============
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-4">Carregando sorteio...</p>
        </div>
      </div>
    )
  }

  if (error || !sorteio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Acesso Restrito</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Link href="/dashboard/sorteios" className="text-purple-400 hover:text-purple-300 underline text-sm">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Sortenaweb
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Modo Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Título */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
            {sorteio.title}
          </h1>
          {sorteio.description && (
            <p className="text-gray-300 max-w-xl mx-auto mb-4">{sorteio.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{participantes.length} participante(s) cadastrado(s)</span>
          </div>
        </div>

        {participantes.length === 0 ? (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <p className="text-gray-400">Nenhum participante aprovado neste sorteio. Adicione participantes primeiro.</p>
              <Link
                href={`/dashboard/sorteios/${sorteio.id}/participantes`}
                className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
              >
                Gerenciar Participantes
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Roleta */}
            <div className="lg:col-span-2 flex flex-col items-center">
              <Roleta
                key={sorteioKey}
                items={roletaEmails}
                onResult={handleSorteioResult}
                size={420}
              />

              {/* Resultado do último sorteio */}
              {ultimoSorteado && (
                <div className="mt-8 w-full max-w-md">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
                    <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-1">Sorteado:</h3>
                    <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      {ultimoSorteado}
                    </p>
                  </div>

                  <button
                    onClick={resetarRoleta}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Girar Novamente
                  </button>
                </div>
              )}
            </div>

            {/* Histórico de sorteados */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Histórico de Sorteados
                </h3>

                {historico.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Nenhum sorteio realizado ainda. Gire a roleta para começar!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {historico.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {historico.length - idx}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{item.email}</p>
                          <p className="text-xs text-gray-500">{item.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/30 backdrop-blur-sm mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
          <p>Powered by Sortenaweb &copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}
