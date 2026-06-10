const pool = require('../database')

const logAction = async (tipo, descricao, actorTipo = null, actorId = null, pedidoId = null) => {
  try {
    await pool.query(
      `INSERT INTO logs (tipo, descricao, actor_tipo, actor_id, pedido_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [tipo, descricao, actorTipo, actorId, pedidoId]
    )
  } catch (err) {
    console.error('Erro ao registrar log:', err.message)
  }
}

module.exports = { logAction }
