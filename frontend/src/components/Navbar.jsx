import { Link, useLocation } from 'react-router-dom'
import { useCarrinho } from '../context/CarrinhoContext'

const Navbar = () => {
  const location = useLocation()
  const { totalItens, setAberto } = useCarrinho()

  return (
    <nav className="bg-forge-panel border-b border-forge-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <span className="font-rajdhani font-bold text-xl text-forge-gold">Sistema de Forja</span>
              <span className="hidden sm:block text-xs text-forge-text-muted">RPG Weapon Forge</span>
            </div>
          </Link>

          {/* Navegação */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-forge-gold' : 'text-forge-text-muted hover:text-forge-text'}`}
            >
              🏪 Catálogo
            </Link>
            <Link
              to="/consulta"
              className={`text-sm font-medium transition-colors ${location.pathname === '/consulta' ? 'text-forge-gold' : 'text-forge-text-muted hover:text-forge-text'}`}
            >
              🔍 Consultar Pedido
            </Link>
            <Link
              to="/forjador/login"
              className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/forjador') ? 'text-forge-gold' : 'text-forge-text-muted hover:text-forge-text'}`}
            >
              🔨 Forjadores
            </Link>
          </div>

          {/* Carrinho */}
          <button
            onClick={() => setAberto(true)}
            className="relative flex items-center gap-2 bg-forge-panel2 border border-forge-border hover:border-forge-gold text-forge-text rounded-lg px-4 py-2 transition-all duration-200"
          >
            <span>🛒</span>
            <span className="hidden sm:inline text-sm">Carrinho</span>
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 bg-forge-gold text-forge-bg text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalItens}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
