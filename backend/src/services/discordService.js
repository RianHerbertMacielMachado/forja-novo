const fetch = require('node-fetch')
const pool = require('../database')
const { formatDate, statusLabel } = require('../utils/formatters')

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
        color: 3447003,
        fields: [
          { name: '👤 Cliente', value: pedido.cliente_nome || 'Não informado', inline: true },
          { name: '🪪 Passaporte', value: pedido.cliente_passaporte || 'Não informado', inline: true },
          { name: '📦 Itens', value: itensText, inline: false },
          { name: '💰 Total', value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true },
          { name: '🆔 Registro', value: pedido.registro_id, inline: true }
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
    const itensText = itens.map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n') || 'Nenhum item'
    const materiaisText = materiais.map(m => `• ${m.nome} x${m.total}`).join('\n') || 'Sem materiais'

    const payload = {
      embeds: [{
        title: `✅ Pedido ${pedido.registro_id} — ${statusLabel[pedido.status] || pedido.status}`,
        color: 5763719,
        fields: [
          { name: '👤 Cliente', value: pedido.cliente_nome || 'Não informado', inline: true },
          { name: '🪪 Passaporte', value: pedido.cliente_passaporte || 'Não informado', inline: true },
          { name: '📦 Itens do Pedido', value: itensText, inline: false },
          { name: '⚒️ Materiais Necessários', value: materiaisText, inline: false },
          { name: '💰 Total', value: `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`, inline: true }
        ],
        footer: { text: `Forjador: ${forjadorNome} | Pedido: ${pedido.registro_id} • ${formatDate(new Date())}` }
      }]
    }

    await sendWebhook(forjadorWebhook, payload)
  } catch (err) {
    console.error('Erro ao notificar forjador webhook:', err.message)
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
    const dataHora = formatDate(new Date())

    const payload = {
      embeds: [{
        title: '🔑 Chave de Cadastro Atualizada',
        description: 'A chave anterior foi utilizada e uma nova foi gerada.',
        color: 10181046,
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
      // Tentar editar mensagem existente via PATCH
      const webhookParts = webhookUrl.split('/')
      const webhookId = webhookParts[webhookParts.length - 2]
      const webhookToken = webhookParts[webhookParts.length - 1]
      const editUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`

      const editResponse = await fetch(editUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!editResponse.ok) {
        // Criar nova mensagem se edição falhar
        await createNewTokenMessage(webhookUrl, payload)
      }
    } else {
      // Criar nova mensagem e salvar message_id
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
 * Envia DM para cliente no Discord (requer bot token)
 */
const sendDiscordDM = async (discordTag, pedido, itens, forjadorNome) => {
  const botToken = await getConfig('discord_bot_token')
  if (!botToken || !discordTag) return

  try {
    // Buscar ID do usuário pelo username
    const userSearch = await fetch(`https://discord.com/api/v10/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` }
    })

    if (!userSearch.ok) return

    // Nota: Discord não permite buscar usuário por username diretamente
    // Seria necessário ter o ID do usuário. Por ora, log que funcionalidade
    // requer implementação adicional com ID do Discord
    console.log(`DM Discord: funcionalidade requer Discord User ID para ${discordTag}`)
  } catch (err) {
    console.error('Erro ao enviar DM Discord:', err.message)
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
      color: 5763719,
      footer: { text: `Testado em: ${formatDate(new Date())}` }
    }]
  }
  return await sendWebhook(webhookUrl, payload)
}

module.exports = {
  sendWebhook,
  notifyNovoPedido,
  notifyForjadorWebhook,
  updateTokenMessage,
  sendDiscordDM,
  testWebhook,
  getConfig
}
