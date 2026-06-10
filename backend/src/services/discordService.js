const fetch = require('node-fetch')
const pool  = require('../database')
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

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Envia (POST) ou edita (PATCH) uma mensagem em uma webhook do Discord.
 * @param {string} webhookUrl  URL completa da webhook
 * @param {object} payload     Corpo JSON da mensagem
 * @param {string|null} messageId  Se fornecido, edita a mensagem; caso contrário, cria uma nova
 * @param {boolean} waitResponse   Se true, usa ?wait=true para obter o objeto de mensagem de volta
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
const sendOrEditWebhook = async (webhookUrl, payload, messageId = null, waitResponse = false) => {
  if (!webhookUrl) return { success: false, error: 'Webhook não configurada' }

  try {
    let url, method

    if (messageId) {
      // Editar mensagem existente via PATCH
      const parts = webhookUrl.replace(/\/$/, '').split('/')
      const wId    = parts[parts.length - 2]
      const wToken = parts[parts.length - 1]
      url    = `https://discord.com/api/webhooks/${wId}/${wToken}/messages/${messageId}`
      method = 'PATCH'
    } else {
      // Criar nova mensagem via POST
      url    = waitResponse ? `${webhookUrl}?wait=true` : webhookUrl
      method = 'POST'
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text()
      // Se a mensagem original sumiu (404), sinaliza para criar uma nova
      if (response.status === 404 && messageId) {
        return { success: false, notFound: true, error: `Mensagem ${messageId} não encontrada` }
      }
      return { success: false, error: `Discord retornou ${response.status}: ${text}` }
    }

    // Retorna o id da mensagem criada (só disponível quando waitResponse=true ou PATCH)
    if (method === 'POST' && waitResponse) {
      const data = await response.json()
      return { success: true, messageId: data.id }
    }
    if (method === 'PATCH') {
      const data = await response.json()
      return { success: true, messageId: data.id }
    }

    return { success: true }
  } catch (err) {
    console.error('Erro ao enviar/editar webhook:', err.message)
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
 * Salva o discord_forjador_message_id no pedido
 */
const savePedidoMessageId = async (pedidoId, messageId) => {
  await pool.query(
    'UPDATE pedidos SET discord_forjador_message_id = $1 WHERE id = $2',
    [messageId, pedidoId]
  )
}

/**
 * Monta o embed completo do pedido com histórico de status.
 * Usado tanto na criação quanto na edição da mensagem.
 *
 * @param {object}   pedido        Linha da tabela pedidos
 * @param {array}    itens         Itens do pedido (com produto_nome, quantidade)
 * @param {array}    materiais     Materiais calculados (nome, total)
 * @param {array}    historicoStatus  [{ status, created_at }] — em ordem cronológica
 * @param {string}   forjadorNome  Nome do forjador responsável
 */
const buildPedidoEmbed = (pedido, itens, materiais, historicoStatus, forjadorNome) => {
  const statusAtual   = pedido.status
  const cor           = statusColor[statusAtual] || 0x7C3AED
  const emoji         = statusEmoji[statusAtual] || '🔔'

  const itensText     = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n')     || 'Nenhum item'
  const materiaisText = materiais && materiais.length
    ? materiais.map(m => `• ${m.nome} x${m.total}`).join('\n')
    : 'Sem materiais'

  // Histórico: uma linha por entrada, com emoji e data
  const historicoText = historicoStatus.length
    ? historicoStatus.map(h => {
        const em = statusEmoji[h.status] || '•'
        const lb = statusLabel[h.status] || h.status
        return `${em} **${lb}** — ${formatDate(h.created_at)}`
      }).join('\n')
    : `${emoji} **${statusLabel[statusAtual]}** — ${formatDate(new Date())}`

  return {
    embeds: [{
      title: `⚒️ Pedido ${pedido.registro_id}`,
      color: cor,
      fields: [
        { name: '👤 Cliente',               value: pedido.cliente_nome       || 'Não informado', inline: true  },
        { name: '🪪 Passaporte',            value: pedido.cliente_passaporte || 'Não informado', inline: true  },
        { name: '📦 Itens do Pedido',        value: itensText,                                    inline: false },
        { name: '⚒️ Materiais Necessários', value: materiaisText,                                 inline: false },
        { name: '💰 Total',                 value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true  },
        { name: '📊 Status Atual',          value: `${emoji} **${statusLabel[statusAtual]}**`,   inline: true  },
        { name: '📋 Histórico de Status',   value: historicoText,                                 inline: false }
      ],
      footer: { text: `Forjador: ${forjadorNome} | Última atualização: ${formatDate(new Date())}` }
    }]
  }
}

// ─── Funções públicas ────────────────────────────────────────────────────────

/**
 * Notifica forjador via webhook pessoal ao PUXAR pedido.
 * Cria a mensagem inicial e salva o message_id no banco.
 */
const notifyForjadorWebhook = async (forjadorWebhook, pedido, itens, materiais, forjadorNome) => {
  if (!forjadorWebhook) return

  try {
    // Histórico inicial: só o status atual (na_fila ou coletando — conforme puxado)
    const historicoInicial = [{
      status:     pedido.status,
      created_at: pedido.created_at || new Date()
    }]

    const payload = buildPedidoEmbed(pedido, itens, materiais, historicoInicial, forjadorNome)

    // POST com ?wait=true para obter o message_id de volta
    const result = await sendOrEditWebhook(forjadorWebhook, payload, null, true)

    if (result.success && result.messageId) {
      await savePedidoMessageId(pedido.id, result.messageId)
      console.log(`[Discord] Mensagem criada para pedido ${pedido.registro_id} — messageId: ${result.messageId}`)
    } else {
      console.error('[Discord] Falha ao criar mensagem do pedido:', result.error)
    }
  } catch (err) {
    console.error('Erro ao notificar forjador webhook (puxar):', err.message)
  }
}

/**
 * Atualiza (EDITA) a mensagem do forjador ao mudar status do pedido.
 * Busca o message_id salvo no banco e faz PATCH na mensagem existente,
 * acrescentando o novo status ao histórico.
 * Se a mensagem não existir mais (foi deletada), cria uma nova.
 */
const notifyStatusAtualizado = async (forjadorWebhook, pedido, itens, materiais, novoStatus, historicoLogs, forjadorNome) => {
  if (!forjadorWebhook) return

  try {
    // Busca o message_id salvo no banco para este pedido
    const pedidoRow = await pool.query(
      'SELECT discord_forjador_message_id FROM pedidos WHERE id = $1',
      [pedido.id]
    )
    const messageId = pedidoRow.rows[0]?.discord_forjador_message_id || null

    // Monta o embed com o histórico completo
    const pedidoAtualizado = { ...pedido, status: novoStatus }
    const payload = buildPedidoEmbed(pedidoAtualizado, itens, materiais, historicoLogs, forjadorNome)

    if (messageId) {
      // Tenta editar a mensagem existente via PATCH
      const result = await sendOrEditWebhook(forjadorWebhook, payload, messageId)

      if (!result.success && result.notFound) {
        // Mensagem foi deletada — cria uma nova e salva o novo id
        console.warn(`[Discord] Mensagem ${messageId} não encontrada, criando nova...`)
        const newResult = await sendOrEditWebhook(forjadorWebhook, payload, null, true)
        if (newResult.success && newResult.messageId) {
          await savePedidoMessageId(pedido.id, newResult.messageId)
          console.log(`[Discord] Nova mensagem criada para pedido ${pedido.registro_id} — messageId: ${newResult.messageId}`)
        }
      } else if (!result.success) {
        console.error('[Discord] Falha ao editar mensagem:', result.error)
      } else {
        console.log(`[Discord] Mensagem editada — pedido ${pedido.registro_id} → ${novoStatus}`)
      }
    } else {
      // Nunca houve mensagem (forjador não tinha webhook ao puxar) — cria agora
      const result = await sendOrEditWebhook(forjadorWebhook, payload, null, true)
      if (result.success && result.messageId) {
        await savePedidoMessageId(pedido.id, result.messageId)
        console.log(`[Discord] Mensagem inicial criada para pedido ${pedido.registro_id} — messageId: ${result.messageId}`)
      }
    }
  } catch (err) {
    console.error('Erro ao atualizar mensagem de status:', err.message)
  }
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
          { name: '👤 Cliente',    value: pedido.cliente_nome       || 'Não informado', inline: true  },
          { name: '🪪 Passaporte', value: pedido.cliente_passaporte || 'Não informado', inline: true  },
          { name: '📦 Itens',      value: itensText,                                    inline: false },
          { name: '💰 Total',      value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true },
          { name: '🆔 Registro',   value: pedido.registro_id,                           inline: true  }
        ],
        footer: { text: `Pedido recebido em: ${formatDate(pedido.created_at)}` }
      }]
    }

    await sendOrEditWebhook(webhookUrl, payload)
  } catch (err) {
    console.error('Erro ao notificar novo pedido:', err.message)
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
            name:  'ℹ️ Instruções',
            value: 'Use esta chave para cadastrar um novo forjador.\nA chave é de uso único — ao ser usada, uma nova será gerada.',
            inline: false
          }
        ],
        footer: { text: `Gerada em: ${dataHora}` }
      }]
    }

    if (messageId) {
      const result = await sendOrEditWebhook(webhookUrl, payload, messageId)
      if (!result.success && result.notFound) {
        // Mensagem sumiu — recria
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
  const result = await sendOrEditWebhook(webhookUrl, payload, null, true)
  if (result.success && result.messageId) {
    await pool.query(
      'UPDATE configuracoes SET valor = $1 WHERE chave = $2',
      [result.messageId, 'webhook_token_cadastro_message_id']
    )
  }
}

/**
 * Envia DM para cliente no Discord via Bot Token (Discord API v10)
 * Requer que o cliente tenha fornecido seu User ID numérico (17-19 dígitos)
 */
const sendDiscordDM = async (discordTag, pedido, itens, novoStatus) => {
  if (!discordTag) return
  const botToken = await getConfig('discord_bot_token')
  if (!botToken) {
    console.log('[Discord DM] Bot Token não configurado — DM não enviada')
    return
  }

  try {
    const soNumeros = /^\d{17,19}$/.test(discordTag.trim())
    if (!soNumeros) {
      console.warn(
        `[Discord DM] "${discordTag}" não é um User ID numérico. ` +
        'O cliente deve informar o User ID do Discord (17-19 dígitos).'
      )
      return
    }

    const recipientId = discordTag.trim()

    // 1. Criar / abrir canal DM
    const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bot ${botToken}` },
      body:    JSON.stringify({ recipient_id: recipientId })
    })
    if (!dmChannelRes.ok) {
      console.error(`[Discord DM] Falha ao criar canal (${dmChannelRes.status}):`, await dmChannelRes.text())
      return
    }
    const { id: channelId } = await dmChannelRes.json()

    // 2. Montar embed da atualização
    const emoji       = statusEmoji[novoStatus] || '🔔'
    const labelStatus = statusLabel[novoStatus]  || novoStatus
    const cor         = statusColor[novoStatus]  || 0x7C3AED
    const itensText   = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n') || 'Nenhum item'

    const msgPayload = {
      embeds: [{
        title:       `${emoji} Atualização do seu Pedido ${pedido.registro_id}`,
        description: `Seu pedido foi atualizado para: **${labelStatus}**`,
        color:       cor,
        fields: [
          { name: '📊 Status Atual', value: `${emoji} **${labelStatus}**`,                                        inline: true  },
          { name: '🆔 Registro ID',  value: pedido.registro_id,                                                    inline: true  },
          { name: '📦 Itens',        value: itensText,                                                             inline: false },
          { name: '💰 Total',        value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`,         inline: true  },
          { name: '🕐 Atualizado',   value: formatDate(new Date()),                                                inline: true  }
        ],
        footer: { text: 'Sistema de Forja — Acompanhe seu pedido pelo Registro ID' }
      }]
    }

    // 3. Enviar mensagem
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bot ${botToken}` },
      body:    JSON.stringify(msgPayload)
    })
    if (!msgRes.ok) {
      console.error(`[Discord DM] Falha ao enviar DM (${msgRes.status}):`, await msgRes.text())
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
      title:       '✅ Teste de Webhook',
      description: 'Esta é uma mensagem de teste do Sistema de Forja.',
      color:       0x57D68A,
      footer:      { text: `Testado em: ${formatDate(new Date())}` }
    }]
  }
  return await sendOrEditWebhook(webhookUrl, payload)
}

module.exports = {
  notifyNovoPedido,
  notifyForjadorWebhook,
  notifyStatusAtualizado,
  updateTokenMessage,
  sendDiscordDM,
  testWebhook,
  getConfig,
  // mantido para compatibilidade interna
  sendWebhook: (url, payload) => sendOrEditWebhook(url, payload)
}
