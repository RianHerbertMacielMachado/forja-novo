const bcrypt = require('bcryptjs')
const pool = require('../database')
const { logAction } = require('../middleware/logMiddleware')
const { createAndActivateToken } = require('../services/tokenService')
const { testWebhook, getConfig } = require('../services/discordService')

// Dashboard - estatísticas
const getDashboard = async (req, res) => {
  try {
    const [totalPedidos, pedidosHoje, pedidosSemana, faturamento,
      pedidosPorStatus, pedidosPorForjador, pedidos30dias, ultimosPedidos, produtoMaisVendido, materialMaisUsado] =
      await Promise.all([
        pool.query('SELECT COUNT(*) FROM pedidos'),
        pool.query(`SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) = CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM pedidos WHERE created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COALESCE(SUM(total), 0) as total FROM pedidos WHERE status = 'concluido'`),
        pool.query(`SELECT status, COUNT(*) as count FROM pedidos GROUP BY status`),
        pool.query(`
          SELECT f.nome, COUNT(p.id) as count 
          FROM pedidos p 
          JOIN forjadores f ON p.forjador_id = f.id 
          GROUP BY f.id, f.nome ORDER BY count DESC LIMIT 10
        `),
        pool.query(`
          SELECT DATE(created_at) as dia, COUNT(*) as count 
          FROM pedidos 
          WHERE created_at >= NOW() - INTERVAL '30 days' 
          GROUP BY DATE(created_at) ORDER BY dia ASC
        `),
        pool.query(`
          SELECT p.*, f.nome as forjador_nome 
          FROM pedidos p 
          LEFT JOIN forjadores f ON p.forjador_id = f.id 
          ORDER BY p.created_at DESC LIMIT 10
        `),
        pool.query(`
          SELECT pr.nome, SUM(pi.quantidade) as total_vendido
          FROM pedido_itens pi JOIN produtos pr ON pr.id = pi.produto_id
          GROUP BY pr.id, pr.nome ORDER BY total_vendido DESC LIMIT 1
        `),
        pool.query(`
          SELECT m.nome, SUM(pm.quantidade * pi.quantidade) as total_usado
          FROM pedido_itens pi
          JOIN produto_materiais pm ON pm.produto_id = pi.produto_id
          JOIN materiais m ON m.id = pm.material_id
          GROUP BY m.id, m.nome ORDER BY total_usado DESC LIMIT 1
        `)
      ])

    res.json({
      totalPedidos: parseInt(totalPedidos.rows[0].count),
      pedidosHoje: parseInt(pedidosHoje.rows[0].count),
      pedidosSemana: parseInt(pedidosSemana.rows[0].count),
      faturamento: parseFloat(faturamento.rows[0].total),
      pedidosPorStatus: pedidosPorStatus.rows,
      pedidosPorForjador: pedidosPorForjador.rows,
      pedidos30dias: pedidos30dias.rows,
      ultimosPedidos: ultimosPedidos.rows,
      produtoMaisVendido: produtoMaisVendido.rows[0] || null,
      materialMaisUsado: materialMaisUsado.rows[0] || null
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar dashboard' })
  }
}

// Listar forjadores
const getForjadores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, rp_id, username, active, created_at,
       discord_webhook IS NOT NULL AND discord_webhook != '' as tem_webhook
       FROM forjadores ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar forjadores' })
  }
}

// Atualizar forjador
const updateForjador = async (req, res) => {
  const { id } = req.params
  const { nome, rp_id, username, active } = req.body
  try {
    const result = await pool.query(
      `UPDATE forjadores SET nome = COALESCE($1, nome), rp_id = COALESCE($2, rp_id),
       username = COALESCE($3, username), active = COALESCE($4, active)
       WHERE id = $5 RETURNING id, nome, rp_id, username, active`,
      [nome, rp_id, username?.toLowerCase(), active, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forjador não encontrado' })
    await logAction('forjador_atualizado', `Forjador ID ${id} atualizado pelo admin`, 'admin', null)
    res.json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username já em uso' })
    res.status(500).json({ error: 'Erro ao atualizar forjador' })
  }
}

// Reset de senha de forjador
const resetSenhaForjador = async (req, res) => {
  const { id } = req.params
  const { novaSenha } = req.body
  if (!novaSenha || novaSenha.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' })
  }
  try {
    const hash = await bcrypt.hash(novaSenha, 12)
    await pool.query('UPDATE forjadores SET password_hash = $1 WHERE id = $2', [hash, id])
    await logAction('senha_resetada', `Senha do forjador ID ${id} resetada pelo admin`, 'admin', null)
    res.json({ message: 'Senha resetada com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resetar senha' })
  }
}

// Desativar forjador (soft delete)
const deleteForjador = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('UPDATE forjadores SET active = FALSE WHERE id = $1', [id])
    await logAction('forjador_desativado', `Forjador ID ${id} desativado pelo admin`, 'admin', null)
    res.json({ message: 'Forjador desativado com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar forjador' })
  }
}

// Listar todos os pedidos (admin)
const getPedidos = async (req, res) => {
  const { page = 1, limit = 20, data_inicio, data_fim } = req.query
  // Tratar strings vazias como ausentes
  const status      = req.query.status      || null
  const forjador_id = req.query.forjador_id || null
  const registro_id = req.query.registro_id || null
  const passaporte  = req.query.passaporte  || null
  try {
    let whereClause = 'WHERE 1=1'
    const filterParams = []
    let paramCount = 0

    if (status)      { filterParams.push(status);              whereClause += ` AND p.status = $${++paramCount}` }
    if (forjador_id) { filterParams.push(forjador_id);         whereClause += ` AND p.forjador_id = $${++paramCount}` }
    if (registro_id) { filterParams.push(`%${registro_id}%`);  whereClause += ` AND p.registro_id ILIKE $${++paramCount}` }
    if (passaporte)  { filterParams.push(`%${passaporte}%`);   whereClause += ` AND p.cliente_passaporte ILIKE $${++paramCount}` }
    if (data_inicio) { filterParams.push(data_inicio);         whereClause += ` AND p.created_at >= $${++paramCount}` }
    if (data_fim)    { filterParams.push(data_fim);            whereClause += ` AND p.created_at <= $${++paramCount}::date + interval '1 day'` }

    // COUNT separado com os mesmos filtros (sem subquery de itens para melhor performance)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM pedidos p ${whereClause}`,
      filterParams
    )

    // Query principal com paginação
    const pageParams = [...filterParams, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    const result = await pool.query(
      `SELECT p.*, f.nome as forjador_nome,
       (SELECT json_agg(json_build_object('produto_nome', pr.nome, 'quantidade', pi.quantidade))
        FROM pedido_itens pi JOIN produtos pr ON pr.id = pi.produto_id WHERE pi.pedido_id = p.id) as itens
       FROM pedidos p
       LEFT JOIN forjadores f ON p.forjador_id = f.id
       ${whereClause}
       ORDER BY p.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      pageParams
    )

    res.json({
      pedidos: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    })
  } catch (err) {
    console.error('[getPedidos]', err.message)
    res.status(500).json({ error: 'Erro ao buscar pedidos' })
  }
}

// Detalhes de um pedido (admin)
const getPedidoDetalhes = async (req, res) => {
  const { id } = req.params
  try {
    const pedidoResult = await pool.query(
      `SELECT p.*, f.nome as forjador_nome FROM pedidos p
       LEFT JOIN forjadores f ON p.forjador_id = f.id WHERE p.id = $1`,
      [id]
    )
    if (pedidoResult.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' })

    const pedido = pedidoResult.rows[0]
    const itens = await pool.query(
      `SELECT pi.*, pr.nome as produto_nome FROM pedido_itens pi
       JOIN produtos pr ON pr.id = pi.produto_id WHERE pi.pedido_id = $1`,
      [id]
    )
    const logs = await pool.query(
      `SELECT * FROM logs WHERE pedido_id = $1 ORDER BY created_at ASC`, [id]
    )
    res.json({ ...pedido, itens: itens.rows, logs: logs.rows })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pedido' })
  }
}

// Logs do sistema
const getLogs = async (req, res) => {
  // tipo='' (string vazia) deve ser tratado como ausente
  const { page = 1, limit = 50, data_inicio, data_fim } = req.query
  const tipo = req.query.tipo || null
  try {
    let whereClause = 'WHERE 1=1'
    const filterParams = []
    let paramCount = 0

    if (tipo) { filterParams.push(tipo); whereClause += ` AND tipo = $${++paramCount}` }
    if (data_inicio) { filterParams.push(data_inicio); whereClause += ` AND created_at >= $${++paramCount}` }
    if (data_fim) { filterParams.push(data_fim); whereClause += ` AND created_at <= $${++paramCount}::date + interval '1 day'` }

    // COUNT separado — sem ORDER BY para evitar erro no PostgreSQL
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM logs ${whereClause}`,
      filterParams
    )

    // Query principal com paginação
    const pageParams = [...filterParams, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    const result = await pool.query(
      `SELECT * FROM logs ${whereClause} ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      pageParams
    )

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    })
  } catch (err) {
    console.error('[getLogs]', err.message)
    res.status(500).json({ error: 'Erro ao buscar logs' })
  }
}

// Produtos (CRUD completo)
const getProdutos = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
       json_agg(json_build_object('id', pm.id, 'material_id', pm.material_id, 'nome', m.nome, 'quantidade', pm.quantidade))
         FILTER (WHERE pm.id IS NOT NULL) as materiais
       FROM produtos p
       LEFT JOIN produto_materiais pm ON pm.produto_id = p.id
       LEFT JOIN materiais m ON m.id = pm.material_id
       GROUP BY p.id ORDER BY p.tipo, p.nome`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' })
  }
}

const createProduto = async (req, res) => {
  const { nome, tipo, valor_unitario, quantidade_minima = 1, multiplo_quantidade = 1, ativo = true, materiais = [] } = req.body
  if (!nome || !tipo || !valor_unitario) return res.status(400).json({ error: 'Nome, tipo e valor são obrigatórios' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO produtos (nome, tipo, valor_unitario, quantidade_minima, multiplo_quantidade, ativo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, tipo, valor_unitario, quantidade_minima, multiplo_quantidade, ativo]
    )
    const produto = result.rows[0]
    for (const mat of materiais) {
      await client.query(
        'INSERT INTO produto_materiais (produto_id, material_id, quantidade) VALUES ($1, $2, $3)',
        [produto.id, mat.material_id, mat.quantidade]
      )
    }
    await client.query('COMMIT')
    await logAction('produto_criado', `Produto ${nome} criado`, 'admin', null)
    res.status(201).json(produto)
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(400).json({ error: 'Produto com este nome já existe' })
    res.status(500).json({ error: 'Erro ao criar produto' })
  } finally {
    client.release()
  }
}

const deleteProduto = async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Verificar se o produto está em algum pedido ativo (não concluído)
    const emUso = await client.query(
      `SELECT COUNT(*) FROM pedido_itens pi
       JOIN pedidos p ON p.id = pi.pedido_id
       WHERE pi.produto_id = $1 AND p.status != 'concluido'`,
      [id]
    )
    if (parseInt(emUso.rows[0].count) > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Produto está em pedidos ativos. Conclua ou remova os pedidos antes de deletar.' })
    }

    // Remover materiais do produto primeiro (FK)
    await client.query('DELETE FROM produto_materiais WHERE produto_id = $1', [id])

    // Remover itens de pedidos concluídos (histórico)
    await client.query('DELETE FROM pedido_itens WHERE produto_id = $1', [id])

    // Deletar o produto
    const result = await client.query('DELETE FROM produtos WHERE id = $1 RETURNING nome', [id])
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produto não encontrado' })
    }

    await client.query('COMMIT')
    await logAction('produto_deletado', `Produto "${result.rows[0].nome}" (ID ${id}) deletado pelo admin`, 'admin', null)
    res.json({ message: `Produto "${result.rows[0].nome}" deletado com sucesso!` })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[deleteProduto]', err.message)
    res.status(500).json({ error: 'Erro ao deletar produto' })
  } finally {
    client.release()
  }
}

const updateProduto = async (req, res) => {
  const { id } = req.params
  const { nome, tipo, valor_unitario, quantidade_minima, multiplo_quantidade, ativo, materiais } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE produtos SET nome = COALESCE($1, nome), tipo = COALESCE($2, tipo),
       valor_unitario = COALESCE($3, valor_unitario), quantidade_minima = COALESCE($4, quantidade_minima),
       multiplo_quantidade = COALESCE($5, multiplo_quantidade), ativo = COALESCE($6, ativo)
       WHERE id = $7`,
      [nome, tipo, valor_unitario, quantidade_minima, multiplo_quantidade, ativo, id]
    )
    if (materiais !== undefined) {
      await client.query('DELETE FROM produto_materiais WHERE produto_id = $1', [id])
      for (const mat of materiais) {
        await client.query(
          'INSERT INTO produto_materiais (produto_id, material_id, quantidade) VALUES ($1, $2, $3)',
          [id, mat.material_id, mat.quantidade]
        )
      }
    }
    await client.query('COMMIT')
    await logAction('produto_atualizado', `Produto ID ${id} atualizado`, 'admin', null)
    res.json({ message: 'Produto atualizado com sucesso!' })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(400).json({ error: 'Produto com este nome já existe' })
    res.status(500).json({ error: 'Erro ao atualizar produto' })
  } finally {
    client.release()
  }
}

// Materiais
const getMateriais = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiais ORDER BY nome')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar materiais' })
  }
}

const createMaterial = async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  try {
    const result = await pool.query('INSERT INTO materiais (nome) VALUES ($1) RETURNING *', [nome])
    await logAction('material_criado', `Material ${nome} criado`, 'admin', null)
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Material com este nome já existe' })
    res.status(500).json({ error: 'Erro ao criar material' })
  }
}

const updateMaterial = async (req, res) => {
  const { id } = req.params
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  try {
    const result = await pool.query('UPDATE materiais SET nome = $1 WHERE id = $2 RETURNING *', [nome, id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Nome de material já em uso' })
    res.status(500).json({ error: 'Erro ao atualizar material' })
  }
}

const deleteMaterial = async (req, res) => {
  const { id } = req.params
  try {
    const emUso = await pool.query('SELECT id FROM produto_materiais WHERE material_id = $1 LIMIT 1', [id])
    if (emUso.rows.length > 0) {
      return res.status(400).json({ error: 'Material em uso por um ou mais produtos. Remova dos produtos antes de deletar.' })
    }
    await pool.query('DELETE FROM materiais WHERE id = $1', [id])
    res.json({ message: 'Material deletado com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar material' })
  }
}

// Configurações
const getConfiguracoes = async (req, res) => {
  try {
    const result = await pool.query('SELECT chave, valor FROM configuracoes')
    const config = {}
    result.rows.forEach(row => {
      // Não expor tokens sensíveis diretamente
      if (['discord_bot_token'].includes(row.chave)) {
        config[row.chave] = row.valor ? '***configurado***' : ''
      } else {
        config[row.chave] = row.valor
      }
    })
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações' })
  }
}

const updateConfiguracao = async (req, res) => {
  const { chave, valor } = req.body
  const chavesPermitidas = [
    'webhook_novos_pedidos', 'webhook_token_cadastro', 'discord_bot_token'
  ]
  if (!chavesPermitidas.includes(chave)) {
    return res.status(400).json({ error: 'Chave de configuração não permitida' })
  }
  try {
    await pool.query(
      'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2',
      [chave, valor]
    )
    if (chave === 'discord_bot_token') {
      await logAction('configuracao_atualizada', `Configuração discord_bot_token atualizada`, 'admin', null)
    } else {
      await logAction('configuracao_atualizada', `Configuração ${chave} atualizada`, 'admin', null)
    }
    res.json({ message: 'Configuração salva com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração' })
  }
}

// Gerar novo token de cadastro
const gerarNovoToken = async (req, res) => {
  try {
    const token = await createAndActivateToken()
    await logAction('token_gerado', `Novo token de cadastro gerado pelo admin`, 'admin', null)
    res.json({ token, message: 'Novo token gerado com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar token' })
  }
}

// Testar webhook
const testarWebhook = async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL da webhook é obrigatória' })
  const result = await testWebhook(url)
  if (result.success) {
    res.json({ message: 'Webhook testada com sucesso!' })
  } else {
    res.status(400).json({ error: `Erro ao testar webhook: ${result.error}` })
  }
}

// Alterar senha admin
const alterarSenhaAdmin = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body
  if (!senhaAtual || !novaSenha || novaSenha.length < 8) {
    return res.status(400).json({ error: 'Senha inválida. Mínimo 8 caracteres.' })
  }
  try {
    const adminUsername = req.user.username
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [adminUsername])

    let senhaAtualValida = false
    if (result.rows.length > 0) {
      senhaAtualValida = await bcrypt.compare(senhaAtual, result.rows[0].password_hash)
    } else {
      senhaAtualValida = senhaAtual === (process.env.ADMIN_PASSWORD || 'admin123')
    }

    if (!senhaAtualValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    const novoHash = await bcrypt.hash(novaSenha, 12)
    if (result.rows.length > 0) {
      await pool.query('UPDATE admins SET password_hash = $1 WHERE username = $2', [novoHash, adminUsername])
    } else {
      await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [adminUsername, novoHash])
    }
    await logAction('admin_senha_alterada', `Admin ${adminUsername} alterou a senha`, 'admin', null)
    res.json({ message: 'Senha alterada com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' })
  }
}

// Exportar logs CSV
const exportarLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs ORDER BY created_at DESC')
    const header = 'ID,Tipo,Descrição,Actor Tipo,Actor ID,Pedido ID,Data\n'
    const rows = result.rows.map(l =>
      `${l.id},"${l.tipo}","${l.descricao?.replace(/"/g, '""')}","${l.actor_tipo || ''}",${l.actor_id || ''},${l.pedido_id || ''},"${l.created_at}"`
    ).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="logs-${Date.now()}.csv"`)
    res.send('\uFEFF' + header + rows) // BOM para UTF-8 no Excel
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar logs' })
  }
}

module.exports = {
  getDashboard, getForjadores, updateForjador, resetSenhaForjador, deleteForjador,
  getPedidos, getPedidoDetalhes, getLogs, exportarLogs,
  getProdutos, createProduto, updateProduto, deleteProduto,
  getMateriais, createMaterial, updateMaterial, deleteMaterial,
  getConfiguracoes, updateConfiguracao, gerarNovoToken, testarWebhook, alterarSenhaAdmin
}
