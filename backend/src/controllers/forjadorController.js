const bcrypt = require('bcryptjs')
const pool = require('../database')
const { criarPedido, getPedidoItens, calcularMateriais } = require('../services/pedidoService')
const { notifyForjadorWebhook, notifyStatusAtualizado, sendDiscordDM } = require('../services/discordService')
const { logAction } = require('../middleware/logMiddleware')
const { statusLabel } = require('../utils/formatters')

// Listar fila de pedidos (sem forjador atribuído)
const getFila = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
       json_agg(json_build_object(
         'produto_id', pi.produto_id,
         'produto_nome', pr.nome,
         'quantidade', pi.quantidade,
         'valor_unitario', pi.valor_unitario
       )) as itens
       FROM pedidos p
       JOIN pedido_itens pi ON pi.pedido_id = p.id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE p.status = 'na_fila' AND p.forjador_id IS NULL
       GROUP BY p.id
       ORDER BY p.created_at ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar fila' })
  }
}

// Puxar pedido da fila
const puxarPedido = async (req, res) => {
  const { pedidoId } = req.params
  const forjadorId = req.user.id
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const pedidoCheck = await client.query(
        'SELECT * FROM pedidos WHERE id = $1 AND forjador_id IS NULL AND status = $2',
        [pedidoId, 'na_fila']
      )
      if (pedidoCheck.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Pedido não disponível' })
      }

      const pedidoResult = await client.query(
        `UPDATE pedidos SET forjador_id = $1, updated_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [forjadorId, pedidoId]
      )
      const pedido = pedidoResult.rows[0]

      await client.query(
        `INSERT INTO logs (tipo, descricao, actor_tipo, actor_id, pedido_id) VALUES ($1,$2,$3,$4,$5)`,
        ['pedido_puxado', `Pedido ${pedido.registro_id} puxado pelo forjador`, 'forjador', forjadorId, pedido.id]
      )

      await client.query('COMMIT')

      const itens = await getPedidoItens(pedido.id)
      const materiais = await calcularMateriais(itens)

      const forjadorResult = await pool.query('SELECT * FROM forjadores WHERE id = $1', [forjadorId])
      const forjador = forjadorResult.rows[0]

      if (forjador.discord_webhook) {
        notifyForjadorWebhook(forjador.discord_webhook, pedido, itens, materiais, forjador.nome)
          .catch(e => console.error(e.message))
      }

      res.json({ message: 'Pedido puxado com sucesso!', pedido })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao puxar pedido' })
  }
}

// Meus pedidos em atendimento
const getMeusPedidos = async (req, res) => {
  const forjadorId = req.user.id
  try {
    const result = await pool.query(
      `SELECT p.*,
       json_agg(json_build_object(
         'produto_id', pi.produto_id,
         'produto_nome', pr.nome,
         'produto_tipo', pr.tipo,
         'quantidade', pi.quantidade,
         'valor_unitario', pi.valor_unitario
       )) as itens
       FROM pedidos p
       JOIN pedido_itens pi ON pi.pedido_id = p.id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE p.forjador_id = $1 AND p.status != 'concluido'
       GROUP BY p.id
       ORDER BY p.created_at ASC`,
      [forjadorId]
    )

    const pedidosComMateriais = await Promise.all(result.rows.map(async (pedido) => {
      const materiais = await calcularMateriais(pedido.itens)
      return { ...pedido, materiais }
    }))

    res.json(pedidosComMateriais)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar pedidos' })
  }
}

// Atualizar status do pedido
const updateStatus = async (req, res) => {
  const { pedidoId } = req.params
  const { status } = req.body
  const forjadorId = req.user.id
  const statusValidos = ['na_fila', 'coletando_materiais', 'em_producao', 'concluido']

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' })
  }

  try {
    const pedidoCheck = await pool.query(
      'SELECT * FROM pedidos WHERE id = $1 AND forjador_id = $2',
      [pedidoId, forjadorId]
    )
    if (pedidoCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Pedido não encontrado ou sem permissão' })
    }

    const result = await pool.query(
      `UPDATE pedidos SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, pedidoId]
    )
    const pedido = result.rows[0]

    // Gravar log de atualização de status
    await logAction(
      'status_atualizado',
      `Status do pedido ${pedido.registro_id} atualizado para: ${statusLabel[status]}`,
      'forjador',
      forjadorId,
      pedido.id
    )

    // ── Notificações Discord (async, não bloqueiam a resposta) ──────────────
    setImmediate(async () => {
      try {
        const itens     = await getPedidoItens(pedido.id)
        const materiais = await calcularMateriais(itens)

        // 1. Buscar histórico de status do pedido nos logs
        const logsResult = await pool.query(
          `SELECT descricao, created_at,
                  CASE
                    WHEN descricao LIKE '%Na Fila%'               THEN 'na_fila'
                    WHEN descricao LIKE '%Coletando Materiais%'   THEN 'coletando_materiais'
                    WHEN descricao LIKE '%Em Produção%'           THEN 'em_producao'
                    WHEN descricao LIKE '%Concluído%'             THEN 'concluido'
                    ELSE NULL
                  END as status
           FROM logs
           WHERE pedido_id = $1
             AND tipo = 'status_atualizado'
           ORDER BY created_at ASC`,
          [pedido.id]
        )
        const historico = logsResult.rows.filter(r => r.status !== null)

        // 2. Notificar webhook pessoal do forjador — EDITA mensagem existente
        const forjadorResult = await pool.query(
          'SELECT discord_webhook, nome FROM forjadores WHERE id = $1',
          [forjadorId]
        )
        const forjador = forjadorResult.rows[0]
        if (forjador?.discord_webhook) {
          await notifyStatusAtualizado(
            forjador.discord_webhook,
            pedido,
            itens,
            materiais,     // ← materiais calculados
            status,
            historico,
            forjador.nome  // ← nome do forjador
          )
        }

        // 3. Enviar DM ao cliente se ele informou Discord ID
        if (pedido.cliente_discord_tag) {
          await sendDiscordDM(pedido.cliente_discord_tag, pedido, itens, status)
        }
      } catch (notifyErr) {
        console.error('[updateStatus] Erro nas notificações Discord:', notifyErr.message)
      }
    })
    // ────────────────────────────────────────────────────────────────────────

    res.json({ message: 'Status atualizado!', pedido })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar status' })
  }
}

// Criar pedido via forjador
const criarPedidoForjador = async (req, res) => {
  const { clienteNome, clientePassaporte, clienteDiscordTag, itens, semDadosCliente } = req.body
  const forjadorId = req.user.id

  if (!semDadosCliente && (!clienteNome || !clientePassaporte)) {
    return res.status(400).json({ error: 'Nome e passaporte são obrigatórios' })
  }
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos um item' })
  }

  try {
    const { pedido, itens: itensCompletos } = await criarPedido({
      clienteNome: clienteNome || 'Não informado',
      clientePassaporte: clientePassaporte || 'N/A',
      clienteDiscordTag,
      forjadorId,
      itens,
      origem: 'forjador',
      semDadosCliente: !!semDadosCliente
    })

    const materiais = await calcularMateriais(itensCompletos)
    const forjadorResult = await pool.query('SELECT * FROM forjadores WHERE id = $1', [forjadorId])
    const forjador = forjadorResult.rows[0]

    if (forjador.discord_webhook) {
      notifyForjadorWebhook(forjador.discord_webhook, pedido, itensCompletos, materiais, forjador.nome)
        .catch(e => console.error(e.message))
    }

    res.status(201).json({
      message: 'Pedido criado com sucesso!',
      registro_id: pedido.registro_id,
      pedido_id: pedido.id
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Erro ao criar pedido' })
  }
}

// Listar transferências recebidas pendentes
const getTransferenciasRecebidas = async (req, res) => {
  const forjadorId = req.user.id
  try {
    const result = await pool.query(
      `SELECT pt.*, 
       fo.nome as forjador_origem_nome,
       p.registro_id, p.cliente_nome, p.cliente_passaporte, p.total, p.status as pedido_status,
       json_agg(json_build_object(
         'produto_nome', pr.nome, 
         'quantidade', pi.quantidade
       )) as itens
       FROM pedido_transferencias pt
       JOIN forjadores fo ON fo.id = pt.forjador_origem_id
       JOIN pedidos p ON p.id = pt.pedido_id
       JOIN pedido_itens pi ON pi.pedido_id = p.id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE pt.forjador_destino_id = $1 AND pt.status = 'pendente'
       GROUP BY pt.id, fo.nome, p.registro_id, p.cliente_nome, p.cliente_passaporte, p.total, p.status`,
      [forjadorId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar transferências' })
  }
}

// Solicitar transferência de pedido
const solicitarTransferencia = async (req, res) => {
  const { pedidoId } = req.params
  const { forjadorDestinoId } = req.body
  const forjadorOrigemId = req.user.id

  try {
    const pedidoCheck = await pool.query(
      'SELECT * FROM pedidos WHERE id = $1 AND forjador_id = $2',
      [pedidoId, forjadorOrigemId]
    )
    if (pedidoCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Pedido não encontrado ou sem permissão' })
    }

    // Verificar se já existe transferência pendente
    const transferCheck = await pool.query(
      `SELECT id FROM pedido_transferencias 
       WHERE pedido_id = $1 AND status = 'pendente'`,
      [pedidoId]
    )
    if (transferCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe uma transferência pendente para este pedido' })
    }

    const result = await pool.query(
      `INSERT INTO pedido_transferencias (pedido_id, forjador_origem_id, forjador_destino_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [pedidoId, forjadorOrigemId, forjadorDestinoId]
    )

    const pedido = pedidoCheck.rows[0]
    await logAction(
      'transferencia_solicitada',
      `Transferência do pedido ${pedido.registro_id} solicitada`,
      'forjador', forjadorOrigemId, pedido.id
    )

    res.status(201).json({ message: 'Transferência solicitada com sucesso!' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao solicitar transferência' })
  }
}

// Responder transferência (aceitar/recusar)
const responderTransferencia = async (req, res) => {
  const { transferenciaId } = req.params
  const { acao } = req.body // 'aceitar' ou 'recusar'
  const forjadorId = req.user.id

  if (!['aceitar', 'recusar'].includes(acao)) {
    return res.status(400).json({ error: 'Ação inválida' })
  }

  try {
    const transResult = await pool.query(
      `SELECT * FROM pedido_transferencias 
       WHERE id = $1 AND forjador_destino_id = $2 AND status = 'pendente'`,
      [transferenciaId, forjadorId]
    )
    if (transResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transferência não encontrada' })
    }
    const transferencia = transResult.rows[0]

    if (acao === 'aceitar') {
      await pool.query(
        `UPDATE pedido_transferencias SET status = 'aceito' WHERE id = $1`,
        [transferenciaId]
      )
      await pool.query(
        `UPDATE pedidos SET forjador_id = $1, updated_at = NOW() WHERE id = $2`,
        [forjadorId, transferencia.pedido_id]
      )
      const pedidoResult = await pool.query('SELECT * FROM pedidos WHERE id = $1', [transferencia.pedido_id])
      const pedido = pedidoResult.rows[0]
      await logAction('transferencia_aceita', `Transferência do pedido ${pedido.registro_id} aceita`, 'forjador', forjadorId, pedido.id)

      // Notificar forjador destino
      const forjadorResult = await pool.query('SELECT * FROM forjadores WHERE id = $1', [forjadorId])
      if (forjadorResult.rows[0].discord_webhook) {
        const itens = await getPedidoItens(pedido.id)
        const materiais = await calcularMateriais(itens)
        notifyForjadorWebhook(forjadorResult.rows[0].discord_webhook, pedido, itens, materiais, forjadorResult.rows[0].nome)
          .catch(e => console.error(e.message))
      }
    } else {
      await pool.query(
        `UPDATE pedido_transferencias SET status = 'recusado' WHERE id = $1`,
        [transferenciaId]
      )
      const pedidoResult = await pool.query('SELECT registro_id, id FROM pedidos WHERE id = $1', [transferencia.pedido_id])
      const pedido = pedidoResult.rows[0]
      await logAction('transferencia_recusada', `Transferência do pedido ${pedido.registro_id} recusada`, 'forjador', forjadorId, pedido.id)
    }

    res.json({ message: `Transferência ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso!` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao responder transferência' })
  }
}

// Listar forjadores ativos (para transferência)
const getForjadoresAtivos = async (req, res) => {
  const forjadorId = req.user.id
  try {
    const result = await pool.query(
      'SELECT id, nome, rp_id, username FROM forjadores WHERE active = TRUE AND id != $1 ORDER BY nome',
      [forjadorId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar forjadores' })
  }
}

// Atualizar webhook do forjador
const updateWebhook = async (req, res) => {
  const forjadorId = req.user.id
  const { discord_webhook } = req.body
  try {
    await pool.query(
      'UPDATE forjadores SET discord_webhook = $1 WHERE id = $2',
      [discord_webhook || null, forjadorId]
    )
    res.json({ message: 'Webhook atualizada com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar webhook' })
  }
}

// Alterar senha do forjador
const alterarSenha = async (req, res) => {
  const forjadorId = req.user.id
  const { senhaAtual, novaSenha, confirmaSenha } = req.body

  if (!senhaAtual || !novaSenha || !confirmaSenha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  }
  if (novaSenha !== confirmaSenha) {
    return res.status(400).json({ error: 'Senhas não coincidem' })
  }
  if (novaSenha.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' })
  }

  try {
    const result = await pool.query('SELECT * FROM forjadores WHERE id = $1', [forjadorId])
    const forjador = result.rows[0]
    const valid = await bcrypt.compare(senhaAtual, forjador.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }
    const novoHash = await bcrypt.hash(novaSenha, 12)
    await pool.query('UPDATE forjadores SET password_hash = $1 WHERE id = $2', [novoHash, forjadorId])
    await logAction('senha_alterada', `Forjador ${forjador.nome} alterou a senha`, 'forjador', forjadorId)
    res.json({ message: 'Senha alterada com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' })
  }
}

// Buscar dados do forjador logado
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, rp_id, username, discord_webhook, created_at FROM forjadores WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forjador não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados' })
  }
}

// Contar transferências pendentes
const countTransferenciasPendentes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM pedido_transferencias WHERE forjador_destino_id = $1 AND status = 'pendente'`,
      [req.user.id]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao contar transferências' })
  }
}

// Produtos ativos para forjador
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
    res.status(500).json({ error: 'Erro ao buscar produtos' })
  }
}

module.exports = {
  getFila, puxarPedido, getMeusPedidos, updateStatus, criarPedidoForjador,
  getTransferenciasRecebidas, solicitarTransferencia, responderTransferencia,
  getForjadoresAtivos, updateWebhook, alterarSenha, getMe, countTransferenciasPendentes, getProdutos
}
