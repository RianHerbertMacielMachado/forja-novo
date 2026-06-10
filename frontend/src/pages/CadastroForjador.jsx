import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import api from '../api'

const CadastroForjador = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const senha = watch('password')

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/cadastro', {
        nome: data.nome,
        rp_id: data.rp_id,
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
        token: data.token.toUpperCase()
      })
      toast.success('Cadastro realizado! Faça login para continuar.')
      navigate('/forjador/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro no cadastro')
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/"><span className="text-6xl">⚔️</span></Link>
          <h1 className="font-rajdhani text-4xl font-bold text-forge-gold mt-4">Sistema de Forja</h1>
          <p className="text-forge-text-muted mt-2">Cadastro de Novo Forjador</p>
        </div>

        <div className="card">
          <h2 className="font-rajdhani text-2xl font-bold text-forge-text mb-6 text-center">🔨 Novo Forjador</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Nome Completo *</label>
              <input {...register('nome', { required: 'Obrigatório' })} className="input-field" placeholder="Seu nome" />
              {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="label">ID no RP *</label>
              <input {...register('rp_id', { required: 'Obrigatório' })} className="input-field" placeholder="Seu ID no RP" />
              {errors.rp_id && <p className="text-red-400 text-xs mt-1">{errors.rp_id.message}</p>}
            </div>
            <div>
              <label className="label">Nome de Usuário *</label>
              <input {...register('username', { required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })} className="input-field" placeholder="forjador123" />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Senha * (mínimo 8 caracteres)</label>
              <input {...register('password', { required: 'Obrigatório', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} type="password" className="input-field" placeholder="••••••••" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirmar Senha *</label>
              <input {...register('confirmPassword', { required: 'Obrigatório', validate: v => v === senha || 'Senhas não coincidem' })} type="password" className="input-field" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <div>
              <label className="label">Token de Cadastro *</label>
              <input {...register('token', { required: 'Token obrigatório' })} className="input-field uppercase" placeholder="XXXXXXXX" maxLength={8} />
              {errors.token && <p className="text-red-400 text-xs mt-1">{errors.token.message}</p>}
              <p className="text-xs text-forge-text-muted mt-1">Solicite o token ao administrador do sistema</p>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 mt-2">
              {loading ? <><span className="animate-spin">⏳</span> Cadastrando...</> : '✅ Cadastrar'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/forjador/login" className="text-forge-gold hover:underline text-sm">← Voltar ao login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CadastroForjador
