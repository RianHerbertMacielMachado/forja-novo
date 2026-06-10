import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { CarrinhoProvider } from './context/CarrinhoContext'

// Páginas públicas
import ClienteCatalogo from './pages/ClienteCatalogo'
import ClienteConsulta from './pages/ClienteConsulta'
import CadastroForjador from './pages/CadastroForjador'

// Forjador
import ForjadorLogin from './pages/ForjadorLogin'
import ForjadorPainel from './pages/ForjadorPainel'

// Admin
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

// Guards
import { ForjadorRoute, AdminRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CarrinhoProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<ClienteCatalogo />} />
            <Route path="/consulta" element={<ClienteConsulta />} />
            <Route path="/cadastro" element={<CadastroForjador />} />

            {/* Rotas do forjador */}
            <Route path="/forjador/login" element={<ForjadorLogin />} />
            <Route path="/forjador/*" element={
              <ForjadorRoute>
                <ForjadorPainel />
              </ForjadorRoute>
            } />

            {/* Rotas admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </CarrinhoProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
