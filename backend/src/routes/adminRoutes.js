const express = require('express')
const router = express.Router()
const { authAdmin } = require('../middleware/authMiddleware')
const {
  getDashboard, getForjadores, updateForjador, resetSenhaForjador, deleteForjador,
  getPedidos, getPedidoDetalhes, getLogs, exportarLogs,
  getProdutos, createProduto, updateProduto, deleteProduto,
  getMateriais, createMaterial, updateMaterial, deleteMaterial,
  getConfiguracoes, updateConfiguracao, gerarNovoToken, testarWebhook, alterarSenhaAdmin
} = require('../controllers/adminController')

// Dashboard
router.get('/dashboard', authAdmin, getDashboard)

// Forjadores
router.get('/forjadores', authAdmin, getForjadores)
router.put('/forjadores/:id', authAdmin, updateForjador)
router.post('/forjadores/:id/reset-senha', authAdmin, resetSenhaForjador)
router.delete('/forjadores/:id', authAdmin, deleteForjador)

// Pedidos
router.get('/pedidos', authAdmin, getPedidos)
router.get('/pedidos/:id', authAdmin, getPedidoDetalhes)

// Logs
router.get('/logs', authAdmin, getLogs)
router.get('/logs/export', authAdmin, exportarLogs)

// Produtos
router.get('/produtos', authAdmin, getProdutos)
router.post('/produtos', authAdmin, createProduto)
router.put('/produtos/:id', authAdmin, updateProduto)
router.delete('/produtos/:id', authAdmin, deleteProduto)

// Materiais
router.get('/materiais', authAdmin, getMateriais)
router.post('/materiais', authAdmin, createMaterial)
router.put('/materiais/:id', authAdmin, updateMaterial)
router.delete('/materiais/:id', authAdmin, deleteMaterial)

// Configurações
router.get('/configuracoes', authAdmin, getConfiguracoes)
router.post('/configuracoes', authAdmin, updateConfiguracao)
router.post('/token/gerar', authAdmin, gerarNovoToken)
router.post('/webhook/testar', authAdmin, testarWebhook)
router.put('/senha', authAdmin, alterarSenhaAdmin)

module.exports = router
