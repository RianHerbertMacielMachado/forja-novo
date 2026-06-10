require('dotenv').config()
const fs = require('fs')
const path = require('path')
const pool = require('../database')

async function migrate() {
  console.log('🔧 Iniciando migração do banco de dados...')
  const client = await pool.connect()
  try {
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'), 'utf8'
    )
    const seed = fs.readFileSync(
      path.join(__dirname, 'seed.sql'), 'utf8'
    )

    await client.query('BEGIN')
    console.log('📋 Executando schema...')
    await client.query(schema)

    console.log('🌱 Executando seed...')
    await client.query(seed)

    // Criar admin padrão se não existir
    const bcrypt = require('bcryptjs')
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await client.query(`
      INSERT INTO admins (username, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (username) DO NOTHING
    `, [adminUsername, passwordHash])

    console.log(`👤 Admin padrão garantido: ${adminUsername}`)

    await client.query('COMMIT')
    console.log('✅ Migração concluída com sucesso!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Erro na migração:', err.message)
    console.error(err.stack)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Falha fatal na migração:', err)
  process.exit(1)
})
