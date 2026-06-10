const express = require('express')
const router = express.Router()
const { loginForjador, loginAdmin, cadastrarForjador } = require('../controllers/authController')
const { loginRateLimiter } = require('../middleware/rateLimiter')

router.post('/forjador/login', loginRateLimiter, loginForjador)
router.post('/admin/login', loginRateLimiter, loginAdmin)
router.post('/cadastro', cadastrarForjador)

module.exports = router
