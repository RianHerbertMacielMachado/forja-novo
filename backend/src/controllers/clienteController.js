const pool = require('../database')
const { criarPedido } = require('../services/pedidoService')

// Listar produtos ativos
const getProdutos = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
       json_agg(json_build_object('material_id', pm.material_id, 'nome', m.nome, 'quantidade', pm.quantidade)) 
         FILTER (WHERE pm.id IS NOT NULL) as materiais
       FROM produtos p
       LEFT JOIN produto_materiais pm ON pm.produto_id = p.id
       LEFT JOIN materiais m ON m.id = pm.material_id
       WHERE p.ativo = TRUE
       GROUP BY p.id
       ORDER BY p.tipo, p.nome`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar produtos' })
  }
}

// Criar pedido via cliente
const criarPedidoCliente = async (req, res) => {
  const { clienteNome, clientePassaporte, clienteDiscordTag, itens } = req.body

  if (!clienteNome || !clientePassaporte) {
    return res.status(400).json({ error: 'Nome e passaporte são obrigatórios' })
  }
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos um item ao carrinho' })
  }

  try {
    const { pedido, itens: itensCompletos } = await criarPedido({
      clienteNome,
      clientePassaporte,
      clienteDiscordTag,
      itens,
      origem: 'cliente'
    })
    res.status(201).json({
      message: 'Pedido criado com sucesso!',
      registro_id: pedido.registro_id,
      pedido_id: pedido.id,
      total: pedido.total
    })
  } catch (err) {
    console.error('Erro ao criar pedido:', err)
    res.status(500).json({ error: err.message || 'Erro ao criar pedido' })
  }
}

// Consultar pedido por registro_id ou passaporte
const consultarPedido = async (req, res) => {
  const { registro_id, passaporte } = req.query

  if (!registro_id && !passaporte) {
    return res.status(400).json({ error: 'Informe o registro_id ou passaporte' })
  }

  try {
    let pedidos = []

    if (registro_id) {
      const result = await pool.query(
        `SELECT p.*, f.nome as forjador_nome
         FROM pedidos p
         LEFT JOIN forjadores f ON p.forjador_id = f.id
         WHERE p.registro_id = $1`,
        [registro_id.toUpperCase()]
      )
      pedidos = result.rows
    } else {
      const result = await pool.query(
        `SELECT p.*, f.nome as forjador_nome
         FROM pedidos p
         LEFT JOIN forjadores f ON p.forjador_id = f.id
         WHERE p.cliente_passaporte ILIKE $1
         ORDER BY p.created_at DESC`,
        [passaporte]
      )
      pedidos = result.rows
    }

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Nenhum pedido encontrado com esses dados.' })
    }

    // Para cada pedido, buscar itens
    const pedidosCompletos = await Promise.all(pedidos.map(async (pedido) => {
      const itensResult = await pool.query(
        `SELECT pi.*, p.nome as produto_nome, p.tipo
         FROM pedido_itens pi
         JOIN produtos p ON pi.produto_id = p.id
         WHERE pi.pedido_id = $1`,
        [pedido.id]
      )

      const logsResult = await pool.query(
        `SELECT * FROM logs WHERE pedido_id = $1 ORDER BY created_at ASC`,
        [pedido.id]
      )

      return { ...pedido, itens: itensResult.rows, logs: logsResult.rows }
    }))

    if (registro_id) {
      return res.json(pedidosCompletos[0])
    }
    res.json(pedidosCompletos)
  } catch (err) {
    console.error('Erro ao consultar pedido:', err)
    res.status(500).json({ error: 'Erro ao consultar pedido' })
  }
}

module.exports = { getProdutos, criarPedidoCliente, consultarPedido }
