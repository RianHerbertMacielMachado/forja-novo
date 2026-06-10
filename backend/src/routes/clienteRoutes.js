const express = require('express')
const router = express.Router()
const { getProdutos, criarPedidoCliente, consultarPedido } = require('../controllers/clienteController')

router.get('/produtos', getProdutos)
router.post('/pedidos', criarPedidoCliente)
router.get('/pedidos/consultar', consultarPedido)

module.exports = router
