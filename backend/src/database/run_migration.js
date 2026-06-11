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
  const migrationDir = __dirname
  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(file => file.startsWith('migration_') && file.endsWith('.sql'))
    .sort()

  if (migrationFiles.length === 0) {
    console.log('Nenhuma migration encontrada.')
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8')
      console.log(`🔧 Aplicando migration: ${file}...`)
      await client.query(sql)
    }
    await client.query('COMMIT')
    console.log('✅ Todas as migrations aplicadas com sucesso!')
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
