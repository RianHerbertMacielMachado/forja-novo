const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../database')
const { logAction } = require('../middleware/logMiddleware')
const { validateToken, markTokenAsUsed, createAndActivateToken } = require('../services/tokenService')

// Login de Forjador
const loginForjador = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha obrigatórios' })
  }
  try {
    const result = await pool.query(
      'SELECT * FROM forjadores WHERE username = $1 AND active = TRUE',
      [username.toLowerCase()]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    const forjador = result.rows[0]
    const valid = await bcrypt.compare(password, forjador.password_hash)
    if (!valid) {
      await logAction('login_falhou', `Tentativa de login falhou para usuário: ${username}`, 'forjador', null)
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    const token = jwt.sign(
      { id: forjador.id, username: forjador.username, nome: forjador.nome, role: 'forjador' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )
    await logAction('login', `Forjador ${forjador.nome} fez login`, 'forjador', forjador.id)
    res.json({
      token,
      forjador: {
        id: forjador.id,
        nome: forjador.nome,
        username: forjador.username,
        rp_id: forjador.rp_id,
        discord_webhook: forjador.discord_webhook
      }
    })
  } catch (err) {
    console.error('Erro no login:', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Login de Admin
const loginAdmin = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha obrigatórios' })
  }
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    // Verificar credenciais via banco (com hash) OU via env para flexibilidade
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username])

    let authenticated = false
    if (result.rows.length > 0) {
      authenticated = await bcrypt.compare(password, result.rows[0].password_hash)
    } else if (username === adminUsername && password === adminPassword) {
      authenticated = true
    }

    if (!authenticated) {
      await logAction('admin_login_falhou', `Tentativa de login admin falhou para: ${username}`, 'admin', null)
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )
    await logAction('admin_login', `Admin ${username} fez login`, 'admin', null)
    res.json({ token, admin: { username } })
  } catch (err) {
    console.error('Erro no login admin:', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Cadastro de novo forjador
const cadastrarForjador = async (req, res) => {
  const { nome, rp_id, username, password, confirmPassword, token } = req.body
  if (!nome || !rp_id || !username || !password || !token) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Senhas não coincidem' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' })
  }
  try {
    // Validar token
    const tokenData = await validateToken(token)
    if (!tokenData) {
      return res.status(400).json({ error: 'Token de cadastro inválido ou já utilizado' })
    }

    // Verificar username único
    const existingUser = await pool.query('SELECT id FROM forjadores WHERE username = $1', [username.toLowerCase()])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Nome de usuário já em uso' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const forjadorResult = await client.query(
        'INSERT INTO forjadores (nome, rp_id, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome, rp_id, username.toLowerCase(), passwordHash]
      )
      const forjador = forjadorResult.rows[0]

      await markTokenAsUsed(token, forjador.id, client)

      await client.query(
        `INSERT INTO logs (tipo, descricao, actor_tipo, actor_id) VALUES ($1, $2, $3, $4)`,
        ['forjador_cadastrado', `Novo forjador cadastrado: ${nome} (${username})`, 'forjador', forjador.id]
      )

      await client.query('COMMIT')

      // Gerar novo token automaticamente
      createAndActivateToken().catch(err =>
        console.error('Erro ao gerar novo token:', err.message)
      )

      res.status(201).json({ message: 'Forjador cadastrado com sucesso! Faça login para continuar.' })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Erro no cadastro:', err)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Nome de usuário já em uso' })
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

module.exports = { loginForjador, loginAdmin, cadastrarForjador }
