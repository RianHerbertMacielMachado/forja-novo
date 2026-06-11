/**
 * Script de migration incremental.
 * Aplica migration_add_discord_message_id.sql no banco.
 * Execute uma única vez após o deploy:
 *   node src/database/run_migration.js
 */
require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const pool = require('../database')

async function runMigration () {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migration_allow_flechas_type.sql'),
    'utf8'
  )
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    console.log('🔧 Aplicando migration: allow_flechas_type ...')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration aplicada com sucesso!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Erro na migration:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
