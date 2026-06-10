import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import api from '../api'

const AdminConfiguracoes = () => {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [tokenMascarado, setTokenMascarado] = useState(true)
  const [gerandoToken, setGerandoToken] = useState(false)
  const [testando, setTestando] = useState(null)
  const [salvando, setSalvando] = useState(null)

  const { register: regSenha, handleSubmit: submitSenha, reset: resetSenha, watch, formState: { errors: errSenha } } = useForm()

  useEffect(() => {
    api.get('/admin/configuracoes')
      .then(res => setConfig(res.data))
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [])

  const salvarConfig = async (chave, valor) => {
    setSalvando(chave)
    try {
      await api.post('/admin/configuracoes', { chave, valor })
      setConfig(prev => ({ ...prev, [chave]: valor }))
      toast.success('Configuração salva!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSalvando(null) }
  }

  const testarWebhook = async (chave) => {
    const url = config[chave]
    if (!url) { toast.warning('Insira a URL primeiro'); return }
    setTestando(chave)
    try {
      await api.post('/admin/webhook/testar', { url })
      toast.success('Webhook testada com sucesso!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao testar webhook')
    } finally { setTestando(null) }
  }

  const gerarNovoToken = async () => {
    if (!confirm('Gerar novo token? O token atual será invalidado.')) return
    setGerandoToken(true)
    try {
      const res = await api.post('/admin/token/gerar')
      toast.success(`Novo token gerado: ${res.data.token}`)
      setConfig(prev => ({ ...prev, token_cadastro_atual: res.data.token }))
      setTokenMascarado(false)
    } catch (err) {
      toast.error('Erro ao gerar token')
    } finally { setGerandoToken(false) }
  }

  const onAlterarSenha = submitSenha(async (data) => {
    try {
      await api.put('/admin/senha', { senhaAtual: data.senhaAtual, novaSenha: data.novaSenha })
      toast.success('Senha alterada!')
      resetSenha()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha')
    }
  })

  const novaSenha = watch('novaSenha')

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
    </div>
  )

  const WebhookField = ({ chave, label, descricao }) => (
    <div className="card mb-4">
      <h3 className="font-semibold text-forge-text mb-1">{label}</h3>
      {descricao && <p className="text-xs text-forge-text-muted mb-3">{descricao}</p>}
      <div className="flex gap-2">
        <input
          type="url"
          value={config[chave] || ''}
          onChange={e => setConfig(prev => ({ ...prev, [chave]: e.target.value }))}
          className="input-field flex-1 text-sm"
          placeholder="https://discord.com/api/webhooks/..."
        />
        <button
          onClick={() => testarWebhook(chave)}
          disabled={testando === chave}
          className="btn-ghost text-sm py-2 whitespace-nowrap"
        >
          {testando === chave ? '⏳' : '🧪'} Testar
        </button>
        <button
          onClick={() => salvarConfig(chave, config[chave])}
          disabled={salvando === chave}
          className="btn-gold text-sm py-2 whitespace-nowrap"
        >
          {salvando === chave ? '⏳' : '💾'} Salvar
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">⚙️ Configurações do Sistema</h1>
        <p className="text-forge-text-muted text-sm mt-1">Gerencie webhooks, tokens e preferências</p>
      </div>

      {/* Token de Cadastro */}
      <div className="card mb-6">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-4">🔑 Token de Cadastro</h2>

        <div className="bg-forge-panel2 rounded-xl p-4 mb-4 border border-forge-border">
          <p className="text-sm text-forge-text-muted mb-2">Token atual:</p>
          <div className="flex items-center gap-3">
            <code className="font-mono text-2xl font-bold text-forge-gold tracking-widest">
              {tokenMascarado && config.token_cadastro_atual
                ? '•'.repeat(config.token_cadastro_atual.length)
                : config.token_cadastro_atual || 'Nenhum token ativo'}
            </code>
            <button
              onClick={() => setTokenMascarado(!tokenMascarado)}
              className="text-forge-text-muted hover:text-forge-text text-sm transition-colors"
            >
              {tokenMascarado ? '👁️' : '🙈'}
            </button>
            {config.token_cadastro_atual && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(config.token_cadastro_atual)
                  toast.success('Token copiado!')
                }}
                className="text-forge-text-muted hover:text-forge-gold text-sm transition-colors"
              >
                📋
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={gerarNovoToken}
            disabled={gerandoToken}
            className="btn-purple"
          >
            {gerandoToken ? '⏳ Gerando...' : '🔄 Gerar Novo Token'}
          </button>
          <p className="text-xs text-forge-text-muted">
            ⚠️ Um novo token será gerado e o anterior invalidado
          </p>
        </div>
      </div>

      {/* Webhooks */}
      <div className="mb-6">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-4">🔔 Webhooks Globais</h2>
        <WebhookField
          chave="webhook_novos_pedidos"
          label="📦 Webhook de Novos Pedidos"
          descricao="Notificações enviadas para este canal quando um cliente faz um pedido"
        />
        <WebhookField
          chave="webhook_token_cadastro"
          label="🔑 Webhook do Token de Cadastro"
          descricao="Canal onde o token de cadastro de novos forjadores é exibido e atualizado"
        />
      </div>

      {/* Discord Bot */}
      <div className="card mb-6">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-2">🤖 Discord Bot</h2>
        <p className="text-xs text-forge-text-muted mb-4">
          Necessário para envio de DMs aos clientes com Discord quando o status do pedido mudar
        </p>
        {!config.discord_bot_token && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-3">
            <p className="text-yellow-300 text-sm">⚠️ Bot Token não configurado — DMs para clientes estão desativadas</p>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={config.discord_bot_token === '***configurado***' ? '' : (config.discord_bot_token || '')}
            onChange={e => setConfig(prev => ({ ...prev, discord_bot_token: e.target.value }))}
            className="input-field flex-1 text-sm"
            placeholder={config.discord_bot_token === '***configurado***' ? '● Bot Token configurado (deixe em branco para manter)' : 'Bot Token do Discord'}
          />
          <button
            onClick={() => {
              if (config.discord_bot_token && config.discord_bot_token !== '***configurado***') {
                salvarConfig('discord_bot_token', config.discord_bot_token)
              } else {
                toast.info('Digite um novo token para atualizar')
              }
            }}
            disabled={salvando === 'discord_bot_token'}
            className="btn-gold text-sm py-2"
          >
            {salvando === 'discord_bot_token' ? '⏳' : '💾'} Salvar
          </button>
        </div>
      </div>

      {/* Alterar Senha Admin */}
      <div className="card">
        <h2 className="font-rajdhani text-xl font-bold text-forge-text mb-4">🔒 Alterar Senha Admin</h2>
        <form onSubmit={onAlterarSenha} className="space-y-4">
          <div>
            <label className="label">Senha Atual *</label>
            <input {...regSenha('senhaAtual', { required: true })} type="password" autoComplete="current-password" className="input-field" placeholder="Senha atual" />
            {errSenha.senhaAtual && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
          </div>
          <div>
            <label className="label">Nova Senha * (mínimo 8 caracteres)</label>
            <input {...regSenha('novaSenha', { required: true, minLength: 8 })} type="password" autoComplete="new-password" className="input-field" placeholder="Nova senha" />
            {errSenha.novaSenha && <p className="text-red-400 text-xs mt-1">Mínimo 8 caracteres</p>}
          </div>
          <div>
            <label className="label">Confirmar Nova Senha *</label>
            <input
              {...regSenha('confirmarSenha', { required: true, validate: val => val === novaSenha || 'Senhas não coincidem' })}
              type="password" autoComplete="new-password" className="input-field" placeholder="Confirmar" />
            {errSenha.confirmarSenha && <p className="text-red-400 text-xs mt-1">{errSenha.confirmarSenha.message}</p>}
          </div>
          <button type="submit" className="btn-gold w-full justify-center">🔒 Alterar Senha</button>
        </form>
      </div>
    </div>
  )
}

export default AdminConfiguracoes
