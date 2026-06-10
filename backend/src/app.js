require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const app = express()

// Rotas
const authRoutes = require('./routes/authRoutes')
const clienteRoutes = require('./routes/clienteRoutes')
const forjadorRoutes = require('./routes/forjadorRoutes')
const adminRoutes = require('./routes/adminRoutes')

const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}))

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173'
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`CORS bloqueado para origem: ${origin}`)
      callback(null, true) // Em produção pode mudar para false
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rotas da API
app.use('/api/auth', authRoutes)
app.use('/api/cliente', clienteRoutes)
app.use('/api/forjador', forjadorRoutes)
app.use('/api/admin', adminRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro interno:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Sistema de Forja Backend rodando na porta ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
