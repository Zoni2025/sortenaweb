'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sorteio, Premio } from '@/lib/types'
import Link from 'next/link'

interface PageProps {
  params: {
    slug: string
  }
}

export default function RafflePage({ params }: PageProps) {
  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [premios, setPremios] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [checkingWin, setCheckingWin] = useState(false)
  const [hasWon, setHasWon] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sorteio
        const { data: sorteioData, error: sorteioError } = await supabase
          .from('sorteios')
          .select('*')
          .eq('slug', params.slug)
          .eq('is_public', true)
          .single()

        if (sorteioError || !sorteioData) {
          setError('Raffle not found')
          setLoading(false)
          return
        }

        setSorteio(sorteioData)

        // Fetch premios
        const { data: premiosData, error: premiosError } = await supabase
          .from('premios')
          .select('*')
          .eq('sorteio_id', sorteioData.id)
          .order('created_at', { ascending: true })

        if (!premiosError && premiosData) {
          setPremios(premiosData)
        }

        setLoading(false)
      } catch (err) {
        setError('Failed to load raffle details')
        setLoading(false)
      }
    }

    fetchData()
  }, [params.slug])

  const checkWinner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !sorteio) return

    setCheckingWin(true)
    try {
      // Check if email exists in participantes for this sorteio
      const { data: participante } = await supabase
        .from('participantes')
        .select('id')
        .eq('sorteio_id', sorteio.id)
        .eq('email', email.toLowerCase())
        .single()

      if (!participante) {
        setHasWon(false)
        return
      }

      // Check if they're in ganhadores
      const { data: ganhador } = await supabase
        .from('ganhadores')
        .select('*')
        .eq('sorteio_id', sorteio.id)
        .eq('participante_id', participante.id)
        .single()

      setHasWon(!!ganhador)
    } catch (err) {
      setHasWon(false)
    } finally {
      setCheckingWin(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-4">Loading raffle...</p>
        </div>
      </div>
    )
  }

  if (error || !sorteio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Oops!</h1>
          <p className="text-gray-300">{error || 'Raffle not found'}</p>
          <Link href="/" className="mt-6 inline-block text-purple-400 hover:text-purple-300 underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Sortenaweb
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
            {sorteio.title}
          </h1>
          {sorteio.description && (
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">{sorteio.description}</p>
          )}

          {/* Status Badge */}
          <div className="mt-6 flex justify-center">
            <div
              className={`px-6 py-3 rounded-full font-semibold text-sm ${
                sorteio.status === 'finished'
                  ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : sorteio.status === 'active'
                    ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-gradient-to-r from-gray-500/30 to-slate-500/30 text-gray-300 border border-gray-500/50'
              }`}
            >
              {sorteio.status === 'finished' ? '🎉 Draw Completed' : sorteio.status === 'active' ? '🎯 Active' : 'Draft'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Prizes Section */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-6 text-white">Available Prizes</h2>
            {premios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {premios.map((premio, idx) => (
                  <div
                    key={premio.id}
                    className="group relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden"
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-pink-400/0 to-orange-400/0 group-hover:from-purple-400/10 group-hover:via-pink-400/10 group-hover:to-orange-400/10 transition-all duration-300" />

                    <div className="relative z-10">
                      {/* Prize Image */}
                      {premio.image_url && (
                        <div className="mb-4 rounded-lg overflow-hidden h-40 bg-black/20">
                          <img
                            src={premio.image_url}
                            alt={premio.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <h3 className="text-xl font-bold mb-2 text-white">{premio.name}</h3>

                      {premio.description && (
                        <p className="text-sm text-gray-300 mb-4">{premio.description}</p>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          Quantity: <span className="text-purple-300 font-semibold">{premio.quantity}</span>
                        </span>
                        <span className="text-gray-400">
                          Win: <span className="text-orange-300 font-semibold">{premio.win_percentage}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-12">No prizes available for this raffle</p>
            )}
          </div>

          {/* Check Winner Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Check Your Win</h2>

              {sorteio.status === 'finished' ? (
                <>
                  <p className="text-gray-300 mb-6">Enter your email to see if you won!</p>

                  <form onSubmit={checkWinner} className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      disabled={checkingWin}
                    />

                    <button
                      type="submit"
                      disabled={!email.trim() || checkingWin}
                      className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingWin ? 'Checking...' : 'Check Results'}
                    </button>
                  </form>

                  {hasWon !== null && (
                    <div
                      className={`mt-6 p-4 rounded-lg border ${
                        hasWon
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50'
                          : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/50'
                      }`}
                    >
                      <p
                        className={`font-semibold ${
                          hasWon ? 'text-emerald-300' : 'text-orange-300'
                        }`}
                      >
                        {hasWon ? '🎊 Congratulations! You won!' : '👀 Keep trying! Better luck next time!'}
                      </p>
                      {hasWon && (
                        <p className="text-sm text-gray-300 mt-2">
                          <Link href={`/sorteio/${sorteio.slug}/resultado`} className="text-purple-300 hover:text-purple-200 underline">
                            View all winners
                          </Link>
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-cyan-300 font-semibold">⏳ Draw hasn't happened yet</p>
                  <p className="text-sm text-gray-300 mt-2">
                    {sorteio.draw_date
                      ? `Scheduled for: ${new Date(sorteio.draw_date).toLocaleDateString()}`
                      : 'Stay tuned for the draw date!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/30 backdrop-blur-sm mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-400 text-sm">
          <p>Powered by Sortenaweb © 2026. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
