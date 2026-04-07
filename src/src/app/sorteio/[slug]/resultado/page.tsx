'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sorteio, Ganhador, Participante, Premio } from '@/lib/types'
import Link from 'next/link'

interface WinnerWithDetails extends Omit<Ganhador, 'participante' | 'premio'> {
  participante: Participante | null
  premio: Premio | null
}

interface PageProps {
  params: {
    slug: string
  }
}

export default function ResultadoPage({ params }: PageProps) {
  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [ganhadores, setGanhadores] = useState<WinnerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [userWin, setUserWin] = useState<WinnerWithDetails | null>(null)
  const [checkingWin, setCheckingWin] = useState(false)
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set())
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

        // Fetch all winners
        const { data: ganhadoresData, error: ganhadoresError } = await supabase
          .from('ganhadores')
          .select('*, participante:participantes(*), premio:premios(*)')
          .eq('sorteio_id', sorteioData.id)
          .order('created_at', { ascending: true })

        if (!ganhadoresError && ganhadoresData) {
          setGanhadores(ganhadoresData as WinnerWithDetails[])

          // Initialize revealed cards based on revealed status
          const initialRevealed = new Set<string>()
          ganhadoresData.forEach((g: any) => {
            if (g.revealed) {
              initialRevealed.add(g.id)
            }
          })
          setRevealedCards(initialRevealed)
        }

        setLoading(false)
      } catch (err) {
        setError('Failed to load results')
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
      // Check if email exists in participantes
      const { data: participante } = await supabase
        .from('participantes')
        .select('id')
        .eq('sorteio_id', sorteio.id)
        .eq('email', email.toLowerCase())
        .single()

      if (!participante) {
        setUserWin(null)
        return
      }

      // Check if they're in ganhadores
      const { data: ganhador } = await supabase
        .from('ganhadores')
        .select('*, participante:participantes(*), premio:premios(*)')
        .eq('sorteio_id', sorteio.id)
        .eq('participante_id', participante.id)
        .single()

      if (ganhador) {
        setUserWin(ganhador as WinnerWithDetails)

        // Mark as revealed if not already
        if (!ganhador.revealed) {
          await supabase
            .from('ganhadores')
            .update({ revealed: true, revealed_at: new Date().toISOString() })
            .eq('id', ganhador.id)

          setRevealedCards((prev) => new Set(prev).add(ganhador.id))
        }
      } else {
        setUserWin(null)
      }
    } catch (err) {
      setUserWin(null)
    } finally {
      setCheckingWin(false)
    }
  }

  const toggleCardReveal = async (ganhador: WinnerWithDetails) => {
    const isCurrentlyRevealed = revealedCards.has(ganhador.id)

    if (!isCurrentlyRevealed && !ganhador.revealed) {
      // Mark as revealed in database
      try {
        await supabase
          .from('ganhadores')
          .update({ revealed: true, revealed_at: new Date().toISOString() })
          .eq('id', ganhador.id)
      } catch (err) {
        console.error('Failed to update reveal status')
      }
    }

    // Toggle local reveal state
    setRevealedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(ganhador.id)) {
        newSet.delete(ganhador.id)
      } else {
        newSet.add(ganhador.id)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-4">Loading results...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Confetti effect styles */}
      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }

        @keyframes confetti-spin {
          to {
            transform: rotateZ(360deg);
          }
        }

        .confetti {
          position: fixed;
          pointer-events: none;
          z-index: 50;
        }

        @media (prefers-reduced-motion: no-preference) {
          .confetti-particle {
            animation: confetti-fall 2.5s ease-in forwards;
          }
        }

        @keyframes card-flip {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }

        .card-flipping {
          animation: card-flip 0.6s ease-in-out;
          perspective: 1000px;
        }

        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .prize-reveal {
          animation: fade-in-scale 0.5s ease-out;
        }
      `}</style>

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
          <h1 className="text-5xl sm:text-6xl font-bold mb-2 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
            {sorteio.title}
          </h1>
          <h2 className="text-3xl font-bold text-purple-400 mb-4">🎉 Winners Announced! 🎉</h2>
          <p className="text-gray-300">See who won the amazing prizes!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Winners Section */}
          <div className="lg:col-span-3">
            <h2 className="text-3xl font-bold mb-8 text-white">All Winners</h2>

            {ganhadores.length > 0 ? (
              <div className="space-y-6">
                {ganhadores.map((ganhador, idx) => {
                  const isRevealed = revealedCards.has(ganhador.id)

                  return (
                    <div
                      key={ganhador.id}
                      onClick={() => toggleCardReveal(ganhador)}
                      className={`relative h-48 cursor-pointer transition-all duration-500 ${isRevealed ? 'card-flipping' : ''}`}
                    >
                      {/* Card Container with flip effect */}
                      <div
                        className="relative w-full h-full transition-transform duration-500"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* Front of card - Hidden winner preview */}
                        <div
                          className="absolute w-full h-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        >
                          <div className="text-6xl mb-4">🎁</div>
                          <h3 className="text-2xl font-bold text-white text-center">Click to Reveal</h3>
                          <p className="text-gray-300 text-sm mt-2">Winner #{idx + 1}</p>
                        </div>

                        {/* Back of card - Prize information */}
                        <div
                          className="absolute w-full h-full bg-gradient-to-br from-emerald-500/30 to-green-500/30 border-2 border-emerald-500/50 rounded-xl p-6 flex flex-col justify-between prize-reveal"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <div>
                            <p className="text-sm text-gray-300 mb-1">Winner</p>
                            <h3 className="text-2xl font-bold text-white mb-4">
                              {ganhador.participante?.name || ganhador.participante?.email || 'Anonymous'}
                            </h3>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl">🏆</div>
                              <div>
                                <p className="text-sm text-gray-300">Prize Won</p>
                                <p className="text-xl font-bold text-emerald-300">
                                  {ganhador.premio?.name || 'Mystery Prize'}
                                </p>
                              </div>
                            </div>

                            {ganhador.premio?.description && (
                              <p className="text-sm text-gray-300 italic">{ganhador.premio.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-gray-400 text-lg">No winners yet for this raffle</p>
              </div>
            )}
          </div>

          {/* Check Your Win Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white">Your Result</h2>

              <form onSubmit={checkWinner} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Enter your email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    disabled={checkingWin}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!email.trim() || checkingWin}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {checkingWin ? 'Checking...' : 'Check Result'}
                </button>
              </form>

              {userWin ? (
                <div className="bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-500/50 rounded-lg p-4 space-y-3">
                  <p className="font-bold text-emerald-300 text-lg">🎊 You Won! 🎊</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400">Prize:</span>
                      <span className="font-semibold text-emerald-300 block">{userWin.premio?.name}</span>
                    </p>
                    {userWin.premio?.description && (
                      <p className="text-xs text-gray-400 italic">{userWin.premio.description}</p>
                    )}
                  </div>
                  <div className="text-4xl text-center">🏆</div>
                </div>
              ) : userWin === null && email ? (
                <div className="bg-gradient-to-r from-orange-500/30 to-red-500/30 border border-orange-500/50 rounded-lg p-4">
                  <p className="font-bold text-orange-300">👀 No Match Found</p>
                  <p className="text-sm text-gray-300 mt-2">This email didn't win. Better luck next time!</p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-sm text-cyan-300">
                    Enter your email above to check if you're a winner!
                  </p>
                </div>
              )}

              <div className="border-t border-purple-500/20 pt-4">
                <Link
                  href={`/sorteio/${sorteio.slug}`}
                  className="text-sm text-purple-400 hover:text-purple-300 underline block text-center"
                >
                  Back to raffle
                </Link>
              </div>
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
