const pool = require('../database')

/**
 * Gera um registro_id único no formato #XXXXX (5 chars alfanuméricos maiúsculos)
 */
const generateRegistroId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let registroId
  let exists = true
  let attempts = 0

  while (exists && attempts < 20) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    registroId = `#${code}`

    const result = await pool.query(
      'SELECT id FROM pedidos WHERE registro_id = $1',
      [registroId]
    )
    exists = result.rows.length > 0
    attempts++
  }

  if (attempts >= 20) {
    throw new Error('Não foi possível gerar um registro_id único')
  }

  return registroId
}

/**
 * Gera um token de 8 chars alfanuméricos maiúsculos
 */
const generateToken = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

module.exports = { generateRegistroId, generateToken }
