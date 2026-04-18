'use client'

import Link from 'next/link'
import {
  Sparkles,
  Gift,
  Users,
  Trophy,
  Share2,
  Shield,
  ArrowRight,
  Check,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Sortenaweb
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-5 py-2.5 rounded-lg border border-white/20 hover:bg-white/10 text-white font-semibold transition-all duration-300"
            >
              Fazer Login
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-semibold transition-all duration-300"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-orange-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
          <div className="absolute top-1/3 right-0 w-96 h-96 bg-yellow-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-8 inline-block">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span className="text-sm font-semibold text-purple-200">
                A Plataforma Definitiva de Sorteios
              </span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">
              Crie Sorteios Incríveis
            </span>
            <br />
            <span className="text-white">Em Minutos</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            O Sortenaweb facilita a criação de sorteios profissionais, gestão de participantes e seleção de ganhadores. Transforme seus sorteios em experiências inesquecíveis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 h-14 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white text-lg font-bold transition-all duration-300 group"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 h-14 rounded-lg border border-white/20 hover:bg-white/10 text-white text-lg font-bold transition-all duration-300"
            >
              Fazer Login
            </Link>
          </div>

          {/* Floating cards */}
          <div className="relative h-48 sm:h-64">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl">
              <div className="grid grid-cols-3 gap-4 px-4">
                {[
                  { icon: Users, label: 'Participantes' },
                  { icon: Gift, label: 'Prêmios' },
                  { icon: Trophy, label: 'Ganhadores' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-pointer group"
                    style={{
                      animation: `float 6s ease-in-out ${idx * 0.5}s infinite`,
                    }}
                  >
                    <item.icon className="w-8 h-8 mx-auto mb-2 text-purple-400 group-hover:text-pink-400 transition-colors" />
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32 bg-gradient-to-b from-transparent via-purple-950/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">
                Funcionalidades Poderosas
              </span>
            </h2>
            <p className="text-gray-400 text-lg">Tudo que você precisa para sorteios profissionais</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Gift, title: 'Criar Sorteios', description: 'Monte sorteios personalizados em segundos. Configure prêmios, regras e datas.', color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/50' },
              { icon: Users, title: 'Gerenciar Participantes', description: 'Adicione e gerencie participantes por email. Aprovação individual ou em massa.', color: 'from-pink-500/20 to-pink-600/20', border: 'border-pink-500/50' },
              { icon: Trophy, title: 'Definir Prêmios', description: 'Configure múltiplos prêmios com descrições detalhadas para cada sorteio.', color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/50' },
              { icon: Share2, title: 'Links Compartilháveis', description: 'Gere links únicos para cada sorteio. Participantes acessam resultados online.', color: 'from-yellow-500/20 to-yellow-600/20', border: 'border-yellow-500/50' },
              { icon: Shield, title: 'Segurança e Transparência', description: 'Resultados registrados com data e hora. Histórico completo de cada sorteio.', color: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-500/50' },
              { icon: Sparkles, title: 'Revelação de Prêmios', description: 'Cada ganhador recebe um link exclusivo para descobrir seu prêmio com animação.', color: 'from-violet-500/20 to-violet-600/20', border: 'border-violet-500/50' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`group p-6 rounded-xl bg-gradient-to-br ${feature.color} border ${feature.border} backdrop-blur-sm hover:scale-105 transition-all duration-300 cursor-pointer`}
              >
                <feature.icon className="w-12 h-12 mb-4 text-purple-300 group-hover:text-pink-300 transition-colors" />
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">
                Preço Simples e Transparente
              </span>
            </h2>
            <p className="text-gray-400 text-lg">Comece a criar sorteios hoje</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 backdrop-blur-md hover:border-white/40 transition-all duration-300">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 mb-4">
                  <span className="text-sm font-semibold text-purple-200">Plano Anual</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Profissional</h3>
                <p className="text-gray-400 mb-8">Tudo que você precisa para seus sorteios</p>

                <div className="mb-8">
                  <span className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">
                    R$ 2.000
                  </span>
                  <p className="text-gray-400 text-sm mt-2">/ano • Sorteios ilimitados</p>
                </div>
              </div>

              <Link
                href="/auth/register"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold mb-8 transition-all duration-300 group"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="space-y-4 border-t border-white/10 pt-8">
                {[
                  'Sorteios e draws ilimitados',
                  'Até 10.000 participantes por sorteio',
                  'Gestão de prêmios personalizada',
                  'Links compartilháveis',
                  'Histórico completo de resultados',
                  'Página de revelação de prêmios',
                  'Suporte por email',
                  'Exportação de resultados',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 bg-clip-text text-transparent">
              Pronto para Criar Seu Primeiro Sorteio?
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed">
            Junte-se a milhares de usuários criando sorteios incríveis com o Sortenaweb.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 h-14 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white text-lg font-bold transition-all duration-300 group"
          >
            Começar Agora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-md bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-bold text-white">Sortenaweb</span>
              </div>
              <p className="text-gray-400 text-sm">
                A plataforma definitiva para criar sorteios profissionais online.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Funcionalidades</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Preços</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Segurança</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Sobre</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacidade</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2026 Sortenaweb. Todos os direitos reservados.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Instagram</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Twitter</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
