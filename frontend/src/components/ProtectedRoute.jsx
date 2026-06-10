import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ForjadorRoute = ({ children }) => {
  const { isForjadorLogado, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-forge-bg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
    </div>
  )
  if (!isForjadorLogado) return <Navigate to="/forjador/login" replace />
  return children
}

export const AdminRoute = ({ children }) => {
  const { isAdminLogado, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-forge-bg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
    </div>
  )
  if (!isAdminLogado) return <Navigate to="/admin/login" replace />
  return children
}
