const pool = require('../database')
const { generateRegistroId } = require('../utils/generateId')
const { notifyNovoPedido, notifyForjadorWebhook } = require('./discordService')
const { logAction } = require('../middleware/logMiddleware')

/**
 * Busca itens de um pedido com nomes dos produtos
 */
const getPedidoItens = async (pedidoId, client = null) => {
  const query = client || pool
  const result = await query.query(
    `SELECT pi.*, p.nome as produto_nome, p.tipo as produto_tipo
     FROM pedido_itens pi
     JOIN produtos p ON pi.produto_id = p.id
     WHERE pi.pedido_id = $1`,
    [pedidoId]
  )
  return result.rows
}

/**
 * Calcula materiais necessários para os itens de um pedido
 */
const calcularMateriais = async (itens, client = null) => {
  const query = client || pool
  const materiaisMap = {}

  for (const item of itens) {
    const result = await query.query(
      `SELECT pm.quantidade, m.id, m.nome
       FROM produto_materiais pm
       JOIN materiais m ON pm.material_id = m.id
       WHERE pm.produto_id = $1`,
      [item.produto_id]
    )

    for (const mat of result.rows) {
      const key = mat.id
      if (!materiaisMap[key]) {
        materiaisMap[key] = { id: mat.id, nome: mat.nome, total: 0 }
      }
      materiaisMap[key].total += mat.quantidade * item.quantidade
    }
  }

  return Object.values(materiaisMap)
}

/**
 * Cria um pedido completo (cliente ou forjador)
 */
const criarPedido = async ({ clienteNome, clientePassaporte, clienteDiscordTag, forjadorId, itens, origem, semDadosCliente }) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Calcular total
    let total = 0
    for (const item of itens) {
      const prodResult = await client.query(
        'SELECT valor_unitario FROM produtos WHERE id = $1 AND ativo = TRUE',
        [item.produto_id]
      )
      if (prodResult.rows.length === 0) {
        throw new Error(`Produto ${item.produto_id} não encontrado ou inativo`)
      }
      total += prodResult.rows[0].valor_unitario * item.quantidade
    }

    // Gerar registro_id único
    const registroId = await generateRegistroId()

    // Criar pedido
    const pedidoResult = await client.query(
      `INSERT INTO pedidos 
       (registro_id, cliente_nome, cliente_passaporte, cliente_discord_tag, forjador_id, total, origem, sem_dados_cliente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        registroId,
        clienteNome || 'Não informado',
        clientePassaporte || 'Não informado',
        clienteDiscordTag || null,
        forjadorId || null,
        total,
        origem || 'cliente',
        semDadosCliente || false
      ]
    )

    const pedido = pedidoResult.rows[0]

    // Inserir itens do pedido
    for (const item of itens) {
      const prodResult = await client.query(
        'SELECT valor_unitario FROM produtos WHERE id = $1',
        [item.produto_id]
      )
      await client.query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, valor_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedido.id, item.produto_id, item.quantidade, prodResult.rows[0].valor_unitario]
      )
    }

    // Log
    await client.query(
      `INSERT INTO logs (tipo, descricao, actor_tipo, actor_id, pedido_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'pedido_criado',
        `Pedido ${registroId} criado via ${origem || 'cliente'}`,
        forjadorId ? 'forjador' : 'cliente',
        forjadorId || null,
        pedido.id
      ]
    )

    await client.query('COMMIT')

    // Buscar itens para notificações
    const itensCompletos = await getPedidoItens(pedido.id)

    // Disparar webhooks de forma assíncrona
    if (origem === 'cliente') {
      notifyNovoPedido(pedido, itensCompletos).catch(err =>
        console.error('Erro webhook novo pedido:', err.message)
      )
    }

    return { pedido, itens: itensCompletos }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Busca pedido completo com itens e materiais
 */
const getPedidoCompleto = async (pedidoId) => {
  const pedidoResult = await pool.query(
    `SELECT p.*, f.nome as forjador_nome
     FROM pedidos p
     LEFT JOIN forjadores f ON p.forjador_id = f.id
     WHERE p.id = $1`,
    [pedidoId]
  )

  if (pedidoResult.rows.length === 0) return null

  const pedido = pedidoResult.rows[0]
  const itens = await getPedidoItens(pedidoId)
  const materiais = await calcularMateriais(itens)

  return { pedido, itens, materiais }
}

module.exports = { criarPedido, getPedidoItens, calcularMateriais, getPedidoCompleto }
