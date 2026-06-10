const pool = require('../database')
const { generateToken } = require('../utils/generateId')
const { updateTokenMessage } = require('./discordService')

/**
 * Gera um novo token de cadastro único
 */
const generateNewToken = async () => {
  let token
  let exists = true
  let attempts = 0

  while (exists && attempts < 20) {
    token = generateToken(8)
    const result = await pool.query(
      'SELECT id FROM registration_tokens WHERE token = $1',
      [token]
    )
    exists = result.rows.length > 0
    attempts++
  }

  return token
}

/**
 * Cria novo token no banco e atualiza configuração
 */
const createAndActivateToken = async () => {
  const token = await generateNewToken()

  await pool.query(
    'INSERT INTO registration_tokens (token) VALUES ($1)',
    [token]
  )

  await pool.query(
    'UPDATE configuracoes SET valor = $1 WHERE chave = $2',
    [token, 'token_cadastro_atual']
  )

  // Disparar atualização no Discord de forma assíncrona
  updateTokenMessage(token).catch(err => {
    console.error('Erro ao atualizar mensagem Discord:', err.message)
  })

  return token
}

/**
 * Valida se um token existe e não foi usado
 */
const validateToken = async (token) => {
  const result = await pool.query(
    'SELECT * FROM registration_tokens WHERE token = $1 AND used = FALSE',
    [token.toUpperCase()]
  )
  return result.rows[0] || null
}

/**
 * Marca token como usado
 */
const markTokenAsUsed = async (token, forjadorId, client = null) => {
  const query = client || pool
  await query.query(
    `UPDATE registration_tokens 
     SET used = TRUE, used_at = NOW(), used_by = $1 
     WHERE token = $2`,
    [forjadorId, token.toUpperCase()]
  )
}

module.exports = { generateNewToken, createAndActivateToken, validateToken, markTokenAsUsed }
