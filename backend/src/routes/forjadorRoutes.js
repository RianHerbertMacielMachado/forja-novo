const express = require('express')
const router = express.Router()
const { authForjador } = require('../middleware/authMiddleware')
const {
  getFila, puxarPedido, getMeusPedidos, updateStatus, criarPedidoForjador,
  getTransferenciasRecebidas, solicitarTransferencia, responderTransferencia,
  getForjadoresAtivos, updateWebhook, alterarSenha, getMe, countTransferenciasPendentes, getProdutos
} = require('../controllers/forjadorController')

// Dados do forjador logado
router.get('/me', authForjador, getMe)

// Fila de pedidos
router.get('/fila', authForjador, getFila)
router.post('/fila/:pedidoId/puxar', authForjador, puxarPedido)

// Meus pedidos
router.get('/meus-pedidos', authForjador, getMeusPedidos)
router.patch('/pedidos/:pedidoId/status', authForjador, updateStatus)

// Criar pedido manual
router.post('/pedidos', authForjador, criarPedidoForjador)

// Produtos (para catálogo do forjador)
router.get('/produtos', authForjador, getProdutos)

// Transferências
router.get('/transferencias', authForjador, getTransferenciasRecebidas)
router.get('/transferencias/count', authForjador, countTransferenciasPendentes)
router.post('/pedidos/:pedidoId/transferir', authForjador, solicitarTransferencia)
router.post('/transferencias/:transferenciaId/responder', authForjador, responderTransferencia)

// Outros forjadores (para modal de transferência)
router.get('/forjadores', authForjador, getForjadoresAtivos)

// Configurações do forjador
router.put('/webhook', authForjador, updateWebhook)
router.put('/senha', authForjador, alterarSenha)

module.exports = router
