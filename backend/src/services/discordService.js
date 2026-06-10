const fetch = require('node-fetch')
const pool = require('../database')
const { formatDate, statusLabel } = require('../utils/formatters')

// ─── Cores por status ────────────────────────────────────────────────────────
const statusColor = {
  na_fila:              0xF59E0B, // amarelo
  coletando_materiais:  0x3B82F6, // azul
  em_producao:          0x7C3AED, // roxo
  concluido:            0x22C55E  // verde
}

// ─── Emoji por status ────────────────────────────────────────────────────────
const statusEmoji = {
  na_fila:             '🟡',
  coletando_materiais: '🔵',
  em_producao:         '🔧',
  concluido:           '✅'
}

/**
 * Envia mensagem para uma webhook do Discord
 */
const sendWebhook = async (webhookUrl, payload) => {
  if (!webhookUrl) return { success: false, error: 'Webhook não configurada' }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Discord retornou ${response.status}: ${text}` }
    }
    return { success: true }
  } catch (err) {
    console.error('Erro ao enviar webhook:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Busca configuração do banco
 */
const getConfig = async (chave) => {
  const result = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [chave])
  return result.rows[0]?.valor || ''
}

/**
 * Notifica novo pedido de cliente via webhook global
 */
const notifyNovoPedido = async (pedido, itens) => {
  try {
    const webhookUrl = await getConfig('webhook_novos_pedidos')
    if (!webhookUrl) return

    const itensText = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n') || 'Nenhum item'

    const payload = {
      embeds: [{
        title: '🛒 Novo Pedido de Cliente!',
        description: 'Um novo pedido foi adicionado à fila.',
        color: 0x3447DB,
        fields: [
          { name: '👤 Cliente',    value: pedido.cliente_nome       || 'Não informado', inline: true },
          { name: '🪪 Passaporte', value: pedido.cliente_passaporte || 'Não informado', inline: true },
          { name: '📦 Itens',      value: itensText,                                    inline: false },
          { name: '💰 Total',      value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true },
          { name: '🆔 Registro',   value: pedido.registro_id,                           inline: true }
        ],
        footer: { text: `Pedido recebido em: ${formatDate(pedido.created_at)}` }
      }]
    }

    await sendWebhook(webhookUrl, payload)
  } catch (err) {
    console.error('Erro ao notificar novo pedido:', err.message)
  }
}

/**
 * Notifica forjador via webhook pessoal ao puxar pedido
 */
const notifyForjadorWebhook = async (forjadorWebhook, pedido, itens, materiais, forjadorNome) => {
  if (!forjadorWebhook) return

  try {
    const itensText      = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n')     || 'Nenhum item'
    const materiaisText  = materiais.map(m => `• ${m.nome} x${m.total}`).join('\n')               || 'Sem materiais'

    const payload = {
      embeds: [{
        title: `⚒️ Pedido ${pedido.registro_id} atribuído a você`,
        color: 0x57D68A,
        fields: [
          { name: '👤 Cliente',               value: pedido.cliente_nome       || 'Não informado', inline: true },
          { name: '🪪 Passaporte',            value: pedido.cliente_passaporte || 'Não informado', inline: true },
          { name: '📦 Itens do Pedido',        value: itensText,                                    inline: false },
          { name: '⚒️ Materiais Necessários', value: materiaisText,                                 inline: false },
          { name: '💰 Total',                 value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true }
        ],
        footer: { text: `Forjador: ${forjadorNome} | ${formatDate(new Date())}` }
      }]
    }

    await sendWebhook(forjadorWebhook, payload)
  } catch (err) {
    console.error('Erro ao notificar forjador webhook:', err.message)
  }
}

/**
 * Notifica forjador via webhook pessoal sobre atualização de status
 * Inclui histórico de todas as atualizações anteriores do pedido
 */
const notifyStatusAtualizado = async (forjadorWebhook, pedido, itens, novoStatus, historicoLogs) => {
  if (!forjadorWebhook) return

  try {
    const itensText = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n') || 'Nenhum item'

    // Montar histórico de status a partir dos logs
    const historicoText = historicoLogs.length > 0
      ? historicoLogs.map(log => {
          const emoji = statusEmoji[log.status] || '•'
          return `${emoji} **${statusLabel[log.status] || log.status}** — ${formatDate(log.created_at)}`
        }).join('\n')
      : `${statusEmoji[novoStatus] || '•'} **${statusLabel[novoStatus]}** — ${formatDate(new Date())}`

    const cor = statusColor[novoStatus] || 0x7C3AED

    const payload = {
      embeds: [{
        title: `${statusEmoji[novoStatus] || '🔔'} Pedido ${pedido.registro_id} — Status Atualizado`,
        color: cor,
        fields: [
          { name: '👤 Cliente',     value: pedido.cliente_nome       || 'Não informado', inline: true },
          { name: '🪪 Passaporte',  value: pedido.cliente_passaporte || 'Não informado', inline: true },
          { name: '📦 Itens',       value: itensText,                                    inline: false },
          { name: '📊 Novo Status', value: `${statusEmoji[novoStatus]} **${statusLabel[novoStatus]}**`, inline: false },
          { name: '📋 Histórico de Status', value: historicoText,                        inline: false }
        ],
        footer: { text: `Atualizado em: ${formatDate(new Date())}` }
      }]
    }

    await sendWebhook(forjadorWebhook, payload)
  } catch (err) {
    console.error('Erro ao notificar atualização de status:', err.message)
  }
}

/**
 * Atualiza ou cria mensagem de token de cadastro
 */
const updateTokenMessage = async (token) => {
  try {
    const webhookUrl = await getConfig('webhook_token_cadastro')
    if (!webhookUrl) return

    const messageId = await getConfig('webhook_token_cadastro_message_id')
    const dataHora  = formatDate(new Date())

    const payload = {
      embeds: [{
        title: '🔑 Chave de Cadastro Atualizada',
        description: 'A chave anterior foi utilizada e uma nova foi gerada.',
        color: 0x9B59B6,
        fields: [
          { name: '🔑 Chave atual:', value: `\`\`\`${token}\`\`\``, inline: false },
          {
            name: 'ℹ️ Instruções',
            value: 'Use esta chave para cadastrar um novo forjador.\nA chave é de uso único — ao ser usada, uma nova será gerada.',
            inline: false
          }
        ],
        footer: { text: `Gerada em: ${dataHora}` }
      }]
    }

    if (messageId) {
      const webhookParts = webhookUrl.split('/')
      const webhookId    = webhookParts[webhookParts.length - 2]
      const webhookToken = webhookParts[webhookParts.length - 1]
      const editUrl      = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`

      const editResponse = await fetch(editUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!editResponse.ok) {
        await createNewTokenMessage(webhookUrl, payload)
      }
    } else {
      await createNewTokenMessage(webhookUrl, payload)
    }
  } catch (err) {
    console.error('Erro ao atualizar mensagem de token:', err.message)
  }
}

const createNewTokenMessage = async (webhookUrl, payload) => {
  const urlWithWait = `${webhookUrl}?wait=true`
  const response = await fetch(urlWithWait, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (response.ok) {
    const data = await response.json()
    if (data.id) {
      await pool.query(
        'UPDATE configuracoes SET valor = $1 WHERE chave = $2',
        [data.id, 'webhook_token_cadastro_message_id']
      )
    }
  }
}

/**
 * Envia DM para cliente no Discord via Bot Token
 *
 * Fluxo correto da API v10:
 *  1. POST /users/@me/channels  { recipient_id }  → cria/obtém DM channel
 *  2. POST /channels/{id}/messages  { embeds: [...] }  → envia mensagem
 *
 * Para obter o recipient_id, o Discord não permite busca por username.
 * O cliente precisa ter informado o User ID numérico (17-19 dígitos)
 * OU o sistema pode tentar pela tag antiga "usuario#1234" via Guild Members
 * se o bot estiver no servidor. Aqui suportamos ambos os formatos:
 *  - Só números → trata como User ID direto
 *  - "nome#discriminador" → tenta resolver via Discord CDN lookup (não funciona sem guild)
 *    e registra aviso orientando a usar o User ID
 */
const sendDiscordDM = async (discordTag, pedido, itens, novoStatus) => {
  if (!discordTag) return
  const botToken = await getConfig('discord_bot_token')
  if (!botToken) {
    console.log('[Discord DM] Bot Token não configurado — DM não enviada')
    return
  }

  try {
    // Determinar recipient_id
    let recipientId = null
    const soNumeros = /^\d{17,19}$/.test(discordTag.trim())

    if (soNumeros) {
      // Já é um User ID puro
      recipientId = discordTag.trim()
    } else {
      // Formato "usuario#1234" ou "@usuario" — não temos como resolver sem guild
      console.warn(
        `[Discord DM] "${discordTag}" não é um User ID numérico. ` +
        'Para DMs funcionarem, o cliente deve informar o ID Discord (17-19 dígitos). ' +
        'Acesse Configurações → Avançado → Modo Desenvolvedor no Discord e clique com o botão direito no seu perfil.'
      )
      return
    }

    // 1. Criar / abrir canal DM
    const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`
      },
      body: JSON.stringify({ recipient_id: recipientId })
    })

    if (!dmChannelRes.ok) {
      const err = await dmChannelRes.text()
      console.error(`[Discord DM] Falha ao criar canal DM (${dmChannelRes.status}):`, err)
      return
    }

    const dmChannel = await dmChannelRes.json()
    const channelId = dmChannel.id

    // 2. Montar embed da mensagem
    const itensText   = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n') || 'Nenhum item'
    const cor         = statusColor[novoStatus] || 0x7C3AED
    const emoji       = statusEmoji[novoStatus] || '🔔'
    const labelStatus = statusLabel[novoStatus] || novoStatus

    const msgPayload = {
      embeds: [{
        title: `${emoji} Atualização do seu Pedido ${pedido.registro_id}`,
        description: `Seu pedido foi atualizado para: **${labelStatus}**`,
        color: cor,
        fields: [
          { name: '📊 Status Atual', value: `${emoji} **${labelStatus}**`,                                                 inline: true },
          { name: '🆔 Registro ID', value: pedido.registro_id,                                                             inline: true },
          { name: '📦 Itens',       value: itensText,                                                                      inline: false },
          { name: '💰 Total',       value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`,                  inline: true },
          { name: '🕐 Atualizado',  value: formatDate(new Date()),                                                         inline: true }
        ],
        footer: { text: 'Sistema de Forja — Acompanhe seu pedido pelo Registro ID' }
      }]
    }

    // 3. Enviar mensagem no canal DM
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`
      },
      body: JSON.stringify(msgPayload)
    })

    if (!msgRes.ok) {
      const err = await msgRes.text()
      console.error(`[Discord DM] Falha ao enviar mensagem (${msgRes.status}):`, err)
      return
    }

    console.log(`[Discord DM] ✅ DM enviada para ${recipientId} — pedido ${pedido.registro_id} → ${labelStatus}`)
  } catch (err) {
    console.error('[Discord DM] Erro inesperado:', err.message)
  }
}

/**
 * Testa uma webhook enviando mensagem de teste
 */
const testWebhook = async (webhookUrl) => {
  const payload = {
    embeds: [{
      title: '✅ Teste de Webhook',
      description: 'Esta é uma mensagem de teste do Sistema de Forja.',
      color: 0x57D68A,
      footer: { text: `Testado em: ${formatDate(new Date())}` }
    }]
  }
  return await sendWebhook(webhookUrl, payload)
}

module.exports = {
  sendWebhook,
  notifyNovoPedido,
  notifyForjadorWebhook,
  notifyStatusAtualizado,
  updateTokenMessage,
  sendDiscordDM,
  testWebhook,
  getConfig
}
