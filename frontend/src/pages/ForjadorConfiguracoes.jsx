import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const ForjadorConfiguracoes = () => {
  const { forjador, updateForjadorData } = useAuth()
  const [testando, setTestando] = useState(false)
  const [salvandoWebhook, setSalvandoWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState(forjador?.discord_webhook || '')

  const {
    register: registerSenha,
    handleSubmit: handleSubmitSenha,
    formState: { errors: errorsSenha },
    reset: resetSenha,
    watch: watchSenha
  } = useForm()

  useEffect(() => {
    // Buscar dados atualizados do forjador
    api.get('/forjador/me').then(res => {
      setWebhookUrl(res.data.discord_webhook || '')
      updateForjadorData(res.data)
    }).catch(() => {})
  }, [])

  const salvarWebhook = async () => {
    setSalvandoWebhook(true)
    try {
      await api.put('/forjador/webhook', { discord_webhook: webhookUrl })
      updateForjadorData({ discord_webhook: webhookUrl })
      toast.success('Webhook atualizada!')
    } catch (err) {
      toast.error('Erro ao salvar webhook')
    } finally {
      setSalvandoWebhook(false)
    }
  }

  const testarWebhook = async () => {
    if (!webhookUrl) { toast.warning('Insira uma URL de webhook primeiro'); return }
    setTestando(true)
    try {
      await api.post('/admin/webhook/testar', { url: webhookUrl })
      toast.success('Webhook testada com sucesso!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao testar webhook')
    } finally {
      setTestando(false)
    }
  }

  const onAlterarSenha = handleSubmitSenha(async (data) => {
    try {
      await api.put('/forjador/senha', {
        senhaAtual: data.senhaAtual,
        novaSenha: data.novaSenha,
        confirmaSenha: data.confirmaSenha
      })
      toast.success('Senha alterada com sucesso!')
      resetSenha()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha')
    }
  })

  const novaSenha = watchSenha('novaSenha')

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">⚙️ Configurações</h1>
        <p className="text-forge-text-muted text-sm mt-1">Gerencie seu perfil e preferências</p>
      </div>

      {/* Informações do Forjador */}
      <div className="card mb-6">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-4">👤 Meu Perfil</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label">Nome</p>
            <p className="text-forge-text font-medium">{forjador?.nome}</p>
          </div>
          <div>
            <p className="label">RP ID</p>
            <p className="text-forge-text font-medium">{forjador?.rp_id}</p>
          </div>
          <div>
            <p className="label">Usuário</p>
            <p className="text-forge-text font-medium">@{forjador?.username}</p>
          </div>
        </div>
      </div>

      {/* Webhook Discord */}
      <div className="card mb-6">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-1">🔔 Webhook do Discord</h2>
        <p className="text-sm text-forge-text-muted mb-4">
          Receba notificações de novos pedidos diretamente no seu Discord
        </p>

        <div className="space-y-3">
          <div>
            <label className="label">URL da Webhook</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="input-field"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={testarWebhook}
              disabled={testando || !webhookUrl}
              className="btn-ghost flex-1 justify-center text-sm"
            >
              {testando ? '⏳ Testando...' : '🧪 Testar'}
            </button>
            <button
              onClick={salvarWebhook}
              disabled={salvandoWebhook}
              className="btn-gold flex-1 justify-center text-sm"
            >
              {salvandoWebhook ? '⏳ Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="card">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-4">🔒 Alterar Senha</h2>

        <form onSubmit={onAlterarSenha} className="space-y-4">
          <div>
            <label className="label">Senha Atual *</label>
            <input
              {...registerSenha('senhaAtual', { required: 'Obrigatório' })}
              type="password"
              className="input-field"
              placeholder="Sua senha atual"
            />
            {errorsSenha.senhaAtual && <p className="text-red-400 text-xs mt-1">{errorsSenha.senhaAtual.message}</p>}
          </div>

          <div>
            <label className="label">Nova Senha *</label>
            <input
              {...registerSenha('novaSenha', {
                required: 'Obrigatório',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' }
              })}
              type="password"
              className="input-field"
              placeholder="Nova senha (mínimo 8 caracteres)"
            />
            {errorsSenha.novaSenha && <p className="text-red-400 text-xs mt-1">{errorsSenha.novaSenha.message}</p>}
          </div>

          <div>
            <label className="label">Confirmar Nova Senha *</label>
            <input
              {...registerSenha('confirmaSenha', {
                required: 'Obrigatório',
                validate: (val) => val === novaSenha || 'Senhas não coincidem'
              })}
              type="password"
              className="input-field"
              placeholder="Confirmar nova senha"
            />
            {errorsSenha.confirmaSenha && <p className="text-red-400 text-xs mt-1">{errorsSenha.confirmaSenha.message}</p>}
          </div>

          <button type="submit" className="btn-gold w-full justify-center">
            🔒 Alterar Senha
          </button>
        </form>
      </div>
    </div>
  )
}

export default ForjadorConfiguracoes
