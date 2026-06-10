import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const ForjadorLogin = () => {
  const { loginForjador } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    try {
      await loginForjador(data.username, data.password)
      toast.success('Login realizado com sucesso!')
      navigate('/forjador/fila')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-6xl">⚔️</span>
          </Link>
          <h1 className="font-rajdhani text-4xl font-bold text-forge-gold mt-4">Sistema de Forja</h1>
          <p className="text-forge-text-muted mt-2">Área dos Forjadores</p>
        </div>

        <div className="card">
          <h2 className="font-rajdhani text-2xl font-bold text-forge-text mb-6 text-center">🔨 Login do Forjador</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Usuário</label>
              <input
                {...register('username', { required: 'Usuário é obrigatório' })}
                className="input-field"
                placeholder="Seu nome de usuário"
                autoComplete="username"
              />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                {...register('password', { required: 'Senha é obrigatória' })}
                type="password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full justify-center py-3 mt-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Entrando...</>
              ) : (
                '🔑 Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-forge-border text-center space-y-2">
            <p className="text-forge-text-muted text-sm">
              Novo forjador?{' '}
              <Link to="/cadastro" className="text-forge-gold hover:underline font-medium">
                Cadastre-se aqui
              </Link>
            </p>
            <p className="text-forge-text-muted text-sm">
              <Link to="/" className="text-forge-text-muted hover:text-forge-text text-xs">
                ← Voltar ao catálogo
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForjadorLogin
