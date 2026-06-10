import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../api'

const ForjadorSidebar = () => {
  const { forjador, logoutForjador } = useAuth()
  const navigate = useNavigate()
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    const checkPendentes = async () => {
      try {
        const res = await api.get('/forjador/transferencias/count')
        setPendentes(res.data.count)
      } catch { }
    }
    checkPendentes()
    const interval = setInterval(checkPendentes, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logoutForjador()
    navigate('/forjador/login')
  }

  const navItems = [
    { to: '/forjador/fila', icon: '📋', label: 'Fila de Pedidos' },
    { to: '/forjador/catalogo', icon: '🏪', label: 'Catálogo' },
    { to: '/forjador/meus-pedidos', icon: '🔨', label: 'Meus Pedidos' },
    { to: '/forjador/transferencias', icon: '🔄', label: 'Transferências', badge: pendentes },
    { to: '/forjador/configuracoes', icon: '⚙️', label: 'Configurações' },
  ]

  return (
    <aside className="w-64 bg-forge-panel border-r border-forge-border flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-forge-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forge-purple/20 border border-forge-purple flex items-center justify-center text-xl">
            🔨
          </div>
          <div>
            <p className="font-rajdhani font-bold text-forge-gold">{forjador?.nome}</p>
            <p className="text-xs text-forge-text-muted">ID: {forjador?.rp_id}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-forge-purple/20 text-forge-purple-light border border-forge-purple/40'
                  : 'text-forge-text-muted hover:bg-forge-panel2 hover:text-forge-text'
              }`
            }
          >
            <span className="flex items-center gap-3">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
            {item.badge > 0 && (
              <span className="bg-forge-gold text-forge-bg text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-forge-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-forge-text-muted hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
        >
          <span>🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

const AdminSidebar = () => {
  const { admin, logoutAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutAdmin()
    navigate('/admin/login')
  }

  const navItems = [
    { to: '/admin', icon: '📊', label: 'Dashboard', exact: true },
    { to: '/admin/forjadores', icon: '👥', label: 'Forjadores' },
    { to: '/admin/pedidos', icon: '📦', label: 'Pedidos' },
    { to: '/admin/produtos', icon: '⚔️', label: 'Produtos' },
    { to: '/admin/materiais', icon: '🪨', label: 'Materiais' },
    { to: '/admin/logs', icon: '📜', label: 'Logs' },
    { to: '/admin/configuracoes', icon: '⚙️', label: 'Configurações' },
  ]

  return (
    <aside className="w-64 bg-forge-panel border-r border-forge-border flex flex-col min-h-screen">
      <div className="p-6 border-b border-forge-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forge-gold/20 border border-forge-gold flex items-center justify-center text-xl">
            👑
          </div>
          <div>
            <p className="font-rajdhani font-bold text-forge-gold">Administrador</p>
            <p className="text-xs text-forge-text-muted">{admin?.username}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-forge-gold/10 text-forge-gold border border-forge-gold/30'
                  : 'text-forge-text-muted hover:bg-forge-panel2 hover:text-forge-text'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-forge-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-forge-text-muted hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <span>🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

export { ForjadorSidebar, AdminSidebar }
