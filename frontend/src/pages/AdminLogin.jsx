import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const AdminLogin = () => {
  const { loginAdmin } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    try {
      await loginAdmin(data.username, data.password)
      toast.success('Login administrativo realizado!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">👑</span>
          <h1 className="font-rajdhani text-4xl font-bold text-forge-gold mt-4">Painel Admin</h1>
          <p className="text-forge-text-muted mt-2">Sistema de Forja — Área Restrita</p>
        </div>

        <div className="card border-forge-gold/30">
          <h2 className="font-rajdhani text-2xl font-bold text-forge-text mb-6 text-center">
            🔐 Acesso Administrativo
          </h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Usuário Admin</label>
              <input
                {...register('username', { required: 'Obrigatório' })}
                className="input-field"
                placeholder="admin"
                autoComplete="username"
              />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                {...register('password', { required: 'Obrigatório' })}
                type="password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 mt-2">
              {loading ? <><span className="animate-spin">⏳</span> Entrando...</> : '👑 Acessar Painel'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/" className="text-forge-text-muted hover:text-forge-text text-xs">
              ← Voltar ao catálogo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
