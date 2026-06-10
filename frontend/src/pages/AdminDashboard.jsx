import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminSidebar } from '../components/Sidebar'
import AdminDashboardPage from './AdminDashboardPage'
import AdminForjadores from './AdminForjadores'
import AdminPedidos from './AdminPedidos'
import AdminProdutos from './AdminProdutos'
import AdminMateriais from './AdminMateriais'
import AdminLogs from './AdminLogs'
import AdminConfiguracoes from './AdminConfiguracoes'

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen bg-forge-bg">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboardPage />} />
          <Route path="forjadores" element={<AdminForjadores />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route path="produtos" element={<AdminProdutos />} />
          <Route path="materiais" element={<AdminMateriais />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="configuracoes" element={<AdminConfiguracoes />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default AdminDashboard
