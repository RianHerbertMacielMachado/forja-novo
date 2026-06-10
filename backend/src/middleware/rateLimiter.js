const rateLimit = require('express-rate-limit')

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Limite de requisições excedido. Tente novamente em breve.' },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = { loginRateLimiter, apiRateLimiter }
