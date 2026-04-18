'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Roleta from '@/components/Roleta'
import Radar from '@/components/Radar'
import { Sparkles, Mail, Trophy, Clock } from 'lucide-react'

interface SorteioPublic {
  id: string
  title: string
  description: string | null
  slug: string
  status: string
  draw_type: string
  view_type: string
  draw_date: string | null
}

interface PremioPublic {
  id: string
  name: string
  description: string | null
  quantity: number
  win_percentage: number
}

interface GanhadorResult {
  id: string
  premio_id: string
  revealed: boolean
  revealed_at: string | null
  premio: PremioPublic
}

export default function SorteioPublicPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [sorteio, setSorteio] = useState<SorteioPublic | null>(null)
  const [premios, setPremios] = useState<PremioPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Individual mode states
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'roleta' | 'resultado' | 'sem-resultado' | 'nao-participante'>('email')
  const [checking, setChecking] = useState(false)
  const [resultado, setResultado] = useState<GanhadorResult | null>(null)
  const [ganhadorId, setGanhadorId] = useState<string | null>(null)
  const [roletaItems, setRoletaItems] = useState<string[]>([])
  const [targetIndex, setTargetIndex] = useState<number>(0)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    fetchSorteio()
  }, [slug])

  async function fetchSorteio() {
    try {
      const { data: sorteioData, error: sorteioError } = await supabase
        .from('sorteios')
        .select('id, title, description, slug, status, draw_type, view_type, draw_date')
        .eq('slug', slug)
        .single()

      if (sorteioError || !sorteioData) {
        setError('Sorteio não encontrado')
        setLoading(false)
        return
      }

      setSorteio(sorteioData)

      // Buscar prêmios
      const { data: premiosData } = await supabase
        .from('premios')
        .select('id, name, description, quantity, win_percentage')
        .eq('sorteio_id', sorteioData.id)
        .order('created_at', { ascending: true })

      if (premiosData) {
        setPremios(premiosData)
      }

      setLoading(false)
    } catch (err) {
      setError('Erro ao carregar sorteio')
      setLoading(false)
    }
  }

  // ============== MODO INDIVIDUAL ==============
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !sorteio) return

    setChecking(true)

    try {
      // 1. Verificar se o email é participante aprovado
      const { data: participante } = await supabase
        .from('participantes')
        .select('id, email, name')
        .eq('sorteio_id', sorteio.id)
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'approved')
        .single()

      if (!participante) {
        setStep('nao-participante')
        setChecking(false)
        return
      }

      // 2. Verificar se tem resultado (é ganhador)
      const { data: ganhador } = await supabase
        .from('ganhadores')
        .select('id, premio_id, revealed, revealed_at, premio:premios(id, name, description, quantity, win_percentage)')
        .eq('sorteio_id', sorteio.id)
        .eq('participante_id', participante.id)
        .single()

      if (!ganhador) {
        // Participante existe mas não tem resultado ainda
        setStep('sem-resultado')
        setChecking(false)
        return
      }

      const premioGanhador = Array.isArray(ganhador.premio) ? ganhador.premio[0] : ganhador.premio
      const ganhadorResult: GanhadorResult = {
        id: ganhador.id,
        premio_id: ganhador.premio_id,
        revealed: ganhador.revealed,
        revealed_at: ganhador.revealed_at,
        premio: premioGanhador as PremioPublic,
      }

      setResultado(ganhadorResult)
      setGanhadorId(ganhador.id)

      if (ganhador.revealed) {
        // Já revelou antes — mostra resultado direto
        setStep('resultado')
      } else {
        // Primeira vez — mostra roleta com animação
        // Montar itens da roleta com os prêmios
        const items = premios.map(p => p.name)
        if (items.length === 0) items.push(premioGanhador.name)
        setRoletaItems(items)

        // Encontrar index do prêmio ganho
        const idx = items.findIndex(name => name === premioGanhador.name)
        setTargetIndex(idx >= 0 ? idx : 0)

        setStep('roleta')
      }
    } catch (err) {
      console.error('Erro ao verificar:', err)
      setStep('nao-participante')
    } finally {
      setChecking(false)
    }
  }

  async function handleRoletaResult() {
    // Marcar como revelado no banco
    if (ganhadorId) {
      await supabase
        .from('ganhadores')
        .update({ revealed: true, revealed_at: new Date().toISOString() })
        .eq('id', ganhadorId)
    }
    setShowResult(true)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sorteio não encontrado</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Se for coletivo, redirecionar para informação
  if (sorteio.view_type === 'coletivo') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{sorteio.title}</h1>
          {sorteio.description && <p className="text-gray-300 mb-6">{sorteio.description}</p>}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-purple-200 text-sm">
              Este é um sorteio coletivo. O resultado será apresentado ao vivo pelo administrador.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============== MODO INDIVIDUAL ==============
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Sortenaweb
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Título do sorteio */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
            {sorteio.title}
          </h1>
          {sorteio.description && (
            <p className="text-gray-300 max-w-xl mx-auto">{sorteio.description}</p>
          )}
        </div>

        {/* STEP: Inserir Email */}
        {step === 'email' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Descubra seu resultado</h2>
                <p className="text-gray-400 text-sm">Insira o e-mail cadastrado no sorteio para ver se você ganhou</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <button
                  type="submit"
                  disabled={checking || !email.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg transition duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checking ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    'Consultar Resultado'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP: Não é participante */}
        {step === 'nao-participante' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">E-mail não encontrado</h2>
              <p className="text-gray-400 text-sm mb-6">
                O e-mail <span className="text-white font-medium">{email}</span> não está cadastrado como participante aprovado neste sorteio.
              </p>
              <button
                onClick={() => { setStep('email'); setEmail('') }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
              >
                Tentar outro e-mail
              </button>
            </div>
          </div>
        )}

        {/* STEP: Sem resultado ainda */}
        {step === 'sem-resultado' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Sorteio Pendente</h2>
              <p className="text-gray-400 text-sm mb-6">
                Seu e-mail está cadastrado, mas o sorteio ainda não foi realizado. Volte mais tarde para conferir o resultado.
              </p>
              <button
                onClick={() => { setStep('email'); setEmail('') }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* STEP: Roleta/Radar (primeira revelação) */}
        {step === 'roleta' && !showResult && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8 text-white">
              {sorteio?.draw_type === 'radar' ? 'Inicie o radar para descobrir seu prêmio!' : 'Gire a roleta para descobrir seu prêmio!'}
            </h2>
            <div className="flex justify-center">
              {sorteio?.draw_type === 'radar' ? (
                <Radar
                  items={roletaItems}
                  targetIndex={targetIndex}
                  onResult={handleRoletaResult}
                  size={380}
                />
              ) : (
                <Roleta
                  items={roletaItems}
                  targetIndex={targetIndex}
                  onResult={handleRoletaResult}
                  size={380}
                />
              )}
            </div>
          </div>
        )}

        {/* STEP: Roleta girou — mostrar resultado */}
        {step === 'roleta' && showResult && resultado && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Parabéns!</h2>
              <p className="text-gray-300 mb-6">Você ganhou:</p>
              <div className="bg-white/10 border border-white/20 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {resultado.premio.name}
                </h3>
                {resultado.premio.description && (
                  <p className="text-gray-300 mt-2 text-sm">{resultado.premio.description}</p>
                )}
              </div>
              <p className="text-gray-500 text-xs">Este resultado foi registrado e pode ser consultado novamente com seu e-mail.</p>
            </div>
          </div>
        )}

        {/* STEP: Resultado direto (já revelou antes) */}
        {step === 'resultado' && resultado && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Seu Resultado</h2>
              <p className="text-gray-400 text-sm mb-6">Você já revelou seu prêmio anteriormente</p>
              <div className="bg-white/10 border border-white/20 rounded-xl p-6 mb-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {resultado.premio.name}
                </h3>
                {resultado.premio.description && (
                  <p className="text-gray-300 mt-2 text-sm">{resultado.premio.description}</p>
                )}
              </div>
              {resultado.revealed_at && (
                <p className="text-gray-500 text-xs">
                  Revelado em {new Date(resultado.revealed_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/30 backdrop-blur-sm mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
          <p>Powered by Sortenaweb &copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}
