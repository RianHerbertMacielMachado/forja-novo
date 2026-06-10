import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [forjador, setForjador] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const forjaToken = localStorage.getItem('forja_token')
    const forjaUser = localStorage.getItem('forja_user')
    const adminToken = localStorage.getItem('admin_token')
    const adminUser = localStorage.getItem('admin_user')

    if (forjaToken && forjaUser) {
      try {
        setForjador(JSON.parse(forjaUser))
      } catch { localStorage.removeItem('forja_user') }
    }
    if (adminToken && adminUser) {
      try {
        setAdmin(JSON.parse(adminUser))
      } catch { localStorage.removeItem('admin_user') }
    }
    setLoading(false)
  }, [])

  const loginForjador = async (username, password) => {
    const res = await api.post('/auth/forjador/login', { username, password })
    const { token, forjador: forjadorData } = res.data
    localStorage.setItem('forja_token', token)
    localStorage.setItem('forja_user', JSON.stringify(forjadorData))
    setForjador(forjadorData)
    return forjadorData
  }

  const loginAdmin = async (username, password) => {
    const res = await api.post('/auth/admin/login', { username, password })
    const { token, admin: adminData } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(adminData))
    setAdmin(adminData)
    return adminData
  }

  const logoutForjador = () => {
    localStorage.removeItem('forja_token')
    localStorage.removeItem('forja_user')
    setForjador(null)
  }

  const logoutAdmin = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setAdmin(null)
  }

  const updateForjadorData = (data) => {
    const updated = { ...forjador, ...data }
    localStorage.setItem('forja_user', JSON.stringify(updated))
    setForjador(updated)
  }

  return (
    <AuthContext.Provider value={{
      forjador, admin, loading,
      loginForjador, loginAdmin,
      logoutForjador, logoutAdmin,
      updateForjadorData,
      isForjadorLogado: !!forjador,
      isAdminLogado: !!admin
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export default AuthContext
